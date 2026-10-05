from typing import Literal
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator


class StoredMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    id: str = Field(min_length=1)
    source: str
    text: str
    important: bool
    receivedAt: int | None = Field(default=None, ge=0)
    origin: Literal["notification"] | None = None


class AssistantSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    name: str
    tamil: bool
    busy: bool
    custom: str
    messages: list[StoredMessage] = Field(max_length=5000)
    important: bool
    draft: str
    source: str
    phone: str
    title: str
    date: str

    @model_validator(mode="after")
    def unique_ids(self):
        if len({message.id for message in self.messages}) != len(self.messages):
            raise ValueError("Message IDs must be unique.")
        return self


class StateDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1]
    savedAt: AwareDatetime
    data: AssistantSnapshot
