# Back-End API

A lightweight Flask REST API that receives uploaded invoices, extracts key fields via an LLM, and stores the structured data in a SQLite backend. The service powers a React/Next.js front-end for real-time document processing.

## Overview

This backend service provides a RESTful API for:
- Document upload and processing (PDF, PNG, JPG)
- LLM-powered invoice data extraction
- CRUD operations on sales orders and order details
- Structured data storage with SQLAlchemy ORM

## Architecture

The backend follows a modular architecture:

- **`app.py`** - Main Flask application with route handlers
- **`models.py`** - SQLAlchemy ORM models (SalesOrderHeader, SalesOrderDetail, Product, Customer, etc.)
- **`db.py`** - Database session management and configuration
- **`document_processor.py`** - Document validation and processing utilities
- **`openai_full_data_extraction.py`** - LLM integration for invoice data extraction
- **`init_db.py`** - Database initialization script

## Prerequisites

- Python 3.11+
- pip (or uv pip)
- An LLM API key (OpenAI or compatible)
- Optional: Tesseract OCR (`sudo apt-get install tesseract-ocr`) for image-based invoices

## Installation

```bash
# Clone the repository
git clone https://github.com/lukeganzevoort/invoice-extractor.git
cd invoice-extractor/back-end

# Set up a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize the database
python init_db.py
```

## Environment Setup

Create a `.env` file in the `back-end` directory:

```env
OPENAI_API_KEY=your_api_key_here
FLASK_ENV=development
FLASK_APP=app.py
```

**Note:** The application uses `OPENAI_API_KEY` to authenticate with the OpenAI API for invoice extraction.

## Running the Server

```bash
# Activate virtual environment (if not already active)
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Set Flask environment variables (if not in .env)
export FLASK_APP=app.py
export FLASK_ENV=development   # Remove for production

# Run the development server
flask run
```

The API will be reachable at `http://localhost:5000`.

For production, use a WSGI server like Gunicorn:
```bash
gunicorn -w 4 app:app
```

## Core API Endpoints

### Upload

**POST `/upload`**
- Accepts a multipart file upload (PDF, PNG, JPG)
- Validates file type and size
- Processes document through LLM extraction
- Returns extracted invoice data as JSON with `header` and `line_items`

**Request:**
```bash
curl -X POST http://localhost:5000/upload \
  -F "file=@invoice.pdf"
```

**Response:**
```json
{
  "header": {
    "OrderDate": "2024-01-15",
    "DueDate": "2024-02-15",
    "ShipDate": "2024-01-20",
    "SubTotal": 1500.00,
    "TaxAmt": 120.00,
    "Freight": 25.00,
    "TotalDue": 1645.00
  },
  "line_items": [
    {
      "OrderQty": 10,
      "UnitPrice": 150.00,
      "LineTotal": 1500.00
    }
  ],
  "customer": {...},
  "customer_detail": {...}
}
```

### Sales Orders

**POST `/sales_orders`**
- Creates a new sales order
- **Required fields:** `CustomerID`, `TerritoryID`
- Returns the created sales order with generated `SalesOrderID`

**GET `/sales_orders`**
- Lists all stored sales orders (header information)
- Returns an array of sales order objects

**GET `/sales_orders/<id>`**
- Retrieves a single sales order with full details
- Includes related order details (line items) and customer information

**PUT `/sales_orders/<id>`**
- Updates editable fields of a sales order
- Body should contain JSON with fields to update

**DELETE `/sales_orders/<id>`**
- Removes a sales order record
- Returns 204 No Content on success

### Sales Order Details

**POST `/sales_order_details`**
- Creates a new sales order detail (line item)
- **Required fields:** `SalesOrderID`, `ProductID`
- Returns the created order detail

**GET `/sales_order_details`**
- Lists all sales order details (line items) across all orders
- Returns an array of order detail objects

**GET `/sales_order_details/<id>`**
- Retrieves a single sales order detail by `SalesOrderDetailID`
- Includes related product information

**PUT `/sales_order_details/<id>`**
- Updates editable fields of an order detail
- Body should contain JSON with fields to update

**DELETE `/sales_order_details/<id>`**
- Removes a sales order detail record
- Returns 204 No Content on success

### Response Codes

All endpoints return appropriate HTTP status codes:
- `200 OK` - Successful GET/PUT request
- `201 Created` - Successful POST request
- `204 No Content` - Successful DELETE request
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `413 Payload Too Large` - File size exceeds limit
- `415 Unsupported Media Type` - Invalid file type
- `500 Internal Server Error` - Server error

## Database

The application uses SQLite by default, which is suitable for development and small-scale deployments. All database operations go through SQLAlchemy ORM in `db.py`.

**Database Schema:**
- `SalesOrderHeader` - Order-level information (dates, customer, totals, shipping)
- `SalesOrderDetail` - Line items with product details, quantities, and pricing
- `Product` - Product catalog information
- `Customer` - Customer information (with `StoreCustomer` and `IndividualCustomer` subclasses)
- `ProductCategory` / `ProductSubCategory` - Product classification

For production, consider migrating to PostgreSQL:
1. Update database connection string in `db.py`
2. Ensure PostgreSQL driver is installed (`psycopg2`)

## Testing

Run the test suite to verify upload handling, LLM parsing, and CRUD operations:

```bash
pytest tests/
```

The test suite covers:
- Document upload handling
- LLM parsing functionality
- CRUD operations
- Data validation

## Deployment Considerations

For production deployment:

- **WSGI Server:** Use Gunicorn or uWSGI instead of Flask's development server
  ```bash
  gunicorn -w 4 app:app
  ```

- **Reverse Proxy:** Deploy behind Nginx or a cloud load balancer for SSL termination and static file serving

- **Database:** Migrate from SQLite to PostgreSQL for better performance and scalability

- **Task Queue:** Implement Celery for async processing of heavy OCR/LLM operations

- **Environment Variables:** Use proper secret management (AWS Secrets Manager, HashiCorp Vault, etc.)

- **CORS:** Configure CORS settings appropriately for production domains

- **Rate Limiting:** Add rate limiting to prevent abuse

- **Authentication:** Implement API authentication/authorization if needed

## Additional Notes

- All reads and writes go through the Flask layer (`db.py`)
- The API supports CORS for frontend integration
- File size limits and allowed file types are configured in `document_processor.py`
- LLM extraction logic is modular and can be swapped for different providers
