import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory of the ai-engine project (apps/ai-engine)
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    host: str = "127.0.0.1"
    port: int = 8000
    whisper_model: str = "base"
    tts_voice: str = "vi-VN-HoaiMyNeural"
    database_path: str = str(BASE_DIR / "calendar.db")

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
