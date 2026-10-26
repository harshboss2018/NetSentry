"""Status and metrics router — Module A: Dashboard."""
import asyncio
from datetime import datetime
from fastapi import APIRouter
from services.metrics import get_system_snapshot
from services import socket_engine
from config import TCP_PORT, UDP_PORT, APP_VERSION

router = APIRouter(prefix="/status", tags=["status"])


@router.get("")
async def get_status():
    """Overall server health and configuration."""
    snap = get_system_snapshot()
    return {
        "status": "online",
        "version": APP_VERSION,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "tcp_port": TCP_PORT,
        "udp_port": UDP_PORT,
        "clients": socket_engine.get_stats(),
        "system": snap,
        "data_source": "real",
    }


@router.get("/metrics")
async def get_metrics():
    """Point-in-time system metrics snapshot."""
    return get_system_snapshot()
