# Personal Assistant Backend

This backend is a Python FastAPI service for the Android personal-assistant app. It is designed to work with a local MongoDB instance running on `mongodb://localhost:27017` and can optionally use OpenAI to generate assistant replies.

## Features

- FastAPI REST API
- MongoDB persistence using PyMongo Async
- Assistant profile and settings management
- Message inbox storage and sync
- Task/reminder management
- AI reply generation with OpenAI fallback logic
- Health checks and readiness endpoints

## Setup

1. Create and activate a virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   . .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` as needed.
5. Start the API:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Local MongoDB

The project expects MongoDB to be running locally on port `27017`.

## API Overview

- `GET /health`
- `GET /api/v1/assistant/profile`
- `PUT /api/v1/assistant/profile`
- `GET /api/v1/assistant/messages`
- `POST /api/v1/assistant/messages`
- `GET /api/v1/assistant/tasks`
- `POST /api/v1/assistant/tasks`
- `POST /api/v1/assistant/chat`
- `POST /api/v1/assistant/sync`

The Android app saves locally first and integrates with authenticated snapshot endpoints through Settings. Connect with the HTTPS URL and backend access key, select **Sync local data to backend**, or enable automatic sync. Restore explicitly replaces local messages, preferences and drafts after confirmation. Google Drive backup stays independent. Chat suggestions do not create tasks automatically; use the tasks endpoint to save a reminder.

## Mobile integration setup

This server currently serves one personal assistant account. The access key protects that shared personal dataset; it is not a multi-customer login system. Use separate deployments for separate owners until account-based authentication is added.

From the backend directory in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(32))"
```

Put the generated value in `BACKEND_API_KEY` in your local `.env`. Do not commit it. Set `MONGODB_URI` for a reachable local MongoDB or your MongoDB deployment, then run:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Use a HTTPS server URL for a hosted backend. The Android emulator reaches a server on the computer at `http://10.0.2.2:8000`; a physical phone needs the computer's LAN address on the same network or the hosted URL. `localhost` on a phone refers to the phone itself. Android HTTP access can require a native development network configuration; prefer HTTPS for an installed release build. Web preview origins must be included in `CORS_ORIGINS`; native phone requests do not require browser CORS.

The protected routes use `Authorization: Bearer <BACKEND_API_KEY>`:

- `GET /api/v1/assistant/status`: validates access and MongoDB readiness.
- `PUT /api/v1/assistant/state`: stores a version 1 local snapshot atomically. Retries do not append duplicate messages, and removed messages disappear from the saved snapshot.
- `GET /api/v1/assistant/state`: downloads the saved snapshot, or returns 404 if none has been uploaded.

Snapshots contain messages, call alert text, preferences and drafts, excluding Google credentials and client IDs. They use the same camelCase fields as the mobile backup document (`receivedAt`, `savedAt`). Invalid or duplicate message IDs are rejected before replacing server data. Limits are 5,000 messages and 8 MB per snapshot. Automatic mobile sync uploads local changes after a five-second pause while the app is active, retries approximately every minute, and retries on resume. It does not run when the app is fully closed. Sync does not merge simultaneous edits across multiple phones; the most recently uploaded snapshot wins.

## Temporary HTTPS without a registered domain

The approved Cloudflare Quick Tunnel currently points to this computer's authenticated backend on port 8001. Its public URL was verified for both rejected unauthenticated requests and successful authenticated MongoDB readiness. The initial URL is `https://curve-ultra-produced-civilization.trycloudflare.com`; it is also the mobile app's default backend URL. It works only while this server and tunnel run. A restarted tunnel generates a new address; update the app's URL after disconnecting. No domain registration is needed.

Start the backend from the project root:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\run.py --port 8001
```

In a second terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\start_https.ps1
```

The verified Cloudflare executable is installed locally in `.tools/cloudflared.exe` and excluded from Git. A fresh checkout needs the official [Windows cloudflared download](https://developers.cloudflare.com/tunnel/downloads/) before using the launcher. The launcher refuses to expose an API that does not reject unauthenticated requests.

In mobile Settings, enter the printed HTTPS URL and copy **only the value** of `BACKEND_API_KEY` from your local `backend/.env` into the access-key field. It is stored using Expo SecureStore on the phone; the web preview keeps it in memory for the current session. The key is not compiled into the app, included in backups, or printed in setup logs. Local `.env` is ignored by Git. Clear app storage/sign out of backend to remove device access. After a server key change, disconnect and reconnect with the new key.

Quick Tunnels are for development and have no uptime guarantee. For permanent availability, deploy to a hosting provider or configure a named tunnel. [Cloudflare Quick Tunnel documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

The API falls back to local responses when `OPENAI_API_KEY` is empty. Configuring that key enables the existing OpenAI integration, which sends assistant questions, profile and recent context to that provider; leave it empty if external AI processing is not intended.

## Regression checks

```bash
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -v
```

The regression and HTTP integration tests mock MongoDB and AI providers. Running the API itself requires a reachable MongoDB instance. The integration tests verify authorization, readiness, snapshot round trips, repeated uploads, deletion, Tamil text and invalid-payload rejection.

## Example

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/assistant/profile
```
