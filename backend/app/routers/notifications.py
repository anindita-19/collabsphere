from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from app.database import get_db
from app.schemas.schemas import ChatMessage, NotificationMarkRead
from app.utils.helpers import serialize_doc, utc_now
from app.middleware.auth_middleware import get_current_user
from app.websocket.manager import manager

# ── Notifications ─────────────────────────────────────────────────────────────

notif_router = APIRouter(prefix="/notifications", tags=["Notifications"])


@notif_router.get("")
async def get_notifications(
    limit: int = 50,
    unread_only: bool = False,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    query = {"user_id": current_user["id"]}
    if unread_only:
        query["read"] = False

    cursor = db.notifications.find(query).sort("created_at", -1).limit(limit)
    notifications = []
    async for n in cursor:
        notifications.append(serialize_doc(n))
    return notifications


@notif_router.get("/unread-count")
async def get_unread_count(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    count = await db.notifications.count_documents({
        "user_id": current_user["id"],
        "read": False,
    })
    return {"count": count}


@notif_router.put("/mark-read")
async def mark_notifications_read(
    data: NotificationMarkRead,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if data.notification_ids:
        object_ids = [ObjectId(nid) for nid in data.notification_ids]
        await db.notifications.update_many(
            {"_id": {"$in": object_ids}, "user_id": current_user["id"]},
            {"$set": {"read": True}},
        )
    else:
        # Mark all as read
        await db.notifications.update_many(
            {"user_id": current_user["id"]},
            {"$set": {"read": True}},
        )
    return {"message": "Notifications marked as read"}


@notif_router.delete("/{notif_id}", status_code=204)
async def delete_notification(
    notif_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await db.notifications.delete_one({
        "_id": ObjectId(notif_id),
        "user_id": current_user["id"],
    })


# ── Chat ─────────────────────────────────────────────────────────────────────

chat_router = APIRouter(prefix="/workspaces/{workspace_id}/chat", tags=["Chat"])


@chat_router.get("")
async def get_chat_messages(
    workspace_id: str,
    limit: int = 100,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ws = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    member_ids = [m["user_id"] for m in ws.get("members", [])]
    if current_user["id"] not in member_ids:
        raise HTTPException(status_code=403, detail="Access denied")

    cursor = db.chat_messages.find({"workspace_id": workspace_id}).sort("created_at", -1).limit(limit)
    messages = []
    async for msg in cursor:
        messages.append(serialize_doc(msg))
    return list(reversed(messages))


@chat_router.post("", status_code=201)
async def send_chat_message(
    workspace_id: str,
    data: ChatMessage,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ws = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    member_ids = [m["user_id"] for m in ws.get("members", [])]
    if current_user["id"] not in member_ids:
        raise HTTPException(status_code=403, detail="Access denied")

    msg_doc = {
        "workspace_id": workspace_id,
        "user_id": current_user["id"],
        "author_name": current_user["full_name"],
        "author_username": current_user["username"],
        "avatar_color": current_user.get("avatar_color", "#6366f1"),
        "content": data.content,
        "created_at": utc_now(),
    }

    result = await db.chat_messages.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id
    msg = serialize_doc(msg_doc)

    # Broadcast via WebSocket
    await manager.broadcast_to_workspace(workspace_id, {
        "type": "chat_message",
        "message": msg,
    })

    return msg


# ── Analytics (global) ────────────────────────────────────────────────────────

analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])


@analytics_router.get("/workspace/{workspace_id}")
async def get_workspace_analytics(
    workspace_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ws = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    member_ids = [m["user_id"] for m in ws.get("members", [])]
    if current_user["id"] not in member_ids:
        raise HTTPException(status_code=403, detail="Access denied")

    project_ids = []
    async for p in db.projects.find({"workspace_id": workspace_id}):
        project_ids.append(str(p["_id"]))

    total_tasks = await db.tasks.count_documents({"project_id": {"$in": project_ids}})
    completed_tasks = await db.tasks.count_documents({
        "project_id": {"$in": project_ids}, "status": "completed"
    })
    in_progress = await db.tasks.count_documents({
        "project_id": {"$in": project_ids}, "status": "in_progress"
    })
    total_projects = len(project_ids)
    active_projects = await db.projects.count_documents({
        "workspace_id": workspace_id, "status": "active"
    })

    # Member stats
    member_stats = []
    for m in ws.get("members", []):
        task_count = await db.tasks.count_documents({
            "project_id": {"$in": project_ids},
            "assignees": m["user_id"],
        })
        completed = await db.tasks.count_documents({
            "project_id": {"$in": project_ids},
            "assignees": m["user_id"],
            "status": "completed",
        })
        member_stats.append({
            "user_id": m["user_id"],
            "full_name": m["full_name"],
            "avatar_color": m.get("avatar_color", "#6366f1"),
            "task_count": task_count,
            "completed": completed,
        })

    # Task by priority
    priority_data = []
    for priority in ["low", "medium", "high", "urgent"]:
        count = await db.tasks.count_documents({
            "project_id": {"$in": project_ids}, "priority": priority
        })
        priority_data.append({"priority": priority, "count": count})

    # Project stats for chart
    project_stats = []
    async for p in db.projects.find({"workspace_id": workspace_id}):
        pid = str(p["_id"])
        total = await db.tasks.count_documents({"project_id": pid})
        done = await db.tasks.count_documents({"project_id": pid, "status": "completed"})
        project_stats.append({
            "name": p["name"][:15],
            "total": total,
            "completed": done,
            "rate": round(done / max(total, 1) * 100),
        })

    completion_rate = round(completed_tasks / max(total_tasks, 1) * 100, 1)

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress": in_progress,
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completion_rate": completion_rate,
        "member_count": len(ws.get("members", [])),
        "online_users": len(manager.get_online_users(workspace_id)),
        "member_stats": member_stats,
        "priority_data": priority_data,
        "project_stats": project_stats,
    }
