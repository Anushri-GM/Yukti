import datetime
import os
from typing import Optional
from google.cloud import storage
from google.oauth2 import service_account
from core.config import settings
from core.logging import logger

class StorageService:
    def __init__(self):
        self.bucket_name = settings.GCS_BUCKET_NAME or settings.CLOUD_STORAGE_BUCKET
        self.project = settings.GOOGLE_CLOUD_PROJECT
        self.credentials_path = settings.GOOGLE_APPLICATION_CREDENTIALS
        
        logger.info(f"Initializing StorageService with Bucket: {self.bucket_name}, Project: {self.project}")
        
        if self.credentials_path and os.path.exists(self.credentials_path):
            # Ensure the env var is set for standard client initializations
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(self.credentials_path)
            self.credentials = service_account.Credentials.from_service_account_file(self.credentials_path)
            self.client = storage.Client(credentials=self.credentials, project=self.project)
        else:
            self.client = storage.Client()

    def upload_file(self, file_content: bytes, destination_blob_name: str, content_type: str) -> str:
        """
        Uploads a file to GCS and returns the blob name.
        """
        if not self.bucket_name:
            raise ValueError("Google Cloud Storage bucket name is not configured in settings.")
            
        logger.info(f"Uploading file of type {content_type} to GCS destination: {destination_blob_name}")
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(destination_blob_name)
        
        blob.upload_from_string(file_content, content_type=content_type)
        return destination_blob_name

    def upload_image(self, file_content: bytes, destination_blob_name: str, content_type: str) -> str:
        return self.upload_file(file_content, destination_blob_name, content_type)

    def upload_audio(self, file_content: bytes, destination_blob_name: str, content_type: str) -> str:
        return self.upload_file(file_content, destination_blob_name, content_type)

    def delete_file(self, blob_name: str) -> None:
        """
        Deletes a blob from GCS.
        """
        if not self.bucket_name:
            raise ValueError("Google Cloud Storage bucket name is not configured.")
            
        logger.info(f"Deleting blob {blob_name} from GCS bucket {self.bucket_name}")
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(blob_name)
        
        if blob.exists():
            blob.delete()
            logger.info(f"Blob {blob_name} deleted successfully.")
        else:
            logger.warning(f"Attempted to delete blob {blob_name} but it does not exist.")

    def generate_signed_url(self, blob_name: str, expiration_minutes: int = 1440) -> str:
        """
        Generates a v4 signed URL to download a file. Expiration defaults to 24 hours.
        """
        if not self.bucket_name:
            raise ValueError("Google Cloud Storage bucket name is not configured.")
            
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(blob_name)
        
        # Generates a signed URL locally using service account private key
        url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(minutes=expiration_minutes),
            method="GET"
        )
        return url

    def file_exists(self, blob_name: str) -> bool:
        """
        Checks if a file exists in the GCS bucket.
        """
        if not self.bucket_name:
            return False
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(blob_name)
        return blob.exists()

    def download_file(self, blob_name: str) -> bytes:
        """
        Downloads a file from GCS and returns its byte content.
        """
        if not self.bucket_name:
            raise ValueError("Google Cloud Storage bucket name is not configured.")
            
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(blob_name)
        return blob.download_as_bytes()

#storage_service = StorageService()
