"""Connections router — Module C: Live TCP/UDP connections."""
from fastapi import APIRouter
from services import socket_engine

router = APIRouter(prefix="/connections", tags=["connections"])


@router.get("")
async def list_connections():
    return {
        "tcp": socket_engine.get_tcp_clients(),
        "udp": socket_engine.get_udp_clients(),
        "stats": socket_engine.get_stats(),
        "data_source": "real",
    }
