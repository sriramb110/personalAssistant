from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "personal-assistant-api",
        "database": "mongodb://localhost:27017",
    }
