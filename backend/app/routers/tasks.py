from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from typing import Optional, List
from app.database import get_db
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskMove, CommentCreate
from app.utils.helpers import serialize_doc, utc_now
from app.middleware.auth_middleware import get_current_user
from app.websocket.manager import manager
from app.routers.notifications import create_notification  # ← email + in-app

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["Tasks"])


async def check_project_access(project_id: str, user_id: str, db):
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    ws = await db.workspaces.find_one({"_id": ObjectId(project["workspace_id"])})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    member_ids = [m["user_id"] for m in ws.get("members", [])]
    if user_id not in member_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    return project


async def log_activity(db, user_id, workspace_id, project_id, action, description):
    await db.activity_logs.insert_one({
        "user_id": user_id,
        "workspace_id": workspace_id,
        "project_id": project_id,
        "action": action,
        "description": description,
        "created_at": utc_now(),
    })


async def get_user_email(db, user_id: str) -> Optional[str]:
    """Fetch a user's email for notification delivery. Returns None if not found."""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return user.get("email") if user else None


# ── Tasks ─────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_task(
    project_id: str,
    data: TaskCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    project = await check_project_access(project_id, current_user["id"], db)

    task_doc = {
        "project_id": project_id,
        "workspace_id": project["workspace_id"],
        "title": data.title,
        "description": data.description or "",
        "status": data.status,
        "priority": data.priority,
        "assignees": data.assignees,
        "due_date": data.due_date,
        "tags": data.tags,
        "position": data.position,
        "created_by": current_user["id"],
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }

    result = await db.tasks.insert_one(task_doc)
    task_doc["_id"] = result.inserted_id
    task = serialize_doc(task_doc)

    # ── Notify assignees (in-app + email) ─────────────────────────────────────
    for assignee_id in data.assignees:
        if assignee_id == current_user["id"]:
            continue
        email = await get_user_email(db, assignee_id)
        if email:
            await create_notification(
                db,
                user_id=assignee_id,
                user_email=email,
                title="Task Assigned",
                message=f'{current_user["full_name"]} assigned you to "{data.title}"',
                type="task_assigned",
                workspace_id=project["workspace_id"],
                project_id=project_id,
                task_id=str(result.inserted_id),
            )

    await log_activity(db, current_user["id"], project["workspace_id"], project_id,
                       "task_created", f'{current_user["full_name"]} created task "{data.title}"')

    await manager.broadcast_to_workspace(project["workspace_id"], {
        "type": "task_created",
        "project_id": project_id,
        "task": task,
        "created_by": current_user["full_name"],
    })

    return task


