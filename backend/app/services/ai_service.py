from __future__ import annotations

from typing import Any

from openai import OpenAI

from app.config import settings


def _local_reply(user_message: str, profile: dict[str, Any], recent_messages: list[dict[str, Any]]) -> str:
    lower = user_message.lower().strip()
    if not lower:
        return "I am ready to help with reminders, notes, or summaries."

    if any(word in lower for word in ["remind", "schedule", "task", "todo"]):
        return (
            f"I can help you set a reminder. Based on your profile, I see you are {profile.get('name') or 'not set'} and "
            f"{'busy' if profile.get('busy') else 'available'} right now. Add the reminder details and I will keep it in your task list."
        )

    if any(word in lower for word in ["summary", "brief", "today", "report"]):
        recent_count = len(recent_messages)
        return (
            f"Here is your quick brief: you have {recent_count} recent messages in context, and your assistant is configured for "
            f"{'Tamil' if profile.get('tamil') else 'English'} interactions. Focus on the highest-priority messages first."
        )

    if profile.get("tamil") and any(word in lower for word in ["வணக்கம்", "hello", "hi", "hii"]):
        return "வணக்கம்! நான் உங்கள் தனிப்பட்ட உதவியாளர். நீங்கள் நினைவூட்டல்கள், குறிப்புகள் அல்லது சுருக்கங்களை கேட்டால் உதவுவேன்."

    return (
        f"I understand you want help with '{user_message}'. I will prioritize your messages, keep your profile in mind, "
        f"and help you act on the most important items first."
    )


async def generate_reply(user_message: str, profile: dict[str, Any], recent_messages: list[dict[str, Any]]) -> str:
    if settings.openai_api_key:
        try:
            client = OpenAI(api_key=settings.openai_api_key)
            system_prompt = (
                "You are a helpful personal AI assistant for an Android app. Keep responses concise, useful, "
                "and action-oriented. Tailor the answer to the user's profile and recent context."
            )
            completion = client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"User profile: {profile}\nRecent context: {recent_messages}\nUser message: {user_message}"},
                ],
                temperature=0.7,
                max_tokens=300,
            )
            content = completion.choices[0].message.content
            if content:
                return content.strip()
        except Exception:
            pass

    return _local_reply(user_message, profile, recent_messages)
