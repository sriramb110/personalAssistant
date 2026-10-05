from __future__ import annotations

import json
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_database
from app.security import require_api_key
from app.schemas.state import StateDocument
from app.services.state_service import read_state, write_state

from app.schemas.assistant import (
    AssistantProfileUpdate,
    ChatRequest,
    ChatResponse,
    MessagePayload,
    SyncPayload,
    TaskCreate,
    default_profile,
)
from app.services.assistant_service import (
    create_task,
    generate_assistant_response,
    get_profile,
    insert_message,
    list_messages,
    list_tasks,
    upsert_profile,
)

router = APIRouter(prefix="/api/v1/assistant", tags=["assistant"], dependencies=[Depends(require_api_key)])


@router.get("/status")
async def connection_status():
    try:
        await get_database().command("ping")
    except Exception:
        raise HTTPException(503, "Database unavailable.")
    return {"status": "ok", "version": 1}


@router.get("/state", response_model=StateDocument)
async def download_state():
    snapshot = await read_state()
    if snapshot is None:
        raise HTTPException(404, "No server snapshot yet. Sync this phone first.")
    return snapshot


@router.put("/state", response_model=StateDocument)
async def upload_state(document: StateDocument):
    snapshot = document.model_dump(mode="json", exclude_none=True)
    if len(json.dumps(snapshot, ensure_ascii=False).encode("utf-8")) > 8 * 1024 * 1024:
        raise HTTPException(413, "Snapshot exceeds the 8 MB limit.")
    await write_state(snapshot)
    return snapshot


@router.get("/profile")
async def read_profile():
    return await get_profile()


@router.put("/profile")
async def update_profile(profile: AssistantProfileUpdate):
    payload = profile.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No profile fields were provided.")
    return await upsert_profile(payload)


@router.get("/messages")
async def read_messages(limit: int = 50):
    return await list_messages(limit=limit)


@router.post("/messages", status_code=status.HTTP_201_CREATED)
async def create_message(message: MessagePayload):
    if not message.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message text cannot be empty.")
    return await insert_message(message.model_dump(exclude_none=True))


@router.get("/tasks")
async def get_tasks():
    return await list_tasks()


@router.post("/tasks", status_code=status.HTTP_201_CREATED)
async def create_new_task(task: TaskCreate):
    if not task.title.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task title is required.")
    return await create_task(task.model_dump())


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message text cannot be empty.")

    context = [item.model_dump(exclude_none=True) for item in request.context] if request.context else None
    reply, suggestion, reminder_created = await generate_assistant_response(request.message, context)
    return ChatResponse(reply=reply, suggestion=suggestion, reminder_created=reminder_created)


@router.post("/sync")
async def sync_assistant_data(payload: SyncPayload):
    if payload.profile:
        await upsert_profile(payload.profile.model_dump(exclude_unset=True))

    for item in payload.messages:
        if item.text.strip():
            await insert_message(item.model_dump(exclude_none=True))

    for task in payload.tasks:
        if task.title.strip():
            await create_task(task.model_dump())

    return {
        "status": "ok",
        "profile": await get_profile(),
        "messages_count": len(payload.messages),
        "tasks_count": len(payload.tasks),
    }
