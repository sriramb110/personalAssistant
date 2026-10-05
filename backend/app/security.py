from secrets import compare_digest

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

bearer = HTTPBearer(auto_error=False)


def require_api_key(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> None:
    if len(settings.backend_api_key) < 32:
        raise HTTPException(503, "Configure BACKEND_API_KEY with at least 32 characters on the server.")
    if credentials is None or not compare_digest(credentials.credentials.encode(), settings.backend_api_key.encode()):
        raise HTTPException(401, "Invalid backend access key.", headers={"WWW-Authenticate": "Bearer"})
