import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Verify environment variable is set
cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
print(f"GOOGLE_APPLICATION_CREDENTIALS is set to: {cred_path}")
if cred_path:
    abs_path = os.path.abspath(cred_path)
    print(f"Absolute path: {abs_path}")
    print(f"File exists: {os.path.exists(abs_path)}")

try:
    print("\nInitializing Google Cloud Storage client...")
    from google.cloud import storage
    storage_client = storage.Client()
    print("Success: Storage client initialized successfully!")
except Exception as e:
    print(f"Error: Failed to initialize Storage client: {e}")

try:
    print("\nInitializing Google Cloud Speech client...")
    from google.cloud import speech
    speech_client = speech.SpeechClient()
    print("Success: Speech client initialized successfully!")
except Exception as e:
    print(f"Error: Failed to initialize Speech client: {e}")
