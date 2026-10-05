from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PersonalAssistantAPI"
    app_version: str = "1.0.0"
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "personal_assistant"
    secret_key: str = "dev-secret-key-change-me"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    debug: bool = Field(default=False, validation_alias="APP_DEBUG")
    backend_api_key: str = ""
    cors_origins: list[str] = ["http://localhost:8081", "http://127.0.0.1:8081"]

    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[1] / ".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
