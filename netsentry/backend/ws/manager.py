"""WebSocket connection manager — broadcasts events to all connected browser clients."""
import json
import asyncio
from datetime import datetime
from typing import Any
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self.active.append(ws)

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            if ws in self.active:
                self.active.remove(ws)

    async def broadcast(self, event_type: str, data: Any):
        """Send a JSON event to all connected browser sessions with safe fallback serialization."""
        try:
            payload = json.dumps({
                "type": event_type,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": data,
            }, default=str)
        except Exception as e:
            print(f"[WS Manager] Serialization error: {e}")
            return

        dead = []
        async with self._lock:
            targets = list(self.active)
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)

    @property
    def count(self) -> int:
        return len(self.active)


# Singleton instance used across the entire app
manager = ConnectionManager()
