from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Literal


class MessageRecord(BaseModel):
    id: str
    source: str
    text: str
    important: bool = False
    received_at: int | None = None
    origin: Literal["notification"] | None = None


class AssistantProfile(BaseModel):
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


class TaskItem(BaseModel):
    id: str
    title: str
    description: str = ""
    due_at: str | None = None
    completed: bool = False
    created_at: str
    user_id: str = "default"