@router.get("")
async def get_tasks(
    project_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee: Optional[str] = None,
    search: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    project = await check_project_access(project_id, current_user["id"], db)

    query = {"project_id": project_id}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assignee:
        query["assignees"] = assignee
    if search:
        query["title"] = {"$regex": search, "$options": "i"}

    cursor = db.tasks.find(query).sort([("status", 1), ("position", 1), ("created_at", -1)])

    tasks = []
    async for task in cursor:
        t = serialize_doc(task)
        assignee_details = []
        for uid in task.get("assignees", []):
            user = await db.users.find_one({"_id": ObjectId(uid)})
            if user:
                assignee_details.append({
                    "id": str(user["_id"]),
                    "full_name": user["full_name"],
                    "username": user["username"],
                    "avatar_color": user.get("avatar_color", "#6366f1"),
                })
        t["assignee_details"] = assignee_details
        t["comment_count"] = await db.comments.count_documents({"task_id": str(task["_id"])})
        t["file_count"] = await db.files.count_documents({"task_id": str(task["_id"])})
        tasks.append(t)
    return tasks


@router.get("/{task_id}")
async def get_task(
    project_id: str,
    task_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await check_project_access(project_id, current_user["id"], db)

    task = await db.tasks.find_one({"_id": ObjectId(task_id), "project_id": project_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    t = serialize_doc(task)
    assignee_details = []
    for uid in task.get("assignees", []):
        user = await db.users.find_one({"_id": ObjectId(uid)})
        if user:
            assignee_details.append({
                "id": str(user["_id"]),
                "full_name": user["full_name"],
                "username": user["username"],
                "avatar_color": user.get("avatar_color", "#6366f1"),
            })
    t["assignee_details"] = assignee_details
    return t


@router.put("/{task_id}")
async def update_task(
    project_id: str,
    task_id: str,
    data: TaskUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    project = await check_project_access(project_id, current_user["id"], db)

    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = utc_now()

    # ── Notify newly added assignees (in-app + email) ─────────────────────────
    if data.assignees:
        old_assignees = set(task.get("assignees", []))
        new_assignees = set(data.assignees)
        added = new_assignees - old_assignees
        for uid in added:
            if uid == current_user["id"]:
                continue
            email = await get_user_email(db, uid)
            if email:
                await create_notification(
                    db,
                    user_id=uid,
                    user_email=email,
                    title="Task Assigned",
                    message=f'{current_user["full_name"]} assigned you to "{task["title"]}"',
                    type="task_assigned",
                    workspace_id=project["workspace_id"],
                    project_id=project_id,
                    task_id=task_id,
                )

    await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_data})
    updated = await db.tasks.find_one({"_id": ObjectId(task_id)})
    t = serialize_doc(updated)

    await log_activity(db, current_user["id"], project["workspace_id"], project_id,
                       "task_updated", f'{current_user["full_name"]} updated task "{task["title"]}"')

    await manager.broadcast_to_workspace(project["workspace_id"], {
        "type": "task_updated",
        "project_id": project_id,
        "task_id": task_id,
        "task": t,
        "updated_by": current_user["full_name"],
    })

    return t


@router.patch("/{task_id}/move")
async def move_task(
    project_id: str,
    task_id: str,
    data: TaskMove,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    project = await check_project_access(project_id, current_user["id"], db)

    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.get("status")
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": data.status, "position": data.position, "updated_at": utc_now()}},
    )

    if old_status != data.status:
        await log_activity(db, current_user["id"], project["workspace_id"], project_id,
                           "task_moved",
                           f'{current_user["full_name"]} moved "{task["title"]}" to {data.status}')

        # ── Notify task creator when completed (in-app + email) ───────────────
        if data.status == "completed" and task["created_by"] != current_user["id"]:
            email = await get_user_email(db, task["created_by"])
            if email:
                await create_notification(
                    db,
                    user_id=task["created_by"],
                    user_email=email,
                    title="Task Completed",
                    message=f'{current_user["full_name"]} marked "{task["title"]}" as completed',
                    type="task_completed",
                    workspace_id=project["workspace_id"],
                    project_id=project_id,
                    task_id=task_id,
                )

    await manager.broadcast_to_workspace(project["workspace_id"], {
        "type": "task_moved",
        "project_id": project_id,
        "task_id": task_id,
        "status": data.status,
        "position": data.position,
        "moved_by": current_user["full_name"],
    })

    updated = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return serialize_doc(updated)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    project_id: str,
    task_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    project = await check_project_access(project_id, current_user["id"], db)

    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.tasks.delete_one({"_id": ObjectId(task_id)})
    await db.comments.delete_many({"task_id": task_id})
    await db.files.delete_many({"task_id": task_id})

    await log_activity(db, current_user["id"], project["workspace_id"], project_id,
                       "task_deleted", f'{current_user["full_name"]} deleted task "{task["title"]}"')

    await manager.broadcast_to_workspace(project["workspace_id"], {
        "type": "task_deleted",
        "project_id": project_id,
        "task_id": task_id,
        "deleted_by": current_user["full_name"],
    })


# ── Comments ──────────────────────────────────────────────────────────────────

@router.get("/{task_id}/comments")
async def get_comments(
    project_id: str,
    task_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await check_project_access(project_id, current_user["id"], db)

    cursor = db.comments.find({"task_id": task_id}).sort("created_at", 1)
    comments = []
    async for comment in cursor:
        c = serialize_doc(comment)
        user = await db.users.find_one({"_id": ObjectId(comment["user_id"])})
        if user:
            c["author"] = {
                "id": str(user["_id"]),
                "full_name": user["full_name"],
                "username": user["username"],
                "avatar_color": user.get("avatar_color", "#6366f1"),
            }
        comments.append(c)
    return comments


@router.post("/{task_id}/comments", status_code=201)
async def add_comment(
    project_id: str,
    task_id: str,
    data: CommentCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    project = await check_project_access(project_id, current_user["id"], db)

    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment_doc = {
        "task_id": task_id,
        "project_id": project_id,
        "user_id": current_user["id"],
        "content": data.content,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    result = await db.comments.insert_one(comment_doc)
    comment_doc["_id"] = result.inserted_id
    c = serialize_doc(comment_doc)
    c["author"] = {
        "id": current_user["id"],
        "full_name": current_user["full_name"],
        "username": current_user["username"],
        "avatar_color": current_user.get("avatar_color", "#6366f1"),
    }

    # ── Notify all assignees (in-app + email) ─────────────────────────────────
    # Deduplicate: also notify creator if not an assignee, skip commenter
    recipients = set(task.get("assignees", []))
    if task["created_by"] != current_user["id"]:
        recipients.add(task["created_by"])
    recipients.discard(current_user["id"])

    for recipient_id in recipients:
        email = await get_user_email(db, recipient_id)
        if email:
            await create_notification(
                db,
                user_id=recipient_id,
                user_email=email,
                title="New Comment",
                message=f'{current_user["full_name"]} commented on "{task["title"]}": "{data.content[:80]}{"..." if len(data.content) > 80 else ""}"',
                type="comment_added",
                workspace_id=project["workspace_id"],
                project_id=project_id,
                task_id=task_id,
            )

    await manager.broadcast_to_workspace(project["workspace_id"], {
        "type": "comment_added",
        "task_id": task_id,
        "project_id": project_id,
        "comment": c,
    })

    return c


@router.delete("/{task_id}/comments/{comment_id}", status_code=204)
async def delete_comment(
    project_id: str,
    task_id: str,
    comment_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await check_project_access(project_id, current_user["id"], db)

    comment = await db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Can only delete your own comments")

    await db.comments.delete_one({"_id": ObjectId(comment_id)})