from app.database import get_collection


async def read_state():
    record = await get_collection("assistant_state").find_one({"_id": "default"})
    return record.get("snapshot") if record else None


async def write_state(snapshot: dict):
    # Replace a single snapshot atomically: retries cannot duplicate inbox messages.
    await get_collection("assistant_state").replace_one(
        {"_id": "default"}, {"_id": "default", "snapshot": snapshot}, upsert=True
    )
