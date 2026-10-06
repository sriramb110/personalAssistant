"""Run this file with the backend virtual environment to start the API."""

from pathlib import Path
import argparse
import json
import socket
import sys
from urllib.request import urlopen

import uvicorn


def main() -> None:
    parser = argparse.ArgumentParser(description="Start the Personal Assistant API.")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("Port must be between 1 and 65535.")
    address = f"http://127.0.0.1:{args.port}"
    with socket.socket() as connection:
        connection.settimeout(1)
        occupied = connection.connect_ex(("127.0.0.1", args.port)) == 0
    if occupied:
        try:
            with urlopen(f"{address}/health", timeout=2) as response:
                health = json.load(response)
            if isinstance(health, dict) and health.get("service") == "personal-assistant-api" and health.get("status") == "ok":
                print(f"Personal Assistant API is already running: {address}/docs", flush=True)
                print("Use the existing server. Stop it in its terminal before restarting to load code changes.")
                return
        except Exception:
            pass
        parser.exit(1, f"Port {args.port} is occupied by another service. Run this file with --port 8001, or stop that service.\n")
    backend_directory = str(Path(__file__).resolve().parent)
    if backend_directory not in sys.path:
        sys.path.insert(0, backend_directory)
    print(f"Starting Personal Assistant API: {address}/docs", flush=True)
    uvicorn.run("app.main:app", host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()
