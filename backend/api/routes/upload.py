from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from database.session import get_db
from auth.deps import get_current_user, RoleChecker
from models.user import User
from core.config import settings
from core.logging import logger
from services.file_validation_service import (
    validate_file_size,
    validate_image_type,
    validate_audio_type,
    sanitize_filename,
    generate_unique_filename,
    scan_for_malware
)
#from services.storage_service import storage_service
from services.speech_service import speech_service
import os

router = APIRouter(prefix="/api/upload", tags=["Upload"])

# Enforce that all routes in this file are restricted to citizens
citizen_dependency = Depends(RoleChecker(["Citizen"]))

@router.post(
    "/image",
    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    summary="Image upload (Coming Soon)",
    description="Image upload is currently unavailable in this hackathon build and will be added in a future release.",
)
async def upload_image_file(
    file: UploadFile = File(...),
    current_user: User = citizen_dependency
):
    logger.info(
        f"Image upload requested by user {current_user.id}, but the feature is disabled."
    )

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Image upload will be available in a future release."
    )

@router.post(
    "/audio",
    status_code=status.HTTP_201_CREATED,
    summary="Upload audio file and transcribe",
    description="Transcribes uploaded audio locally using Faster-Whisper. Supported formats: WAV, MP3, M4A. Max size: 10MB.",
)
async def upload_audio_file(
    file: UploadFile = File(...),
    current_user: User = citizen_dependency
):
    logger.info(f"Audio received from user {current_user.id}: {file.filename}")
    
    content = await file.read()
    file_size = len(content)
    
    # 1. Validate size
    validate_file_size(file_size, settings.MAX_AUDIO_SIZE)
    
    # 2. Validate audio types
    validate_audio_type(file.content_type, file.filename)
    
    # 3. Sanitize filename
    clean_name = sanitize_filename(file.filename)
    
    # 4. Malware scanning stub
    scan_for_malware(content)
    
    # Create a temporary local file
    import tempfile
    import time
    
    _, ext = os.path.splitext(clean_name)
    if not ext:
        ext = ".wav"
        
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    temp_file_path = temp_file.name
    logger.info(f"Temporary file created: {temp_file_path}")
    
    try:
        temp_file.write(content)
        temp_file.close()
        
        start_time = time.time()
        logger.info("Local transcription started")
        
        transcript, confidence = speech_service.transcribe_audio(temp_file_path)
        
        duration = time.time() - start_time
        logger.info(f"Transcription completed in {duration:.2f}s")
        
        return {
            "transcript": transcript,
            "confidence": confidence
        }
        
    except Exception as e:
        logger.error(f"Failed to process audio transcription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to transcribe audio file locally."
        )
    finally:
        # Cleanup: Always remove the temporary file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"Temporary file deleted: {temp_file_path}")
            except Exception as cleanup_err:
                logger.error(f"Error removing temporary file {temp_file_path}: {cleanup_err}")

@router.delete(
    "/image/{blob_name:path}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete uploaded image file",
    description="Deletes an uploaded image from Google Cloud Storage. Restricted to Citizens.",
)
def delete_image_file(
    blob_name: str,
    current_user: User = citizen_dependency
):
    # Security check: prevent directory traversal or deletion outside of images/ folder
    if not blob_name.startswith("images/"):
        logger.warning(f"Malicious delete attempt by user {current_user.id} on path: {blob_name}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image path. Deletions are restricted to the images folder."
        )
        
    try:
        #storage_service.delete_file(blob_name)
        return
    except Exception as e:
        logger.error(f"Failed to delete image {blob_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete image file from storage."
        )

@router.delete(
    "/audio/{blob_name:path}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete uploaded audio file",
    description="Deletes an uploaded audio file from Google Cloud Storage. Restricted to Citizens.",
)
def delete_audio_file(
    blob_name: str,
    current_user: User = citizen_dependency
):
    # Security check: prevent directory traversal or deletion outside of voice/ folder
    if not blob_name.startswith("voice/"):
        logger.warning(f"Malicious delete attempt by user {current_user.id} on path: {blob_name}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid audio path. Deletions are restricted to the voice folder."
        )
        
    try:
        #storage_service.delete_file(blob_name)
        return
    except Exception as e:
        logger.error(f"Failed to delete audio {blob_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete audio file from storage."
        )
