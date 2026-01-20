"""
Document processing module for invoice extraction.
Handles text extraction from PDFs and images, and LLM-based data extraction.
"""

from PIL import Image
from pypdf import PdfReader
from pytesseract import image_to_string

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# Allowed file types
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
}


def extract_text_from_pdf(file):
    """
    Extract text from a PDF file.

    Args:
        file: File-like object containing PDF data

    Returns:
        str: Extracted text content
    """
    try:
        pdf_reader = PdfReader(file)
        text_parts = []
        for page in pdf_reader.pages:
            text_parts.append(page.extract_text())
        return "\n".join(text_parts)
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


def extract_text_from_image(file):
    """
    Extract text from an image file using Tesseract OCR.

    Args:
        file: File-like object containing image data

    Returns:
        str: Extracted text content
    """
    try:
        image = Image.open(file)
        text = image_to_string(image)
        return text
    except Exception as e:
        raise ValueError(f"Failed to extract text from image using OCR: {str(e)}")


def extract_text_from_document(file, filename):
    """
    Extract text from a document based on file type.

    Args:
        file: File-like object
        filename: Original filename with extension

    Returns:
        str: Extracted text content

    Raises:
        ValueError: If file type is not supported
    """
    file_ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if file_ext == "pdf":
        return extract_text_from_pdf(file)
    elif file_ext in {"png", "jpg", "jpeg"}:
        # Reset file pointer to beginning
        file.seek(0)
        return extract_text_from_image(file)
    else:
        raise ValueError(f"Unsupported file type: {file_ext}")
