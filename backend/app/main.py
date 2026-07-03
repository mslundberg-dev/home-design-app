from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.routers.export import router as export_router
from app.routers.floors import router as floors_router
from app.routers.projects import router as projects_router

app = FastAPI(title="Home Design App API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Accept"],
)

app.include_router(projects_router, prefix="/api")
app.include_router(floors_router, prefix="/api")
app.include_router(export_router, prefix="/api")


@app.get("/api/health")
def health():
    """Liveness probe — also verifies DB connectivity."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception as exc:
        return {"status": "degraded", "db": str(exc)}
