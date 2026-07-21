import io
import logging
from typing import Optional
import edge_tts

from app.config import settings

logger = logging.getLogger(__name__)

async def generate_speech(text: str, voice: Optional[str] = None) -> bytes:
    """
    Asynchronously generate spoken audio (MP3 bytes) from text using Edge-TTS.
    """
    if not text or not text.strip():
        return b""

    selected_voice = voice or settings.tts_voice
    try:
        communicate = edge_tts.Communicate(text, selected_voice)
        audio_stream = io.BytesIO()

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])

        audio_bytes = audio_stream.getvalue()
        logger.info(f"Generated TTS audio ({len(audio_bytes)} bytes) using voice '{selected_voice}'")
        return audio_bytes

    except Exception as e:
        logger.error(f"Error generating TTS audio: {e}", exc_info=True)
        return b""
