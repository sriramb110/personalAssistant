from __future__ import annotations
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.assistant import router as assistant_router
from app.api.routes.health import router as health_router
from app.config import settings
from app.database import close_mongo, connect_to_mongo

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await connect_to_mongo()
        yield
    finally:
        await close_mongo()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered personal assistant backend for Android clients with MongoDB persistence.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(assistant_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "Personal Assistant API is running",
        "docs": "/docs",
    }
