import os
import math
from typing import Tuple
from core.config import settings
from core.logging import logger

class SpeechService:
    def __init__(self):
        logger.info("Initializing SpeechService with local Faster-Whisper model...")
        try:
            from faster_whisper import WhisperModel
            # Load the 'base' model on CPU using int8 quantization to prevent high memory usage
            self.model = WhisperModel("base", device="cpu", compute_type="int8")
            self.available = True
            logger.info("Faster-Whisper base model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Faster-Whisper model: {e}")
            self.model = None
            self.available = False

    def transcribe_audio(self, file_path: str) -> Tuple[str, float]:
        """
        Transcribes the audio file at file_path to text using Faster-Whisper.
        Returns a tuple of (transcript_string, confidence_score).
        """
        if not self.available or not self.model:
            logger.warning("Whisper model is unavailable. Returning fallback empty transcription.")
            return "", 0.0

        if not file_path or not os.path.exists(file_path):
            logger.warning(f"Audio file path is empty or missing: {file_path}")
            return "", 0.0

        if os.path.getsize(file_path) == 0:
            logger.warning(f"Audio file is empty (0 bytes): {file_path}")
            return "", 0.0

        logger.info(f"Transcription started for: {file_path}")
        try:
            segments, info = self.model.transcribe(file_path, beam_size=5)
            
            transcript_parts = []
            confidence_sum = 0.0
            count = 0
            
            # Consume generator to run transcription
            for segment in segments:
                transcript_parts.append(segment.text)
                # Convert log probability to confidence score
                prob = math.exp(segment.avg_logprob) if hasattr(segment, 'avg_logprob') else 0.9
                prob = max(0.0, min(1.0, prob))
                confidence_sum += prob
                count += 1
                
            transcript = " ".join(transcript_parts).strip()
            confidence = confidence_sum / count if count > 0 else 1.0
            
            logger.info(f"Transcription completed successfully. Text length: {len(transcript)}. Confidence: {confidence:.2f}")
            return transcript, confidence
            
        except Exception as e:
            logger.error(f"Faster-Whisper transcription failed: {e}")
            return "", 0.0

    def detect_language(self, audio_content: bytes) -> str:
        return "en-IN"

speech_service = SpeechService()
