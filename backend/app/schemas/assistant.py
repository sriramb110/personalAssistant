from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class MessagePayload(BaseModel):
    id: str | None = None
    source: str = "WhatsApp"
    text: str = ""
    important: bool = False
    received_at: int | None = None
    origin: Literal["notification"] | None = None


class AssistantProfileRead(BaseModel):
    user_id: str = "default"
    name: str = ""
    tamil: bool = False
    busy: bool = False
    custom: str = ""
    important: bool = True
    draft: str = ""
    source: str = "WhatsApp"
    phone: str = ""
    title: str = ""
    date: str = ""


class AssistantProfileUpdate(BaseModel):
    name: str | None = None
    tamil: bool | None = None
    busy: bool | None = None
    custom: str | None = None
    important: bool | None = None
    draft: str | None = None
    source: str | None = None
    phone: str | None = None
    title: str | None = None
    date: str | None = None


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    due_at: str | None = None
    completed: bool = False


class TaskRead(TaskCreate):
    id: str
    created_at: str
    user_id: str = "default"


class ChatRequest(BaseModel):
    message: str
    context: list[MessagePayload] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    suggestion: str | None = None
    reminder_created: bool = False


class SyncPayload(BaseModel):
    profile: AssistantProfileUpdate | None = None
    messages: list[MessagePayload] = Field(default_factory=list)
    tasks: list[TaskCreate] = Field(default_factory=list)


def default_profile() -> dict[str, Any]:
    return {
        "user_id": "default",
        "name": "",
        "tamil": False,
        "busy": False,
        "custom": "",
        "important": True,
        "draft": "",
        "source": "WhatsApp",
        "phone": "",
        "title": "",
        "date": "",
    }
