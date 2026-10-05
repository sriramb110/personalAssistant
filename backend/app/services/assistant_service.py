from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.database import get_collection
from app.schemas.assistant import default_profile
from app.services.ai_service import generate_reply
from app.services.state_service import read_state

DEFAULT_USER_ID = "default"


async def get_profile() -> dict[str, Any]:
    profile = await get_collection("profiles").find_one({"user_id": DEFAULT_USER_ID})
    if not profile:
        return default_profile()
    merged = default_profile()
    merged.update(profile)
    merged.pop("_id", None)
    return merged


async def upsert_profile(profile_update: dict[str, Any]) -> dict[str, Any]:
    collection = get_collection("profiles")
    current = await get_profile()
    merged = {**default_profile(), **current, **profile_update}
    merged.pop("_id", None)
    merged["user_id"] = DEFAULT_USER_ID
    await collection.update_one({"user_id": DEFAULT_USER_ID}, {"$set": merged}, upsert=True)
    return merged


async def list_messages(limit: int = 50) -> list[dict[str, Any]]:
    messages = await get_collection("messages").find({"user_id": DEFAULT_USER_ID}).sort("received_at", -1).limit(limit).to_list(length=limit)
    return [{key: value for key, value in item.items() if key != "_id"} for item in reversed(messages)]


async def insert_message(payload: dict[str, Any]) -> dict[str, Any]:
    collection = get_collection("messages")
    message = {
        "user_id": DEFAULT_USER_ID,
        "id": payload.get("id") or f"msg-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "source": payload.get("source", "WhatsApp"),
        "text": payload.get("text", ""),
        "important": bool(payload.get("important", False)),
        "received_at": payload.get("received_at") or int(datetime.now(timezone.utc).timestamp() * 1000),
        "origin": payload.get("origin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await collection.insert_one(message)
    message.pop("_id", None)
    return message


async def list_tasks() -> list[dict[str, Any]]:
    tasks = await get_collection("tasks").find({"user_id": DEFAULT_USER_ID}).sort("created_at", -1).to_list(length=100)
    return [{key: value for key, value in item.items() if key != "_id"} for item in tasks]


async def create_task(task_data: dict[str, Any]) -> dict[str, Any]:
    collection = get_collection("tasks")
    item = {
        "id": task_data.get("id") or f"task-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "user_id": DEFAULT_USER_ID,
        "title": task_data["title"],
        "description": task_data.get("description", ""),
        "due_at": task_data.get("due_at"),
        "completed": bool(task_data.get("completed", False)),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await collection.insert_one(item)
    item.pop("_id", None)
    return item


async def get_recent_context(limit: int = 10) -> list[dict[str, Any]]:
    messages = await list_messages(limit=limit)
    return [
        {
            "id": item.get("id"),
            "source": item.get("source"),
            "text": item.get("text"),
            "important": item.get("important", False),
        }
        for item in messages
    ]


async def generate_assistant_response(user_message: str, context: list[dict[str, Any]] | None = None) -> tuple[str, str | None, bool]:
    snapshot = await read_state()
    profile = snapshot["data"] if snapshot else await get_profile()
    if context is None:
        context = snapshot["data"]["messages"][:10] if snapshot else await get_recent_context(limit=10)
    reply = await generate_reply(user_message, profile, context)
    suggestion = "Would you like me to create a reminder or summarize your latest messages?"
    reminder_created = False
    return reply, suggestion, reminder_created
