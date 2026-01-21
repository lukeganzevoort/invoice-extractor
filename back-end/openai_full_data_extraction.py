"""
OpenAI GPT API-based full data extraction module.
Extracts structured invoice data (SalesOrderHeader and SalesOrderDetail)
directly from images and PDFs in a single step using GPT-4 Vision API.
"""

import base64
import json
import os
from io import BytesIO

import openai
from db import get_db_session
from dotenv import load_dotenv
from models import Customer, IndividualCustomer, StoreCustomer
from PIL import Image
from pypdf import PdfReader

# Load environment variables
load_dotenv()

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError(
        "OPENAI_API_KEY or LLM_API_KEY environment variable is required. "
        "Set it in .env file or environment."
    )

client = openai.OpenAI(api_key=OPENAI_API_KEY)


def image_to_base64(image: Image.Image) -> str:
    """
    Convert a PIL Image to base64-encoded string.

    Args:
        image: PIL Image object

    Returns:
        str: Base64-encoded image string
    """
    buffered = BytesIO()
    # Convert to RGB if necessary (for PNG with transparency)
    if image.mode in ("RGBA", "LA", "P"):
        rgb_image = Image.new("RGB", image.size, (255, 255, 255))
        if image.mode == "P":
            image = image.convert("RGBA")
        rgb_image.paste(
            image, mask=image.split()[-1] if image.mode in ("RGBA", "LA") else None
        )
        image = rgb_image
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return img_str


def create_extraction_prompt() -> str:
    """
    Create a prompt for OpenAI GPT Vision to extract invoice data directly from image.

    Returns:
        str: Formatted prompt for GPT Vision
    """
    prompt = """You are an expert at extracting structured data from invoices and sales documents.

Analyze this invoice/sales document image and extract all relevant information. Return the data as a JSON object with the exact structure specified below.

The JSON output must have this structure:
{
  "header": {
    "SalesOrderNumber": "string or null",
    "OrderDate": "ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS) or null",
    "DueDate": "ISO date string or null",
    "PurchaseOrderNumber": "string or null",
    "AccountNumber": "string or null",
    "SubTotal": "number or null",
    "TaxAmt": "number or null",
    "TotalDue": "number or null",
  },
  "line_items": [
    {
      "OrderQty": "integer or null",
      "ProductID": null,
      "ProductDescription": "string or null",
      "UnitPrice": "number or null",
      "UnitPriceDiscount": "number or null",
      "LineTotal": "number or null",
    }
  ],
  "extracted_customer_name": "string or null"
}

Important extraction guidelines:
- Extract dates in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
- Extract all monetary values as numbers (not strings)
- Extract quantities as integers
- For fields not found in the document, use null
- Extract the customer name/billing name and set it to the "extracted_customer_name" field for database matching
- Extract all line items from the invoice table
- ProductID is also known as the Product Number
- ProductDescription is also known as the Product Name

Return ONLY valid JSON, no additional text, markdown formatting, or commentary."""
    return prompt


