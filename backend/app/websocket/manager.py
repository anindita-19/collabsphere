from fastapi import WebSocket
from typing import Dict, List, Set
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # workspace_id -> list of (websocket, user_id, user_name)
        self.workspace_connections: Dict[str, List[dict]] = {}
        # user_id -> websocket (for direct notifications)
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, workspace_id: str, user_id: str, user_name: str):
        await websocket.accept()
        if workspace_id not in self.workspace_connections:
            self.workspace_connections[workspace_id] = []

        self.workspace_connections[workspace_id].append({
            "websocket": websocket,
            "user_id": user_id,
            "user_name": user_name,
        })
        self.user_connections[user_id] = websocket

        # Broadcast presence update
        await self.broadcast_to_workspace(workspace_id, {
            "type": "presence",
            "user_id": user_id,
            "user_name": user_name,
            "status": "online",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }, exclude_user=None)

        logger.info(f"User {user_id} connected to workspace {workspace_id}")

    def disconnect(self, websocket: WebSocket, workspace_id: str, user_id: str):
        if workspace_id in self.workspace_connections:
            self.workspace_connections[workspace_id] = [
                conn for conn in self.workspace_connections[workspace_id]
                if conn["websocket"] != websocket
            ]
            if not self.workspace_connections[workspace_id]:
                del self.workspace_connections[workspace_id]

        if user_id in self.user_connections:
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

        # Clean dead connections
        for dead in dead_connections:
            self.workspace_connections[workspace_id].remove(dead)

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_text(json.dumps(message))
            except Exception:
                del self.user_connections[user_id]

    def get_online_users(self, workspace_id: str) -> List[str]:
        if workspace_id not in self.workspace_connections:
            return []
        return [conn["user_id"] for conn in self.workspace_connections[workspace_id]]


manager = ConnectionManager()
