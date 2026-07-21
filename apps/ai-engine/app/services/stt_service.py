import io
import logging
from groq import AsyncGroq
from app.config import settings

logger = logging.getLogger(__name__)

class STTService:
    """Singleton Speech-To-Text service using Groq Whisper Cloud API."""
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(STTService, cls).__new__(cls)
        return cls._instance

    def _get_client(self) -> AsyncGroq:
        if self._client is None:
            if not settings.groq_api_key:
                raise ValueError("GROQ_API_KEY is not set.")
            self._client = AsyncGroq(api_key=settings.groq_api_key)
        return self._client

    async def transcribe_audio(self, audio_bytes: bytes) -> str:
        """
        Transcribe raw audio bytes to text string using Groq Whisper.
        """
        if not audio_bytes:
            return ""

        client = self._get_client()

        # Wrap bytes in a tuple with a dummy filename, as expected by Groq API for files
        file_tuple = ("audio.webm", audio_bytes)

        try:
            # Call Groq's whisper-large-v3 transcription endpoint
            transcription = await client.audio.transcriptions.create(
                file=file_tuple,
                model="whisper-large-v3",
                language="vi",
                prompt="Danh sách công việc, lịch trình, nhắc nhở, cuộc họp bằng tiếng Việt.",
                response_format="text"
            )

            # In 'text' response format, the response is simply the string text
            full_text = str(transcription).strip()
            logger.info(f"Groq STT Transcription: '{full_text}'")
            return full_text

        except Exception as e:
            logger.error(f"Groq STT Error: {e}", exc_info=True)
            return ""

# Singleton instance
stt_service = STTService()