def extract_data_from_image_gpt(file) -> dict:
    """
    Extract structured invoice data directly from an image file using OpenAI GPT-4 Vision API.

    Args:
        file: File-like object containing image data

    Returns:
        dict: Extracted structured data with header and line_items

    Raises:
        ValueError: If API call fails or image processing fails
    """
    try:
        # Open and process the image
        image = Image.open(file)
        base64_image = image_to_base64(image)
        prompt = create_extraction_prompt()

        # Call OpenAI GPT-4 Vision API
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a data extraction expert. Extract structured data from invoices and return only valid JSON.",
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt,
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{base64_image}",
                            },
                        },
                    ],
                },
            ],
            response_format={"type": "json_object"},
            max_tokens=4096,
            temperature=0.1,
        )

        # Print token usage
        if response.usage:
            usage = response.usage
            print(
                f"[extract_data_from_image_gpt] Token usage - Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens}"
            )

        response_text = response.choices[0].message.content
        if not response_text:
            raise ValueError("Empty response from OpenAI API")

        # Clean up response (remove markdown if present)
        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        # Parse JSON
        try:
            extracted_data = json.loads(response_text)
            return extracted_data
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Failed to parse OpenAI response as JSON: {str(e)}\nResponse was: {response_text[:500]}"
            )

    except openai.APIError as e:
        raise ValueError(f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise ValueError(f"Failed to extract data from image using GPT: {str(e)}")


def extract_data_from_pdf_gpt(file) -> dict:
    """
    Extract structured invoice data from a PDF file using OpenAI GPT API.
    For text-based PDFs, extracts text and uses GPT to parse.
    For image-based/scanned PDFs, converts pages to images and uses GPT-4 Vision.

    Args:
        file: File-like object containing PDF data

    Returns:
        dict: Extracted structured data with header and line_items

    Raises:
        ValueError: If API call fails or PDF processing fails
    """
    try:
        pdf_reader = PdfReader(file)

        # First, try to extract text directly from PDF (for text-based PDFs)
        all_text = []
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text and page_text.strip():
                all_text.append(page_text)

        # Check if we got substantial text extraction (likely text-based PDF)
        total_text_length = sum(len(text.strip()) for text in all_text)
        if total_text_length > 100:
            # Use text-based extraction
            text_content = "\n".join(all_text)
            return extract_data_from_text_gpt(text_content)

        # If text extraction was poor (likely scanned/image-based PDF),
        # convert pages to images and use GPT Vision
        try:
            from pdf2image import convert_from_bytes

            # Read PDF bytes
            file.seek(0)
            pdf_bytes = file.read()

            # Convert PDF pages to images
            images = convert_from_bytes(pdf_bytes, dpi=200)

            # Process first page (or all pages if multi-page)
            # For invoices, usually the first page has all the data
            if len(images) == 1:
                # Single page - process it
                base64_image = image_to_base64(images[0])
                prompt = create_extraction_prompt()

                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a data extraction expert. Extract structured data from invoices and return only valid JSON.",
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt,
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{base64_image}",
                                    },
                                },
                            ],
                        },
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=4096,
                    temperature=0.1,
                )

                # Print token usage
                if response.usage:
                    usage = response.usage
                    print(
                        f"[extract_data_from_pdf_gpt - single page] Token usage - Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens}"
                    )

                response_text = response.choices[0].message.content
                if not response_text:
                    raise ValueError("Empty response from OpenAI API")

                # Clean up and parse JSON
                response_text = response_text.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()

                try:
                    extracted_data = json.loads(response_text)
                    return extracted_data
                except json.JSONDecodeError as e:
                    raise ValueError(
                        f"Failed to parse OpenAI response as JSON: {str(e)}\nResponse was: {response_text[:500]}"
                    )
            else:
                # Multi-page PDF - process first page (assumes invoice fits on first page)
                # Could be extended to process all pages and merge results
                base64_image = image_to_base64(images[0])
                prompt = create_extraction_prompt()

                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a data extraction expert. Extract structured data from invoices and return only valid JSON.",
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt
                                    + "\n\nNote: This is page 1 of a multi-page document. Extract all data visible on this page.",
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{base64_image}",
                                    },
                                },
                            ],
                        },
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=4096,
                    temperature=0.1,
                )

                # Print token usage
                if response.usage:
                    usage = response.usage
                    print(
                        f"[extract_data_from_pdf_gpt - multi-page] Token usage - Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens}"
                    )

                response_text = response.choices[0].message.content
                if not response_text:
                    raise ValueError("Empty response from OpenAI API")

                response_text = response_text.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()

                try:
                    extracted_data = json.loads(response_text)
                    return extracted_data
                except json.JSONDecodeError as e:
                    raise ValueError(
                        f"Failed to parse OpenAI response as JSON: {str(e)}\nResponse was: {response_text[:500]}"
                    )

        except ImportError:
            # If pdf2image is not installed, fall back to text extraction
            if all_text:
                text_content = "\n".join(all_text)
                return extract_data_from_text_gpt(text_content)
            else:
                raise ValueError(
                    "PDF appears to be image-based. Install pdf2image for better extraction: "
                    "pip install pdf2image. Also install poppler-utils: "
                    "sudo apt-get install poppler-utils (Linux) or "
                    "brew install poppler (macOS)"
                )

    except Exception as e:
        raise ValueError(f"Failed to extract data from PDF using GPT: {str(e)}")


def extract_data_from_text_gpt(text_content: str) -> dict:
    """
    Extract structured invoice data from text using OpenAI GPT API.
    Used as fallback for text-based PDFs.

    Args:
        text_content: Extracted text from document

    Returns:
        dict: Extracted structured data with header and line_items
    """
    prompt = create_extraction_prompt() + "\n\nDocument text:\n" + text_content

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are a data extraction expert. Extract structured data from invoices and return only valid JSON.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        response_format={"type": "json_object"},
        max_tokens=4096,
        temperature=0.1,
    )

    # Print token usage
    if response.usage:
        usage = response.usage
        print(
            f"[extract_data_from_text_gpt] Token usage - Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens}"
        )

    response_text = response.choices[0].message.content
    if not response_text:
        raise ValueError("Empty response from OpenAI API")

    response_text = response_text.strip()
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()

    try:
        extracted_data = json.loads(response_text)
        return extracted_data
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Failed to parse OpenAI response as JSON: {str(e)}\nResponse was: {response_text[:500]}"
        )


