import json
import logging
from typing import Any, Dict
from groq import AsyncGroq

from app.config import settings
from app.services.prompts import get_system_prompt

logger = logging.getLogger(__name__)

def _get_groq_client() -> AsyncGroq | None:
    """Instantiate Async Groq API client if API key is set."""
    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY is not configured.")
        return None
    return AsyncGroq(api_key=settings.groq_api_key)

async def parse_voice_text(user_text: str) -> Dict[str, Any]:
    """
    Parse user voice/text input into structured intent and task JSON using Groq API.
    """
    fallback_response: Dict[str, Any] = {
        "intent": "UNKNOWN",
        "reply_text": "Xin lỗi, tôi chưa hiểu rõ ý của bạn. Bạn có thể nói lại được không?",
        "tasks": []
    }

    if not user_text or not user_text.strip():
        return fallback_response

    client = _get_groq_client()
    if client is None:
        fallback_response["reply_text"] = "Chưa cấu hình GROQ_API_KEY. Vui lòng kiểm tra file .env."
        return fallback_response

    try:
        system_instruction = get_system_prompt()
        
        response = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_text}
            ],
            model=settings.groq_model,
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        response_content = response.choices[0].message.content
        if not response_content:
            logger.error("Groq API returned an empty response.")
            return fallback_response
            
        logger.info(f"Groq intent parsing succeeded using model '{settings.groq_model}'.")
        parsed_data = json.loads(response_content)
        return parsed_data

    except Exception as e:
        logger.error(f"Error calling Groq API: {e}", exc_info=True)
        err_str = str(e).lower()
        if "rate limit" in err_str or "429" in err_str:
            fallback_response["reply_text"] = "Lỗi: Quá giới hạn request Groq API (Rate Limit). Vui lòng thử lại sau."
        elif "503" in err_str or "unavailable" in err_str:
            fallback_response["reply_text"] = "Lỗi: Hệ thống AI của Groq đang bị quá tải (503). Vui lòng thử lại sau vài phút."
        else:
            fallback_response["reply_text"] = f"Lỗi: Không thể kết nối tới AI. {e}"
        return fallback_response
