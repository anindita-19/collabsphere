from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websocket.manager import manager
from app.utils.auth import decode_access_token
from app.database import get_db
from app.utils.helpers import serialize_doc, utc_now
from bson import ObjectId
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/{workspace_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    workspace_id: str,
    token: str = Query(...),
):
    # Authenticate
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001)
        return

    user_id = payload.get("sub")
    db = get_db()

    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    user_name = user.get("full_name", "Unknown")

    # Verify workspace membership
    ws_doc = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws_doc:
        await websocket.close(code=4004)
        return

    member_ids = [m["user_id"] for m in ws_doc.get("members", [])]
    if user_id not in member_ids:
        await websocket.close(code=4003)
        return

    await manager.connect(websocket, workspace_id, user_id, user_name)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "typing":
                    # Broadcast typing indicator
                    await manager.broadcast_to_workspace(workspace_id, {
                        "type": "typing",
                        "user_id": user_id,
                        "user_name": user_name,
                        "is_typing": message.get("is_typing", False),
                    }, exclude_user=user_id)

                elif msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

                elif msg_type == "presence_request":
                    online = manager.get_online_users(workspace_id)
                    await websocket.send_text(json.dumps({
                        "type": "presence_list",
                        "online_users": online,
                    }))

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket, workspace_id, user_id)
        await manager.broadcast_to_workspace(workspace_id, {
            "type": "presence",
            "user_id": user_id,
            "user_name": user_name,
            "status": "offline",
        })
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, workspace_id, user_id)
