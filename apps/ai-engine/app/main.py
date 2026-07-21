from fastapi import FastAPI
from app.database import init_db

app = FastAPI(title="Voice Calendar AI Engine")

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "AI Engine is running"}