import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.config import settings
from app.database import init_db
from app.services.stt_service import stt_service
from app.websocket_router import router as websocket_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for FastAPI startup and shutdown."""
    logger.info("Initializing database schema...")
    init_db()

    logger.info("AI Engine startup completed.")
    yield
    logger.info("AI Engine shutting down.")

app = FastAPI(
    title="Voice Calendar AI Engine",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(websocket_router)

@app.get("/health")
def health_check():
    """Health check endpoint exposing server status and configured models."""
    return {
        "status": "ok",
        "message": "AI Engine is running",
        "config": {
            "whisper_model": settings.whisper_model,
            "tts_voice": settings.tts_voice,
            "groq_api_configured": bool(settings.groq_api_key),
            "database_path": settings.database_path
        }
    }