"""
OpenAI GPT API-based invoice data extraction module.
Extracts structured data (SalesOrderHeader and SalesOrderDetail) from document text.
"""

import json
import os

import openai
from db import get_db_session
from dotenv import load_dotenv
from models import Customer, IndividualCustomer, StoreCustomer

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


def create_extraction_prompt(text_content: str) -> str:
    """
    Create a prompt for OpenAI GPT to extract invoice data.

    Args:
        text_content: Extracted text from the document

    Returns:
        str: Formatted prompt for GPT
    """
    prompt = """You are an expert at extracting structured data from invoices and sales documents.

Extract all relevant information from the following document text and return it as a JSON object matching the structure below.

The JSON should have two main sections:
1. "header" - containing all SalesOrderHeader fields
2. "line_items" - array of SalesOrderDetail objects
3. "extracted_customer_name" - the customer name as extracted from the document (for database matching)

For fields that cannot be determined from the document, use null.

SalesOrderHeader fields to extract:
- SalesOrderNumber (string, optional)
- OrderDate (string in ISO format YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS, optional)
- DueDate (string in ISO format, optional)
- ShipDate (string in ISO format, optional)
- Status (integer, optional)
- OnlineOrderFlag (boolean, optional)
- PurchaseOrderNumber (string, optional)
- AccountNumber (string, optional)
- SalesPersonID (number, optional)
- BillToAddressID (integer, optional)
- ShipToAddressID (integer, optional)
- ShipMethodID (integer, optional)
- CreditCardID (number, optional)
- CreditCardApprovalCode (string, optional)
- CurrencyRateID (number, optional)
- SubTotal (number, optional)
- TaxAmt (number, optional)
- Freight (number, optional)
- TotalDue (number, optional)
- CustomerID (set to null - will be matched from database)
- TerritoryID (set to null - will be matched from database)

SalesOrderDetail fields to extract for each line item:
- OrderQty (integer, optional)
- ProductID (set to null - product matching not implemented)
- SpecialOfferID (integer, optional)
- UnitPrice (number, optional)
- UnitPriceDiscount (number, optional)
- LineTotal (number, optional)
- CarrierTrackingNumber (string, optional)

Return ONLY valid JSON, no additional text or markdown formatting.

Document text:
"""
    return prompt + text_content


def call_openai_api(text_content: str) -> dict:
    """
    Call OpenAI GPT API to extract structured data from text.

    Args:
        text_content: Extracted text from document

    Returns:
        dict: Parsed JSON response from LLM

    Raises:
        ValueError: If API call fails or response is invalid
    """
    try:
        prompt = create_extraction_prompt(text_content)

        response = client.chat.completions.create(
            model="gpt-4o",  # Using GPT-4o for best results
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
            response_format={"type": "json_object"},  # Force JSON response
            max_tokens=4096,
            temperature=0.1,  # Low temperature for more consistent extraction
        )

        # Extract text from response
        response_text = response.choices[0].message.content

        if not response_text:
            raise ValueError("Empty response from OpenAI API")

        # Try to extract JSON from response (may be wrapped in markdown even with json_object format)
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
        raise ValueError(f"Error calling OpenAI API: {str(e)}")


def match_customer_to_database(customer_name: str, session) -> tuple:
    """
    Match extracted customer name to CustomerID in database.

    Args:
        customer_name: Customer name extracted from document
        session: Database session

    Returns:
        tuple: (CustomerID, TerritoryID) or (None, None) if not found
    """
    if not customer_name:
        return None, None

    customer_name = customer_name.strip()

    # Try to match individual customer (FirstName + LastName)
    # Split name into parts
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
            # Find corresponding Customer record
            customer = (
                session.query(Customer)
                .filter(Customer.PersonID == individual.BusinessEntityID)
                .first()
            )
            if customer:
                return customer.CustomerID, customer.TerritoryID

    # Try to match store customer (Name)
    store = (
        session.query(StoreCustomer)
        .filter(StoreCustomer.Name.ilike(f"%{customer_name}%"))
        .first()
    )

    if store:
        # Find corresponding Customer record
        customer = (
            session.query(Customer)
            .filter(Customer.StoreID == store.BusinessEntityID)
            .first()
        )
        if customer:
            return customer.CustomerID, customer.TerritoryID

    return None, None


def extract_invoice_data_from_text(text_content: str) -> dict:
    """
    Extract structured invoice data from document text using OpenAI GPT API.

    Args:
        text_content: Extracted text from document

    Returns:
        dict: Extracted data with header and line_items

    Raises:
        ValueError: If processing fails
    """
    if not text_content or not text_content.strip():
        raise ValueError("No text content provided for extraction")

    # Call OpenAI API to extract structured data
    extracted_data = call_openai_api(text_content)

    # Match customer if customer name was extracted
    if "extracted_customer_name" in extracted_data:
        customer_name = extracted_data.get("extracted_customer_name")
        if customer_name:
            with get_db_session() as session:
                customer_id, territory_id = match_customer_to_database(
                    customer_name, session
                )
                # Update header with matched IDs
                if "header" in extracted_data:
                    if customer_id:
                        extracted_data["header"]["CustomerID"] = customer_id
                    if territory_id:
                        extracted_data["header"]["TerritoryID"] = territory_id

    return extracted_data


if __name__ == "__main__":
    text = """
[Company Name]
[Street Address]
[City, ST ZIP]
Phone: [000-000-0000]
Fax: [000-000-0000]
Website:

INVOICE
DATE
5/1/2014
INVOICE #
[123-456]
CUSTOMER ID
[123]

BILL TO:
[Name]
[Company Name]
[Street Address]
[City, ST ZIP]
[Phone]

SHIP TO:
[Name]
[Company Name]
[Street Address]
[City, ST ZIP]
[Phone]

SALES PERSON    P.O. #  SHIP DATE       SHIP VIA        F.O.B.  TERMS

ITEM #  DESCRIPTION     QTY     UNIT PRICE      TOTAL

[234-XYZ]       Product XYZ     15      150.00  2,250.00
[456-45645]     Product ABC     1       75.00   75.00







SUBTOTAL        2,325.00
TAX RATE        6.75%
TAX     156.84
S & H
OTHER
TOTAL   $   2,481.84

Other Comments or Special Instructions
1. Total payment due in 30 days
2. Please include the invoice number on your check

Make all checks payable to
[Your Company Name]

If you have any questions about this invoice, please contact
[Name, Phone #, E-mail]

Thank You For Your Business!

© 2011-2014 Vertex42.com
"""
    print(extract_invoice_data_from_text(text))
