from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from app.database import connect_db, disconnect_db
from app.config import settings
from app.routers import auth, workspaces, projects, tasks, files, documents, notifications, websocket

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting CollabSphere API...")
    await connect_db()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info("CollabSphere API started successfully")
    yield
    # Shutdown
    logger.info("Shutting down CollabSphere API...")
    await disconnect_db()


app = FastAPI(
    title="CollabSphere API",
    description="Production-grade Project Collaboration Platform API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routers
API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(workspaces.router, prefix=API_PREFIX)
app.include_router(projects.router, prefix=API_PREFIX)
app.include_router(tasks.router, prefix=API_PREFIX)
app.include_router(files.router, prefix=API_PREFIX)
app.include_router(documents.router, prefix=API_PREFIX)
app.include_router(notifications.notif_router, prefix=API_PREFIX)
app.include_router(notifications.chat_router, prefix=API_PREFIX)
app.include_router(notifications.analytics_router, prefix=API_PREFIX)
app.include_router(websocket.router)  # No prefix for WebSocket


@app.get("/")
async def root():
    return {
        "name": "CollabSphere API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
