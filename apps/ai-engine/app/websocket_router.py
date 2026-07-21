import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.stt_service import stt_service
from app.services.llm_service import parse_voice_text
from app.services.task_service import process_intent_and_execute
from app.services.tts_service import generate_speech

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time bi-directional voice and text communication.
    Transmits metadata via JSON Text Frames and audio buffers via Binary Frames.
    """
    await websocket.accept()
    logger.info("WebSocket client connected.")

    try:
        while True:
            message = await websocket.receive()

            # Case A: Incoming Text Frame (JSON Command)
            if "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                    msg_type = payload.get("type", "").upper()

                    if msg_type == "PING":
                        await websocket.send_json({"type": "PONG"})
                        continue

                    elif msg_type == "TEXT_INPUT":
                        user_text = payload.get("text", "")
                        await _handle_text_pipeline(websocket, user_text)

                    else:
                        await websocket.send_json({
                            "type": "ERROR",
                            "message": f"Unsupported message type: '{msg_type}'"
                        })

                except json.JSONDecodeError:
                    await websocket.send_json({"type": "ERROR", "message": "Invalid JSON format"})

            # Case B: Incoming Binary Frame (Raw Audio Stream/File)
            elif "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]
                await _handle_voice_pipeline(websocket, audio_bytes)

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)


async def _handle_text_pipeline(websocket: WebSocket, user_text: str) -> None:
    """Execute NLP -> Task DB -> TTS pipeline for text input."""
    # 1. Parse intent with Gemini LLM
    parsed_intent = parse_voice_text(user_text)

    # 2. Perform DB operations
    exec_result = process_intent_and_execute(parsed_intent)

    # 3. Synthesize Vietnamese TTS audio
    audio_bytes = await generate_speech(exec_result["reply_text"])

    # 4. Frame 1: Send JSON Metadata Text Frame
    await websocket.send_json({
        "type": "RESPONSE_METADATA",
        "user_text": user_text,
        "intent": exec_result["intent"],
        "reply_text": exec_result["reply_text"],
        "tasks": exec_result["tasks"],
        "has_audio": bool(audio_bytes)
    })

    # 5. Frame 2: Send Raw MP3 Binary Frame
    if audio_bytes:
        await websocket.send_bytes(audio_bytes)


async def _handle_voice_pipeline(websocket: WebSocket, audio_bytes: bytes) -> None:
    """Execute STT -> NLP -> Task DB -> TTS pipeline for audio bytes input."""
    # 1. Transcribe audio to text with Faster-Whisper
    transcribed_text = stt_service.transcribe_audio(audio_bytes)

    if not transcribed_text:
        await websocket.send_json({
            "type": "RESPONSE_METADATA",
            "user_text": "",
            "intent": "UNKNOWN",
            "reply_text": "Không thể nhận dạng được âm thanh. Vui lòng thử lại.",
            "tasks": [],
            "has_audio": False
        })
        return

    # 2-5. Execute standard pipeline with transcribed text
    await _handle_text_pipeline(websocket, transcribed_text)
