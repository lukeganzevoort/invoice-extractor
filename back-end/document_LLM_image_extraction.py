"""
OpenAI GPT API-based text extraction module.
Uses GPT-4 Vision API to extract text from images and PDFs as an alternative to OCR.
"""

import base64
import os
from io import BytesIO

import openai
from dotenv import load_dotenv
from PIL import Image
from pypdf import PdfReader

# Load environment variables
load_dotenv()

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
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


def extract_text_from_image_gpt(file) -> str:
    """
    Extract text from an image file using OpenAI GPT-4 Vision API.

    Args:
        file: File-like object containing image data

    Returns:
        str: Extracted text content

    Raises:
        ValueError: If API call fails or image processing fails
    """
    try:
        # Open and process the image
        image = Image.open(file)
        base64_image = image_to_base64(image)

        # Call OpenAI GPT-4 Vision API
        response = client.chat.completions.create(
            model="gpt-4o",  # or "gpt-4-turbo" for older models
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text from this image. Preserve the structure, formatting, and layout as much as possible. Include all numbers, dates, addresses, and any other text content. Return only the extracted text without any additional commentary.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{base64_image}",
                            },
                        },
                    ],
                }
            ],
            max_tokens=4096,
        )

        extracted_text = response.choices[0].message.content
        return extracted_text.strip()

    except openai.APIError as e:
        raise ValueError(f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise ValueError(f"Failed to extract text from image using GPT: {str(e)}")


def extract_text_from_pdf_gpt(file) -> str:
    """
    Extract text from a PDF file using OpenAI GPT-4 Vision API.
    For text-based PDFs, extracts text directly (faster and cheaper).
    For image-based/scanned PDFs, converts pages to images and uses GPT-4 Vision.

    Args:
        file: File-like object containing PDF data

    Returns:
        str: Extracted text content from all pages

    Raises:
        ValueError: If API call fails or PDF processing fails
    """
    try:
        pdf_reader = PdfReader(file)

        # First, try to extract text directly from PDF (for text-based PDFs)
        # This is faster and cheaper than using Vision API
        all_text = []
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text and page_text.strip():
                all_text.append(page_text)

        # Check if we got substantial text extraction (likely text-based PDF)
        total_text_length = sum(len(text.strip()) for text in all_text)
        if total_text_length > 100:  # Threshold for "good" text extraction
            return "\n".join(all_text)

        # If text extraction was poor (likely scanned/image-based PDF),
        # convert pages to images and use GPT Vision
        try:
            from pdf2image import convert_from_bytes

            # Read PDF bytes
            file.seek(0)
            pdf_bytes = file.read()

            # Convert PDF pages to images
            images = convert_from_bytes(pdf_bytes, dpi=200)

            # Process each page with GPT Vision
            text_parts = []
            for i, image in enumerate(images):
                base64_image = image_to_base64(image)

                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"Extract all text from page {i+1} of this PDF document. Preserve the structure, formatting, and layout as much as possible. Include all numbers, dates, addresses, and any other text content. Return only the extracted text without any additional commentary.",
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{base64_image}",
                                    },
                                },
                            ],
                        }
                    ],
                    max_tokens=4096,
                )

                page_text = response.choices[0].message.content.strip()
                text_parts.append(page_text)

            return "\n".join(text_parts)

        except ImportError:
            # If pdf2image is not installed, fall back to text extraction
            if all_text:
                return "\n".join(all_text)
            else:
                raise ValueError(
                    "PDF appears to be image-based. Install pdf2image for better extraction: "
                    "pip install pdf2image. Also install poppler-utils: "
                    "sudo apt-get install poppler-utils (Linux) or "
                    "brew install poppler (macOS)"
                )

    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF using GPT: {str(e)}")


def extract_text_from_document_gpt(file, filename: str) -> str:
    """
    Extract text from a document using OpenAI GPT API based on file type.

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
        return extract_text_from_pdf_gpt(file)
    elif file_ext in {"png", "jpg", "jpeg"}:
        # Reset file pointer to beginning
        file.seek(0)
        return extract_text_from_image_gpt(file)
    else:
        raise ValueError(f"Unsupported file type: {file_ext}")
