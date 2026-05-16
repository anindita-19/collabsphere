from fastapi import WebSocket
from typing import Dict, List
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # workspace_id -> list of {websocket, user_id, user_name}
        self.workspace_connections: Dict[str, List[dict]] = {}
        # user_id -> websocket (for direct notifications)
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, workspace_id: str, user_id: str, user_name: str):
        await websocket.accept()

        if workspace_id not in self.workspace_connections:
            self.workspace_connections[workspace_id] = []

        # ── FIX: remove any stale connection for this user in this workspace ──
        # Without this, reconnects (page refresh, network drop) accumulate
        # duplicate entries and inflate the online count.
        self.workspace_connections[workspace_id] = [
            conn for conn in self.workspace_connections[workspace_id]
            if conn["user_id"] != user_id
        ]

        self.workspace_connections[workspace_id].append({
            "websocket": websocket,
            "user_id": user_id,
            "user_name": user_name,
        })
        self.user_connections[user_id] = websocket

        # Broadcast presence update to workspace
        await self.broadcast_to_workspace(workspace_id, {
            "type": "presence",
            "user_id": user_id,
            "user_name": user_name,
            "status": "online",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        logger.info(f"User {user_id} connected to workspace {workspace_id} "
                    f"({len(self.workspace_connections[workspace_id])} online)")

    def disconnect(self, websocket: WebSocket, workspace_id: str, user_id: str):
        if workspace_id in self.workspace_connections:
            self.workspace_connections[workspace_id] = [
                conn for conn in self.workspace_connections[workspace_id]
                if conn["websocket"] != websocket
            ]
            if not self.workspace_connections[workspace_id]:
                del self.workspace_connections[workspace_id]

        # Only remove from user_connections if it's still pointing at this socket
        if self.user_connections.get(user_id) == websocket:
            del self.user_connections[user_id]

        logger.info(f"User {user_id} disconnected from workspace {workspace_id}")

    async def broadcast_to_workspace(self, workspace_id: str, message: dict, exclude_user: str = None):
        if workspace_id not in self.workspace_connections:
            return

        dead_connections = []
        for conn in self.workspace_connections[workspace_id]:
            if exclude_user and conn["user_id"] == exclude_user:
                continue
            try:
                await conn["websocket"].send_text(json.dumps(message))
            except Exception:
                dead_connections.append(conn)

        # Clean up any dead connections discovered during broadcast
        for dead in dead_connections:
            try:
                self.workspace_connections[workspace_id].remove(dead)
            except ValueError:
                pass

    async def send_to_user(self, user_id: str, message: dict):
        ws = self.user_connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                self.user_connections.pop(user_id, None)

    def get_online_users(self, workspace_id: str) -> List[str]:
        """Return unique user IDs currently connected to this workspace."""
        if workspace_id not in self.workspace_connections:
            return []
        seen = set()
        result = []
        for conn in self.workspace_connections[workspace_id]:
            uid = conn["user_id"]
            if uid not in seen:
                seen.add(uid)
                result.append(uid)
        return result

    def get_online_count(self, workspace_id: str) -> int:
        return len(self.get_online_users(workspace_id))


manager = ConnectionManager()