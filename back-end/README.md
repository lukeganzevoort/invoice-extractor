# Overview

A lightweight Flask API that receives uploaded invoices, extracts key fields via an LLM, and stores the structured data in a SQLite backend. The service powers a React/Next.js front‑end for real‑time document processing.

# Prerequisites

- Python 3.11
- pip (or uv pip)
- An LLM API key (e.g., OpenAI) placed in .env as LLM_API_KEY
- Optional: Tesseract OCR (sudo apt-get install tesseract-ocr) for image‑based invoices

# Installation
```bash
# Clone the repo
git clone https://github.com/lukeganzevoort/invoice-extractor.git
cd invoice-extractor/flask-backend

# Set up a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create the SQLite DB (or copy the provided Excel file)
python init_db.py
```

# Running the Server
```bash
export FLASK_APP=app.py
export FLASK_ENV=development   # remove for production
flask run
```

The API will be reachable at http://localhost:5000.

# Core API Endpoints

- POST /upload – Accepts a multipart file (pdf, png, jpg). Returns extracted JSON.
- GET /invoices – Lists all stored invoices (header info).
- GET /invoices/<id> – Retrieves a single invoice with full details.
- PUT /invoices/<id> – Updates editable fields; body is JSON.
- DELETE /invoices/<id> – Removes an invoice record.

All endpoints return JSON with appropriate HTTP status codes.

# Database / Excel Access

All reads and writes go through the Flask layer (db.py). If you prefer an Excel/CSV store, adjust the helper functions in db.py to use pandas.read_excel / to_excel while keeping the same API contract.

# Testing
```bash
pytest tests/
```

Run the suite to verify upload handling, LLM parsing, and CRUD operations.

# Deployment Tips (quick glance)

- Wrap with Gunicorn (gunicorn -w 4 app:app).
- Put behind Nginx or a cloud load balancer.
- Swap SQLite for PostgreSQL when scaling.
- Use a task queue (Celery) for heavy OCR/LLM calls.