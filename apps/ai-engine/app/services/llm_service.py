import json
import logging
from typing import Any, Dict
from google import genai
from google.genai import types

from app.config import settings
from app.services.prompts import get_system_prompt

logger = logging.getLogger(__name__)

def _get_genai_client() -> genai.Client | None:
    """Instantiate Gemini API client if API key is set."""
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY is not configured.")
        return None
    return genai.Client(api_key=settings.gemini_api_key)

def parse_voice_text(user_text: str) -> Dict[str, Any]:
    """
    Parse user voice/text input into structured intent and task JSON using Gemini API.
    """
    fallback_response: Dict[str, Any] = {
        "intent": "UNKNOWN",
        "reply_text": "Xin lỗi, tôi chưa hiểu rõ ý của bạn. Bạn có thể nói lại được không?",
        "tasks": []
    }

    if not user_text or not user_text.strip():
        return fallback_response

    client = _get_genai_client()
    if client is None:
        fallback_response["reply_text"] = "Chưa cấu hình GEMINI_API_KEY. Vui lòng kiểm tra file .env."
        return fallback_response

    try:
        system_instruction = get_system_prompt()
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=0.2,
        )

        # Using gemini-2.5-flash or default flash model
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_text,
            config=config,
        )

        if not response.text:
            return fallback_response

        parsed_data = json.loads(response.text)
        return parsed_data

    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}", exc_info=True)
        return fallback_response
