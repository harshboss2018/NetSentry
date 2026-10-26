"""
NetSentry — FastAPI Application Entry Point
==========================================
Startup sequence:
  1. Initialize SQLite (create tables if not exist)
  2. Load security rules from DB into in-memory engine
  3. Register socket engine callbacks (event logger + security check)
  4. Start TCP server (port 9001) as background asyncio task
  5. Start UDP server (port 9002) as background asyncio task
  6. Start metric broadcast loop (every 2 seconds via WebSocket)

All REST endpoints are under /api/v1/*
WebSocket: ws://localhost:8000/ws
"""
import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import select

from config import API_PREFIX, APP_TITLE, APP_VERSION, WS_METRIC_INTERVAL, FRONTEND_DIST
from database import init_db, AsyncSessionLocal
from models.security_rule import SecurityRule
from models.event import Event
from services import socket_engine
from services.security_engine import security_engine
from services.metrics import get_system_snapshot
from ws.manager import manager

from routers import status, topology, connections, routing, performance, security, tools


# ── Event logger (called by socket engine) ──────────────────────────────────
async def _log_event(event_type: str, data: dict):
    """Persist event to SQLite and broadcast to all dashboard WebSockets."""
    category_map = {
        "client_connected": "connection",
        "client_disconnected": "connection",
        "tcp_message": "connection",
        "udp_datagram": "connection",
        "security_block": "security",
        "system": "system",
    }
    category = category_map.get(event_type, "system")
    severity = "warning" if event_type == "security_block" else "info"

    async with AsyncSessionLocal() as db:
        event = Event(
            timestamp=datetime.utcnow(),
            category=category,
            severity=severity,
            source_ip=data.get("client_ip") or data.get("ip"),
            source_port=data.get("client_port") or data.get("port"),
            protocol=data.get("protocol"),
            message=_format_message(event_type, data),
            detail=json.dumps(data),
        )
        db.add(event)
        await db.commit()

    await manager.broadcast(event_type, data)


def _format_message(event_type: str, data: dict) -> str:
    if event_type == "client_connected":
        return f"{data.get('protocol','?')} client connected from {data.get('ip','?')}:{data.get('port','?')}"
    if event_type == "client_disconnected":
        return f"{data.get('protocol','?')} client disconnected: {data.get('ip','?')}"
    if event_type == "tcp_message":
        return f"TCP message from {data.get('client_ip','?')}: {data.get('message','')[:80]}"
    if event_type == "udp_datagram":
        return f"UDP datagram from {data.get('client_ip','?')}: {data.get('message','')[:80]}"
    if event_type == "security_block":
        return f"Blocked {data.get('protocol','?')} from {data.get('client_ip','?')}: {data.get('reason','')}"
    return str(data)[:100]


# ── Security check callback ──────────────────────────────────────────────────
async def _security_check(client_ip: str, protocol: str) -> tuple[bool, str]:
    return await security_engine.check(client_ip, protocol)


# ── Metric broadcast loop ────────────────────────────────────────────────────
async def _metric_loop():
    while True:
        await asyncio.sleep(WS_METRIC_INTERVAL)
        if manager.count > 0:
            snap = get_system_snapshot()
            snap["clients"] = socket_engine.get_stats()
            await manager.broadcast("metrics", snap)


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[NetSentry] Starting {APP_TITLE} v{APP_VERSION}")

    # 1. DB init
    await init_db()

    # 2. Load security rules
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(SecurityRule).where(SecurityRule.enabled == True))
        rules = result.scalars().all()
        security_engine.load_rules([
            {"id": r.id, "rule_type": r.rule_type, "target": r.target,
             "protocol": r.protocol, "description": r.description, "enabled": r.enabled}
            for r in rules
        ])
    print(f"[NetSentry] Loaded {len(rules)} security rules")

    # 3. Register socket engine callbacks
    socket_engine.register_callbacks(_log_event, _security_check)

    # 4 & 5. Start TCP + UDP servers
    tcp_task = asyncio.create_task(socket_engine.start_tcp_server())
    udp_task = asyncio.create_task(socket_engine.start_udp_server())

    # 6. Start metric broadcast loop
    metric_task = asyncio.create_task(_metric_loop())

    print(f"[NetSentry] Ready — API: http://localhost:8000{API_PREFIX}")
    print(f"[NetSentry] Docs:  http://localhost:8000/docs")
    print(f"[NetSentry] TCP:   port 9001  |  UDP: port 9002")

    yield  # App is running

    tcp_task.cancel()
    udp_task.cancel()
    metric_task.cancel()
    print("[NetSentry] Shutdown complete")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description="NetSentry — Interactive Network Monitoring & Resilience Lab",
    lifespan=lifespan,
)

# CORS — allow Vite dev server (port 5173) and any origin for LAN demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(status.router,      prefix=API_PREFIX)
app.include_router(topology.router,    prefix=API_PREFIX)
app.include_router(connections.router, prefix=API_PREFIX)
app.include_router(routing.router,     prefix=API_PREFIX)
app.include_router(performance.router, prefix=API_PREFIX)
app.include_router(security.router,    prefix=API_PREFIX)
app.include_router(tools.router,       prefix=API_PREFIX)


# ── WebSocket endpoint ────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        # Send immediate state snapshot on connect
        snap = get_system_snapshot()
        snap["clients"] = socket_engine.get_stats()
        await ws.send_text(json.dumps({
            "type": "connected",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "data": snap,
        }))
        # Keep alive — listen for client pings
        while True:
            try:
                msg = await asyncio.wait_for(ws.receive_text(), timeout=30)
                if msg == "ping":
                    await ws.send_text('{"type":"pong"}')
            except asyncio.TimeoutError:
                await ws.send_text('{"type":"heartbeat"}')
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(ws)


# ── Serve React frontend (production / demo mode) ─────────────────────────────
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        return FileResponse(str(index))
