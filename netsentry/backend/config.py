"""NetSentry global configuration."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# ── Database ────────────────────────────────────────────────────────────────
DATABASE_URL = f"sqlite+aiosqlite:///{BASE_DIR / 'netsentry.db'}"

# ── API ─────────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"
APP_TITLE = "NetSentry"
APP_VERSION = "1.0.0"

# ── Real Socket Servers ──────────────────────────────────────────────────────
TCP_HOST = "0.0.0.0"
TCP_PORT = 9001
UDP_HOST = "0.0.0.0"
UDP_PORT = 9002

# ── WebSocket ────────────────────────────────────────────────────────────────
WS_METRIC_INTERVAL = 2.0  # seconds between metric broadcasts

# ── Frontend (for production serving) ───────────────────────────────────────
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

# ── Security ─────────────────────────────────────────────────────────────────
MAX_CONNECTIONS_PER_MINUTE = 10  # anomaly detection threshold
