import os
from typing import Tuple
from google.cloud import speech
from google.oauth2 import service_account
from core.config import settings
from core.logging import logger

class SpeechService:
    def __init__(self):
        self.credentials_path = settings.GOOGLE_APPLICATION_CREDENTIALS
        logger.info("Initializing SpeechService...")
        
        if self.credentials_path and os.path.exists(self.credentials_path):
            # Ensure the env var is set for standard client initializations
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(self.credentials_path)
            self.credentials = service_account.Credentials.from_service_account_file(self.credentials_path)
            self.client = speech.SpeechClient(credentials=self.credentials)
        else:
            self.client = speech.SpeechClient()

    def transcribe_audio(self, audio_content: bytes, mime_type: str) -> Tuple[str, float]:
        """
        Transcribes audio content to text and returns a tuple of (transcript_string, confidence_score).
        Gracefully handles empty audio, timeout, and API failures.
        """
        if not audio_content:
            logger.warning("Attempted to transcribe empty audio content.")
            return "", 0.0

        encoding = speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED
        sample_rate_hertz = None
        
        # Simple heuristics for common encodings
        mime_lower = mime_type.lower()
        if "wav" in mime_lower:
            encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
            # WAV linear16 PCM usually requires sample rate, but Speech-to-Text can auto-detect 
            # if we leave it unspecified or use ENCODING_UNSPECIFIED if it fails.
            # Let's fallback to ENCODING_UNSPECIFIED if we aren't sure of sample rate, to be safe.
            encoding = speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED
        elif "mpeg" in mime_lower or "mp3" in mime_lower:
            encoding = speech.RecognitionConfig.AudioEncoding.MP3
        
        config = speech.RecognitionConfig(
            encoding=encoding,
            language_code="en-IN",
            alternative_language_codes=["hi-IN", "en-US"],
            enable_automatic_punctuation=True
        )
        
        audio = speech.RecognitionAudio(content=audio_content)
        
        try:
            logger.info("Sending recognize request to Google Speech-to-Text API...")
            # Enforce 15-second timeout on synchronous recognition call
            response = self.client.recognize(config=config, audio=audio, timeout=15.0)
            
            transcript_parts = []
            confidence_scores = []
            
            for result in response.results:
                if result.alternatives:
                    best_alt = result.alternatives[0]
                    transcript_parts.append(best_alt.transcript)
                    confidence_scores.append(best_alt.confidence)
            
            transcript = " ".join(transcript_parts).strip()
            confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
            
            logger.info(f"Speech transcription success. Confidence: {confidence:.2f}")
            return transcript, confidence
            
        except Exception as e:
            logger.error(f"Speech-to-Text transaction failed: {e}")
            # Gracefully fallback to empty transcript and 0.0 confidence per instructions
            return "", 0.0

    def detect_language(self, audio_content: bytes) -> str:
        """
        Stub to return default dialect.
        """
        return "en-IN"

speech_service = SpeechService()