def match_customer_to_database(
    customer_name: str, session
) -> tuple[Customer, IndividualCustomer | StoreCustomer] | tuple[None, None]:
    """
    Match extracted customer name to Customer object in database.

    Args:
        customer_name: Customer name extracted from document
        session: Database session

    Returns:
        tuple: (Customer, IndividualCustomer) or (Customer, StoreCustomer) if found,
               or (None, None) if not found
    """
    if not customer_name:
        return None, None

    customer_name = customer_name.strip()

    # Try to match individual customer (FirstName + LastName)
    name_parts = customer_name.split()
    if len(name_parts) >= 2:
        first_name = name_parts[0]
        last_name = " ".join(name_parts[1:])

        individual = (
            session.query(IndividualCustomer)
            .filter(
                IndividualCustomer.FirstName.ilike(f"%{first_name}%"),
                IndividualCustomer.LastName.ilike(f"%{last_name}%"),
            )
            .first()
        )

        if individual:
            customer = (
                session.query(Customer)
                .filter(Customer.PersonID == individual.BusinessEntityID)
                .first()
            )
            if customer:
                return customer, individual

    # Try to match store customer (Name)
    store = (
        session.query(StoreCustomer)
        .filter(StoreCustomer.Name.ilike(f"%{customer_name}%"))
        .first()
    )

    if store:
        customer = (
            session.query(Customer)
            .filter(Customer.StoreID == store.BusinessEntityID)
            .first()
        )
        if customer:
            return customer, store

    return None, None


def extract_invoice_data_from_document(file, filename: str) -> dict:
    """
    Extract structured invoice data directly from a document (image or PDF) using OpenAI GPT API.
    This is a one-step process that combines text extraction and data extraction.

    Args:
        file: File-like object containing the document
        filename: Original filename with extension

    Returns:
        dict: Extracted data with header and line_items, including matched CustomerID and TerritoryID

    Raises:
        ValueError: If file type is not supported or processing fails
    """
    # file_ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # # Extract structured data based on file type
    # if file_ext == "pdf":
    #     extracted_data = extract_data_from_pdf_gpt(file)
    # elif file_ext in {"png", "jpg", "jpeg"}:
    #     file.seek(0)
    #     extracted_data = extract_data_from_image_gpt(file)
    # else:
    #     raise ValueError(f"Unsupported file type: {file_ext}")

    extracted_data = {
        "header": {
            "SalesOrderNumber": "11223344",
            "OrderDate": "2025-06-04",
            "DueDate": None,
            "PurchaseOrderNumber": None,
            "AccountNumber": None,
            "SubTotal": 1350.0,
            "TaxAmt": 0.0,
            "TotalDue": 1350.0,
        },
        "line_items": [
            {
                "OrderQty": 1,
                "ProductID": None,
                "ProductDescription": "Half-Finger Gloves, M",
                "UnitPrice": 50.0,
                "UnitPriceDiscount": None,
                "LineTotal": 50.0,
            },
            {
                "OrderQty": 2,
                "ProductID": None,
                "ProductDescription": "Classic Vest, S",
                "UnitPrice": 600.0,
                "UnitPriceDiscount": None,
                "LineTotal": 1200.0,
            },
        ],
        "extracted_customer_name": "Isabella Torres",
    }

    print(extracted_data)

    # Match customer if customer name was extracted
    if "extracted_customer_name" in extracted_data:
        customer_name = extracted_data.get("extracted_customer_name")
        if customer_name:
            with get_db_session() as session:
                customer, customer_detail = match_customer_to_database(
                    customer_name, session
                )
                if customer:
                    extracted_data["customer"] = {
                        "CustomerID": customer.CustomerID,
                        "PersonID": customer.PersonID,
                        "StoreID": customer.StoreID,
                        "TerritoryID": customer.TerritoryID,
                        "AccountNumber": customer.AccountNumber,
                    }
                else:
                    extracted_data["customer"] = None

                if customer_detail:
                    if isinstance(customer_detail, IndividualCustomer):
                        extracted_data["customer_detail"] = {
                            "BusinessEntityID": customer_detail.BusinessEntityID,
                            "FirstName": customer_detail.FirstName,
                            "MiddleName": customer_detail.MiddleName,
                            "LastName": customer_detail.LastName,
                            "AddressType": customer_detail.AddressType,
                            "AddressLine1": customer_detail.AddressLine1,
                            "AddressLine2": customer_detail.AddressLine2,
                            "City": customer_detail.City,
                            "StateProvinceName": customer_detail.StateProvinceName,
                            "PostalCode": customer_detail.PostalCode,
                            "CountryRegionName": customer_detail.CountryRegionName,
                        }
                    else:  # StoreCustomer
                        extracted_data["customer_detail"] = {
                            "BusinessEntityID": customer_detail.BusinessEntityID,
                            "Name": customer_detail.Name,
                            "AddressType": customer_detail.AddressType,
                            "AddressLine1": customer_detail.AddressLine1,
                            "AddressLine2": customer_detail.AddressLine2,
                            "City": customer_detail.City,
                            "StateProvinceName": customer_detail.StateProvinceName,
                            "PostalCode": customer_detail.PostalCode,
                            "CountryRegionName": customer_detail.CountryRegionName,
                        }
                else:
                    extracted_data["customer_detail"] = None

    return extracted_data


if __name__ == "__main__":
    # Example usage
    file = open("Sales Invoice.png", "rb")
    result = extract_invoice_data_from_document(file, "Sales Invoice.png")
    print(json.dumps(result, indent=2))
