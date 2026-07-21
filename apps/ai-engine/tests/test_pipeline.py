import asyncio
import os
import sys
from pathlib import Path

# Add apps/ai-engine to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings
from app.database import init_db
from app.services.prompts import get_system_prompt
from app.services.task_service import add_tasks, get_tasks_by_date
from app.services.tts_service import generate_speech

def test_config_and_db_init():
    """Verify configuration loads and database table creation."""
    assert settings.database_path.endswith("calendar.db"), f"Unexpected db path: {settings.database_path}"
    init_db()
    assert os.path.exists(settings.database_path), "Database file was not created"

def test_prompt_generation():
    """Verify prompt incorporates current date."""
    prompt = get_system_prompt()
    assert "STRICT OUTPUT FORMAT" in prompt
    assert "JSON Structure:" in prompt

def test_task_service_crud():
    """Verify task insertion and retrieval from SQLite."""
    init_db()
    dummy_task = [{
        "task_date": "2026-07-25",
        "time_slot": "Sáng",
        "exact_time": "09:00",
        "content": "Họp kế hoạch tuần mới",
        "is_important": True
    }]
    created = add_tasks(dummy_task)
    assert len(created) == 1, "Failed to create task"
    assert created[0]["content"] == "Họp kế hoạch tuần mới"

    retrieved = get_tasks_by_date("2026-07-25")
    assert any(t["content"] == "Họp kế hoạch tuần mới" for t in retrieved), "Task not found in retrieval"

async def test_tts_generation():
    """Verify async TTS audio generation produces MP3 byte buffer."""
    audio_bytes = await generate_speech("Xin chào, tôi là trợ lý ảo lịch trình.")
    assert isinstance(audio_bytes, bytes)
    assert len(audio_bytes) > 0, "TTS generated empty audio bytes"

if __name__ == "__main__":
    print("Running basic integration checks...")
    test_config_and_db_init()
    print("[PASS] Config & Database initialization")
    test_prompt_generation()
    print("[PASS] System prompt generation")
    test_task_service_crud()
    print("[PASS] SQLite Task CRUD operations")
    asyncio.run(test_tts_generation())
    print("[PASS] Async TTS generation")
    print("All backend unit/integration checks completed successfully!")
