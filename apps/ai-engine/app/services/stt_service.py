import io
import logging
import tempfile
from typing import Optional
from faster_whisper import WhisperModel

from app.config import settings

logger = logging.getLogger(__name__)

class STTService:
    """Singleton Speech-To-Text service wrapping Faster-Whisper model."""
    _instance: Optional["STTService"] = None
    _model: Optional[WhisperModel] = None

    def __new__(cls) -> "STTService":
        if cls._instance is None:
            cls._instance = super(STTService, cls).__new__(cls)
        return cls._instance

    def load_model(self) -> None:
        """Load Faster-Whisper model into memory if not already loaded."""
        if self._model is None:
            model_name = settings.whisper_model
            logger.info(f"Initializing Faster-Whisper model: '{model_name}' on CPU...")
            # Use int8 compute_type for optimized CPU execution
            self._model = WhisperModel(model_name, device="cpu", compute_type="int8")
            logger.info("Faster-Whisper model successfully loaded into RAM.")

    def transcribe_audio(self, audio_bytes: bytes, language: str = "vi") -> str:
        """
        Transcribe raw audio bytes to text string.
        Accepts binary audio data (WAV, MP3, WEBM, OGG).
        """
        if not audio_bytes:
            return ""

        self.load_model()
        assert self._model is not None, "STT model failed to initialize."

        # Write bytes to temporary file for Faster-Whisper decoder
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as temp_file:
            temp_file.write(audio_bytes)
            temp_file.flush()

            segments, info = self._model.transcribe(
                temp_file.name,
                language=language,
                beam_size=5,
                vad_filter=True
            )

            text_parts = [segment.text.strip() for segment in segments]
            full_text = " ".join(text_parts).strip()
            logger.info(f"STT Transcription ({info.language}): '{full_text}'")
            return full_text

# Singleton instance
stt_service = STTService()
