import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.stt_service import stt_service
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
            if message.get("type") == "websocket.disconnect":
                logger.info("WebSocket disconnect signal received.")
                break

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

                    elif msg_type == "GET_ALL_TASKS":
                        from app.services.task_service import get_all_tasks
                        all_tasks = await asyncio.to_thread(get_all_tasks)
                        await websocket.send_json({
                            "type": "RESPONSE_METADATA",
                            "user_text": "",
                            "intent": "GET_ALL_TASKS",
                            "reply_text": "Đã đồng bộ dữ liệu lịch.",
                            "tasks": all_tasks,
                            "has_audio": False
                        })

                    elif msg_type == "ADD_MANUAL_TASK":
                        from app.services.task_service import add_tasks
                        task_date = payload.get("task_date")
                        content = payload.get("content")
                        if task_date and content:
                            new_task = {
                                "task_date": task_date,
                                "time_slot": "morning",
                                "exact_time": None,
                                "content": content,
                                "is_important": False
                            }
                            await asyncio.to_thread(add_tasks, [new_task])
                            # Re-fetch all tasks to sync calendar
                            from app.services.task_service import get_all_tasks
                            all_tasks = await asyncio.to_thread(get_all_tasks)
                            await websocket.send_json({
                                "type": "RESPONSE_METADATA",
                                "user_text": content,
                                "intent": "ADD_MANUAL_TASK",
                                "reply_text": "Đã thêm công việc thủ công.",
                                "tasks": all_tasks,
                                "has_audio": False
                            })

                    elif msg_type == "UPDATE_TASK":
                        from app.services.task_service import update_task, get_all_tasks
                        task_id = payload.get("task_id")
                        updates = payload.get("updates")
                        if task_id and updates:
                            await asyncio.to_thread(update_task, task_id, updates)
                            all_tasks = await asyncio.to_thread(get_all_tasks)
                            await websocket.send_json({
                                "type": "RESPONSE_METADATA",
                                "user_text": "",
                                "intent": "UPDATE_TASK",
                                "reply_text": "Đã cập nhật công việc.",
                                "tasks": all_tasks,
                                "has_audio": False
                            })

                    elif msg_type == "DELETE_TASK":
                        from app.services.task_service import delete_task, get_all_tasks
                        task_id = payload.get("task_id")
                        if task_id:
                            await asyncio.to_thread(delete_task, task_id)
                            all_tasks = await asyncio.to_thread(get_all_tasks)
                            await websocket.send_json({
                                "type": "RESPONSE_METADATA",
                                "user_text": "",
                                "intent": "DELETE_TASK",
                                "reply_text": "Đã xóa công việc.",
                                "tasks": all_tasks,
                                "has_audio": False
                            })

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


import asyncio

async def _handle_text_pipeline(websocket: WebSocket, user_text: str) -> None:
    """Execute NLP -> Task DB -> TTS pipeline for text input."""
    # 1. Parse intent and execute tools natively with Groq
    from app.services.llm_service import handle_voice_command
    exec_result = await handle_voice_command(user_text)

    # 2. Always fetch ALL tasks to prevent UI state reset (Bug 2 Fix)
    from app.services.task_service import get_all_tasks
    all_tasks = await asyncio.to_thread(get_all_tasks)

    # 3. Synthesize Vietnamese TTS audio
    audio_bytes = await generate_speech(exec_result["reply_text"])

    # 4. Frame 1: Send JSON Metadata Text Frame
    await websocket.send_json({
        "type": "RESPONSE_METADATA",
        "user_text": user_text,
        "intent": exec_result["intent"],
        "reply_text": exec_result["reply_text"],
        "tasks": all_tasks,
        "has_audio": bool(audio_bytes)
    })

    # 5. Frame 2: Send Raw MP3 Binary Frame
    if audio_bytes:
        await websocket.send_bytes(audio_bytes)


async def _handle_voice_pipeline(websocket: WebSocket, audio_bytes: bytes) -> None:
    """Execute STT -> NLP -> Task DB -> TTS pipeline for audio bytes input."""
    # 1. Transcribe audio to text with Groq Whisper
    try:
        transcribed_text = await stt_service.transcribe_audio(audio_bytes)
        logger.info(f'[STT Output]: "{transcribed_text}"')
    except Exception as e:
        logger.error(f"STT decoding failed: {e}")
        transcribed_text = ""

    if not transcribed_text:
        reply_msg = "Không thể nhận dạng được âm thanh. Vui lòng thử lại."
        error_audio = await generate_speech(reply_msg)
        
        await websocket.send_json({
            "type": "RESPONSE_METADATA",
            "user_text": "",
            "intent": "UNKNOWN",
            "reply_text": reply_msg,
            "tasks": [],
            "has_audio": bool(error_audio)
        })
        
        if error_audio:
            await websocket.send_bytes(error_audio)
        return

    # 2-5. Execute standard pipeline with transcribed text
    await _handle_text_pipeline(websocket, transcribed_text)
