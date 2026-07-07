import os
import re
import uuid
from typing import Set
from fastapi import HTTPException, status
from core.logging import logger

SUPPORTED_IMAGE_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png"}
SUPPORTED_IMAGE_MIME_TYPES: Set[str] = {"image/jpeg", "image/png"}

SUPPORTED_AUDIO_EXTENSIONS: Set[str] = {".wav", ".mp3", ".m4a"}
SUPPORTED_AUDIO_MIME_TYPES: Set[str] = {"audio/wav", "audio/mpeg", "audio/mp3", "audio/x-m4a", "audio/m4a", "audio/mp4"}

def validate_file_size(file_size: int, max_size: int):
    """
    Validates that a file's size is within specified limits.
    """
    if file_size > max_size:
        logger.warning(f"File validation failed: File size {file_size} exceeds maximum limit of {max_size} bytes.")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {max_size / (1024 * 1024):.1f} MB."
        )

def validate_image_type(mime_type: str, filename: str):
    """
    Validates that the image file type and extension are supported.
    """
    ext = os.path.splitext(filename.lower())[1]
    if ext not in SUPPORTED_IMAGE_EXTENSIONS or mime_type not in SUPPORTED_IMAGE_MIME_TYPES:
        logger.warning(f"Image type validation failed. Extension: {ext}, MIME: {mime_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type. Supported formats: JPG, JPEG, PNG."
        )

def validate_audio_type(mime_type: str, filename: str):
    """
    Validates that the audio file type and extension are supported.
    """
    ext = os.path.splitext(filename.lower())[1]
    if ext not in SUPPORTED_AUDIO_EXTENSIONS or mime_type not in SUPPORTED_AUDIO_MIME_TYPES:
        logger.warning(f"Audio type validation failed. Extension: {ext}, MIME: {mime_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio type. Supported formats: WAV, MP3, M4A."
        )

def sanitize_filename(filename: str) -> str:
    """
    Sanitizes filenames to prevent directory traversal and executable attacks.
    """
    # Get basename to prevent path traversal
    base = os.path.basename(filename)
    
    # Remove any characters that aren't alphanumeric, dot, underscore, or hyphen
    sanitized = re.sub(r"[^\w\.\-_]", "_", base)
    
    # Prevent execution-prone double extensions (e.g. file.php.png)
    if sanitized.count(".") > 1:
        parts = sanitized.split(".")
        sanitized = f"{parts[0]}.{parts[-1]}"
        
    return sanitized

def generate_unique_filename(filename: str, folder: str) -> str:
    """
    Generates a unique, UUID-based path preserving the input file's extension.
    """
    ext = os.path.splitext(filename.lower())[1]
    unique_id = uuid.uuid4()
    return f"{folder}/{unique_id}{ext}"

def scan_for_malware(file_content: bytes) -> str:
    """
    Scanning stub. Returns "Passed".
    Integrating with malware scanner API (e.g., VirusTotal or GCP Web Risk/Cloud Security Scanner)
    can be done by sending `file_content` byte payload to the scanner endpoint.
    """
    logger.info("Performing malware scan placeholder checks...")
    return "Passed"
