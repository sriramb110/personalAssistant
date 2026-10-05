from __future__ import annotations

from typing import Any

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.config import settings

client: AsyncMongoClient | None = None
db: AsyncDatabase | None = None


async def connect_to_mongo() -> AsyncDatabase:
    global client, db

    if client is None:
        client = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
        db = client[settings.database_name]

    await db.command("ping")
    return db


async def close_mongo() -> None:
    global client, db

    if client is not None:
        await client.close()
        client = None
        db = None


def get_database() -> AsyncDatabase:
    if db is None:
        raise RuntimeError("MongoDB database is not connected. Call connect_to_mongo() during startup.")
    return db


def get_collection(name: str):
    return get_database()[name]
