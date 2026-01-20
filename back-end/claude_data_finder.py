import base64
import json
import os
from io import BytesIO

import anthropic
from db import get_db_session
from dotenv import load_dotenv
from models import Customer, IndividualCustomer, StoreCustomer

# Load environment variables
load_dotenv()

# Initialize Anthropic client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError(
        "ANTHROPIC_API_KEY environment variable is required. "
        "Set it in .env file or environment."
    )

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def create_extraction_prompt(text_content):
    """
    Create a prompt for Claude to extract invoice data.

    Args:
        text_content: Extracted text from the document

    Returns:
        str: Formatted prompt for Claude
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


def call_anthropic_api(text_content):
    """
    Call Anthropic Claude API to extract structured data from text.

    Args:
        text_content: Extracted text from document

    Returns:
        dict: Parsed JSON response from LLM

    Raises:
        ValueError: If API call fails or response is invalid
    """
    try:
        prompt = create_extraction_prompt(text_content)

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        )

        # Extract text from response
        response_text = message.content[0].text

        # Try to extract JSON from response (may be wrapped in markdown)
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
            raise ValueError(f"Failed to parse LLM response as JSON: {str(e)}")

    except anthropic.APIError as e:
        raise ValueError(f"Anthropic API error: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error calling Anthropic API: {str(e)}")


def match_customer_to_database(customer_name, session):
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


def process_invoice_document(file, filename):
    """
    Process an uploaded invoice document and extract structured data.

    Args:
        file: File-like object containing the document
        filename: Original filename

    Returns:
        dict: Extracted data with header and line_items

    Raises:
        ValueError: If processing fails
    """
    # Extract text from document
    text_content = extract_text_from_document(file, filename)

    if not text_content or not text_content.strip():
        raise ValueError("No text could be extracted from the document")

    # Call LLM API to extract structured data
    extracted_data = call_anthropic_api(text_content)

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
