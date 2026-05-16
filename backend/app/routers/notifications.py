import logging
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from app.database import get_db
from app.schemas.schemas import ChatMessage, NotificationMarkRead, NotificationPreferences
from app.utils.helpers import serialize_doc, utc_now
from app.middleware.auth_middleware import get_current_user
from app.websocket.manager import manager
from app.utils.email import send_notification_email  # ← your Gmail sender

logger = logging.getLogger(__name__)


# ── Notification email helper ─────────────────────────────────────────────────

async def _send_notif_email_safe(to_email: str, subject: str, body: str):
    """
    Thin wrapper around the Gmail sender that never crashes the request.
    All notification emails go through Gmail OAuth2 (same as invite emails).
    """
    try:
        await send_notification_email(to_email=to_email, subject=subject, body=body)
    except Exception as e:
        logger.warning(f"Notification email failed (non-fatal): {e}")


# ── Preference key → notification type mapping ────────────────────────────────

_PREF_KEY_FOR_TYPE = {
    "task_assigned":   "task_assignments",
    "task_completed":  "task_completions",
    "comment_added":   "comments",
    "workspace_invite": "workspace_updates",
    "project_updated": "workspace_updates",
}

DEFAULT_PREFS = {
    "task_assignments": True,
    "task_completions": True,
    "comments": True,
    "workspace_updates": True,
}


async def _get_user_prefs(db, user_id: str) -> dict:
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return DEFAULT_PREFS
    return {**DEFAULT_PREFS, **user.get("notification_preferences", {})}


# ── Core helper called from tasks.py / workspaces.py ─────────────────────────

async def create_notification(
    db,
    *,
    user_id: str,
    user_email: str,
    title: str,
    message: str,
    type: str,
    workspace_id: str = None,
    project_id: str = None,
    task_id: str = None,
):
    """
    1. Always saves an in-app notification to MongoDB.
    2. Always pushes it live via WebSocket.
    3. Sends email ONLY if the user has that preference enabled.
    """
    notif_doc = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type,
        "workspace_id": workspace_id,
        "project_id": project_id,
        "task_id": task_id,
        "read": False,
        "created_at": utc_now(),
    }
    result = await db.notifications.insert_one(notif_doc)
    notif_doc["_id"] = result.inserted_id
    serialized = serialize_doc(notif_doc)

    # Always push in-app via WebSocket
    if workspace_id:
        await manager.broadcast_to_workspace(workspace_id, {
            "type": "notification",
            "notification": serialized,
        })
    # Also send directly to user in case they're in a different workspace view
    await manager.send_to_user(user_id, {
        "type": "notification",
        "notification": serialized,
    })

    # Send email only if user preference allows it
    pref_key = _PREF_KEY_FOR_TYPE.get(type, "workspace_updates")
    prefs = await _get_user_prefs(db, user_id)
    if prefs.get(pref_key, True):
        await _send_notif_email_safe(
            to_email=user_email,
            subject=f"CollabSphere: {title}",
            body=message,
        )

    return serialized


# ── Notifications router ──────────────────────────────────────────────────────

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


@notif_router.get("/preferences")
async def get_notification_preferences(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    prefs = await _get_user_prefs(db, current_user["id"])
    return prefs


@notif_router.put("/preferences")
async def update_notification_preferences(
    data: NotificationPreferences,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    prefs = data.model_dump()
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"notification_preferences": prefs}},
    )
    return prefs


# ── Chat router ───────────────────────────────────────────────────────────────

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

    await manager.broadcast_to_workspace(workspace_id, {
        "type": "chat_message",
        "message": msg,
    })

    return msg


# ── Analytics router ──────────────────────────────────────────────────────────

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
    todo_tasks = await db.tasks.count_documents({
        "project_id": {"$in": project_ids}, "status": "todo"
    })
    in_progress_tasks = await db.tasks.count_documents({
        "project_id": {"$in": project_ids}, "status": "in_progress"
    })
    review_tasks = await db.tasks.count_documents({
        "project_id": {"$in": project_ids}, "status": "review"
    })
    completed_tasks = await db.tasks.count_documents({
        "project_id": {"$in": project_ids}, "status": "completed"
    })

    total_projects = len(project_ids)
    active_projects = await db.projects.count_documents({
        "workspace_id": workspace_id, "status": "active"
    })

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

    priority_data = []
    for priority in ["low", "medium", "high", "urgent"]:
        count = await db.tasks.count_documents({
            "project_id": {"$in": project_ids}, "priority": priority
        })
        priority_data.append({"priority": priority, "count": count})

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

    online_user_ids = manager.get_online_users(workspace_id)
    online_count = len([uid for uid in online_user_ids if uid in member_ids])

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress": in_progress_tasks,
        "task_counts": {
            "todo": todo_tasks,
            "in_progress": in_progress_tasks,
            "review": review_tasks,
            "completed": completed_tasks,
        },
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completion_rate": completion_rate,
        "member_count": len(ws.get("members", [])),
        "online_users": online_count,
        "member_stats": member_stats,
        "priority_data": priority_data,
        "project_stats": project_stats,
    }