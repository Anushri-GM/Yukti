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
from services.storage_service import storage_service
from services.speech_service import speech_service
import os

router = APIRouter(prefix="/api/upload", tags=["Upload"])

# Enforce that all routes in this file are restricted to citizens
citizen_dependency = Depends(RoleChecker(["Citizen"]))

@router.post(
    "/image",
    status_code=status.HTTP_201_CREATED,
    summary="Upload image file",
    description="Uploads an image to Google Cloud Storage and returns its metadata including a signed URL. Supported formats: JPG, JPEG, PNG. Max size: 5MB.",
)
async def upload_image_file(
    file: UploadFile = File(...),
    current_user: User = citizen_dependency
):
    logger.info(f"User {current_user.id} initiated image upload for filename: {file.filename}")
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    try:
        # 1. Validate size
        validate_file_size(file_size, settings.MAX_IMAGE_SIZE)
        
        # 2. Validate image types
        validate_image_type(file.content_type, file.filename)
        
        # 3. Sanitize filename
        clean_name = sanitize_filename(file.filename)
        
        # 4. Generate unique filename path
        blob_name = generate_unique_filename(clean_name, "images")
        
        # 5. Malware scanning stub
        scan_for_malware(content)
        
        # 6. Upload file content to Google Cloud Storage
        storage_service.upload_image(content, blob_name, file.content_type)
        
        # 7. Generate a signed URL for reading the image
        signed_url = storage_service.generate_signed_url(blob_name)
        
        logger.info(f"Image uploaded successfully. Blob: {blob_name}")
        return {
            "image_url": signed_url,
            "blob_name": blob_name,
            "size": file_size
        }
        
    except HTTPException:
        logger.warning(f"Image upload failed with HTTPException for user {current_user.id}")
        raise
    except Exception as e:
        logger.error(f"Failed to upload image due to storage error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload image to GCS storage."
        )

@router.post(
    "/audio",
    status_code=status.HTTP_201_CREATED,
    summary="Upload audio file and transcribe",
    description="Uploads an audio file to GCS and immediately transcribes it using Google Cloud Speech-to-Text. Supported formats: WAV, MP3, M4A. Max size: 10MB.",
)
async def upload_audio_file(
    file: UploadFile = File(...),
    current_user: User = citizen_dependency
):
    logger.info(f"User {current_user.id} initiated audio upload for filename: {file.filename}")
    
    content = await file.read()
    file_size = len(content)
    
    try:
        # 1. Validate size
        validate_file_size(file_size, settings.MAX_AUDIO_SIZE)
        
        # 2. Validate audio types
        validate_audio_type(file.content_type, file.filename)
        
        # 3. Sanitize filename
        clean_name = sanitize_filename(file.filename)
        
        # 4. Generate unique filename path
        blob_name = generate_unique_filename(clean_name, "voice")
        
        # 5. Malware scanning stub
        scan_for_malware(content)
        
        # 6. Upload file content to Google Cloud Storage
        storage_service.upload_audio(content, blob_name, file.content_type)
        
        # 7. Generate a signed URL for GCS download
        signed_url = storage_service.generate_signed_url(blob_name)
        
        # 8. Call Google Speech-to-Text immediately
        transcript, confidence = speech_service.transcribe_audio(content, file.content_type)
        
        logger.info(f"Audio uploaded and transcribed. Blob: {blob_name}, Transcript length: {len(transcript)}")
        return {
            "audio_url": signed_url,
            "transcript": transcript,
            "confidence": confidence
        }
        
    except HTTPException:
        logger.warning(f"Audio upload failed with HTTPException for user {current_user.id}")
        raise
    except Exception as e:
        logger.error(f"Failed to process audio due to speech or storage error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload or transcribe audio file."
        )

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
        storage_service.delete_file(blob_name)
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
        storage_service.delete_file(blob_name)
        return
    except Exception as e:
        logger.error(f"Failed to delete audio {blob_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete audio file from storage."
        )
