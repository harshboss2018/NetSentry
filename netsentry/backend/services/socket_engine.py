"""
socket_engine.py — Real TCP and UDP socket servers.

Data flow:
  TCP client connects on port 9001
    → registered in _tcp_clients dict
    → event logged + WS broadcast
    → security engine checked (connection blocked if rule matched)
  UDP datagrams received on port 9002
    → client registered/updated on first packet
    → event logged + WS broadcast
    → automated pruning of inactive UDP clients (>120s)
"""
import asyncio
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Callable

from config import TCP_HOST, TCP_PORT, UDP_HOST, UDP_PORT

# ── In-memory client registries ────────────────────────────────────────────
_tcp_clients: dict[str, dict] = {}   # client_id → {id, ip, port, connected_at, messages, bytes_received}
_udp_clients: dict[str, dict] = {}   # "ip:port" → {id, ip, port, last_seen, datagrams, bytes_received, last_seen_ts}

# Callbacks injected at startup
_on_event: Callable | None = None
_security_check: Callable | None = None


def register_callbacks(on_event: Callable, security_check: Callable):
    global _on_event, _security_check
    _on_event = on_event
    _security_check = security_check


def _prune_inactive_udp_clients():
    """Remove UDP client records older than 120 seconds to prevent unbounded memory growth."""
    now = time.time()
    stale_keys = [k for k, v in _udp_clients.items() if now - v.get("last_seen_ts", now) > 120]
    for k in stale_keys:
        _udp_clients.pop(k, None)


# ── Stats helpers ───────────────────────────────────────────────────────────
def get_tcp_clients() -> list[dict]:
    return list(_tcp_clients.values())

def get_udp_clients() -> list[dict]:
    _prune_inactive_udp_clients()
    return list(_udp_clients.values())

def get_total_clients() -> int:
    _prune_inactive_udp_clients()
    return len(_tcp_clients) + len(_udp_clients)

def get_stats() -> dict:
    _prune_inactive_udp_clients()
    return {
        "tcp_clients": len(_tcp_clients),
        "udp_clients": len(_udp_clients),
        "total": len(_tcp_clients) + len(_udp_clients),
    }


# ── TCP Server ──────────────────────────────────────────────────────────────
async def _handle_tcp_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    addr = writer.get_extra_info("peername")
    if not addr:
        writer.close()
        return

    client_ip = addr[0]
    client_port = addr[1]
    client_id = str(uuid.uuid4())[:8]

    # Security check
    if _security_check:
        allowed, reason = await _security_check(client_ip, "TCP")
        if not allowed:
            if _on_event:
                await _on_event("security_block", {
                    "client_ip": client_ip, "client_port": client_port,
                    "protocol": "TCP", "reason": reason,
                    "data_source": "real",
                })
            try:
                writer.write(f"ERROR 403: Connection rejected by NetSentry policy: {reason}\n".encode())
                await writer.drain()
            except Exception:
                pass
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
            return

    # Register client
    _tcp_clients[client_id] = {
        "id": client_id, "ip": client_ip, "port": client_port,
        "protocol": "TCP", "connected_at": datetime.utcnow().isoformat() + "Z",
        "messages": 0, "bytes_received": 0, "data_source": "real",
    }

    if _on_event:
        await _on_event("client_connected", _tcp_clients[client_id])

    try:
        # Send welcome banner
        writer.write(f"NETSENTRY TCP SERVER | id={client_id} | {datetime.utcnow().isoformat()}Z\n".encode())
        await writer.drain()

        while True:
            data = await asyncio.wait_for(reader.read(65536), timeout=300)
            if not data:
                break
            msg = data.decode(errors="replace").strip()
            _tcp_clients[client_id]["messages"] += 1
            _tcp_clients[client_id]["bytes_received"] += len(data)

            # Echo back with timestamp (used for latency & throughput measurement)
            response = json.dumps({
                "echo": msg,
                "server_ts": time.time(),
                "bytes_in": len(data),
                "client_id": client_id
            }) + "\n"
            writer.write(response.encode())
            await writer.drain()

            if _on_event:
                await _on_event("tcp_message", {
                    "client_id": client_id, "client_ip": client_ip,
                    "message": msg[:200], "bytes": len(data), "data_source": "real",
                })
    except (asyncio.TimeoutError, ConnectionResetError, asyncio.IncompleteReadError, BrokenPipeError):
        pass
    except Exception as e:
        print(f"[TCP Client {client_id}] Unexpected error: {e}")
    finally:
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass
        removed = _tcp_clients.pop(client_id, None)
        if removed and _on_event:
            await _on_event("client_disconnected", {
                "id": client_id, "ip": client_ip, "port": client_port,
                "protocol": "TCP", "data_source": "real",
            })


async def start_tcp_server():
    server = await asyncio.start_server(_handle_tcp_client, TCP_HOST, TCP_PORT)
    print(f"[TCP] Listening on {TCP_HOST}:{TCP_PORT}")
    async with server:
        await server.serve_forever()


# ── UDP Server ──────────────────────────────────────────────────────────────
class _UDPProtocol(asyncio.DatagramProtocol):
    def __init__(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport
        print(f"[UDP] Listening on {UDP_HOST}:{UDP_PORT}")

    def datagram_received(self, data: bytes, addr: tuple):
        client_ip, client_port = addr
        key = f"{client_ip}:{client_port}"
        msg = data.decode(errors="replace").strip()
        now_ts = time.time()

        is_new = key not in _udp_clients
        if is_new:
            _udp_clients[key] = {
                "id": key, "ip": client_ip, "port": client_port,
                "protocol": "UDP", "connected_at": datetime.utcnow().isoformat() + "Z",
                "datagrams": 0, "bytes_received": 0, "data_source": "real",
                "last_seen_ts": now_ts,
            }

        _udp_clients[key]["datagrams"] += 1
        _udp_clients[key]["bytes_received"] += len(data)
        _udp_clients[key]["last_seen"] = datetime.utcnow().isoformat() + "Z"
        _udp_clients[key]["last_seen_ts"] = now_ts

        # Echo datagram back
        response = json.dumps({
            "echo": msg,
            "server_ts": now_ts,
            "client_id": key,
            "bytes_in": len(data)
        }).encode()
        try:
            self.transport.sendto(response, addr)
        except Exception:
            pass

        async def _fire():
            if is_new and _on_event:
                await _on_event("client_connected", _udp_clients[key])
            if _on_event:
                await _on_event("udp_datagram", {
                    "client_id": key, "client_ip": client_ip,
                    "message": msg[:200], "bytes": len(data), "data_source": "real",
                })
        asyncio.run_coroutine_threadsafe(_fire(), self.loop)

    def error_received(self, exc):
        print(f"[UDP] Error: {exc}")


async def start_udp_server():
    loop = asyncio.get_running_loop()
    await loop.create_datagram_endpoint(
        lambda: _UDPProtocol(loop),
        local_addr=(UDP_HOST, UDP_PORT),
    )
