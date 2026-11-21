from fastapi import FastAPI
from app.config import settings

app = FastAPI(title=settings.app_name, version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "notifyiq-api"}

@app.get("/ready")
async def ready():
    # Add database readiness only after Neon is configured.
    return {"status": "ready", "database_configured": bool(settings.database_url)}

@app.get("/api/v1/capabilities")
async def capabilities():
    return {
        "cloud_ai_enabled": settings.cloud_ai_enabled,
        "account_sync_enabled": False,
        "notification_capture_available": False,
        "note": "Notification capture is device-local; this API is optional."
    }
