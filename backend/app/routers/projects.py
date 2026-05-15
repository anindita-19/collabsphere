from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from app.database import get_db
from app.schemas.schemas import ProjectCreate, ProjectUpdate
from app.utils.helpers import serialize_doc, utc_now
from app.middleware.auth_middleware import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/workspaces/{workspace_id}/projects", tags=["Projects"])


async def check_workspace_access(workspace_id: str, user_id: str, db):
    ws = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    member_ids = [m["user_id"] for m in ws.get("members", [])]
    if user_id not in member_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    return ws


async def log_activity(db, user_id, workspace_id, project_id, action, description):
    await db.activity_logs.insert_one({
        "user_id": user_id,
        "workspace_id": workspace_id,
        "project_id": project_id,
        "action": action,
        "description": description,
        "created_at": utc_now(),
    })


@router.post("", status_code=201)
async def create_project(
    workspace_id: str,
    data: ProjectCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user["id"], db)

    project_doc = {
        "workspace_id": workspace_id,
        "name": data.name,
        "description": data.description or "",
        "status": data.status,
        "color": data.color,
        "due_date": data.due_date,
        "created_by": current_user["id"],
        "members": [current_user["id"]],
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    result = await db.projects.insert_one(project_doc)
    project_doc["_id"] = result.inserted_id

    await log_activity(db, current_user["id"], workspace_id, str(result.inserted_id),
                       "project_created", f'Project "{data.name}" created')

    await manager.broadcast_to_workspace(workspace_id, {
        "type": "project_created",
        "project_id": str(result.inserted_id),
        "project_name": data.name,
        "created_by": current_user["full_name"],
    })

    return serialize_doc(project_doc)


@router.get("")
async def get_projects(
    workspace_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user["id"], db)

    cursor = db.projects.find({"workspace_id": workspace_id}).sort("created_at", -1)

    projects = []
    async for project in cursor:
        p = serialize_doc(project)
        # Add task stats
        task_counts = {}
        for status in ["todo", "in_progress", "review", "completed"]:
            count = await db.tasks.count_documents({
                "project_id": str(project["_id"]),
                "status": status,
            })
            task_counts[status] = count
        p["task_counts"] = task_counts
        p["total_tasks"] = sum(task_counts.values())
        projects.append(p)
    return projects


@router.get("/{project_id}")
async def get_project(
    workspace_id: str,
    project_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user["id"], db)

    project = await db.projects.find_one({
        "_id": ObjectId(project_id),
        "workspace_id": workspace_id,
    })
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    p = serialize_doc(project)
    task_counts = {}
    for status in ["todo", "in_progress", "review", "completed"]:
        count = await db.tasks.count_documents({
            "project_id": project_id,
            "status": status,
        })
        task_counts[status] = count
    p["task_counts"] = task_counts
    p["total_tasks"] = sum(task_counts.values())
    return p


@router.put("/{project_id}")
async def update_project(
    workspace_id: str,
    project_id: str,
    data: ProjectUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user["id"], db)

    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = utc_now()

    await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": update_data})
    updated = await db.projects.find_one({"_id": ObjectId(project_id)})

    await log_activity(db, current_user["id"], workspace_id, project_id,
                       "project_updated", f'Project "{project["name"]}" updated')

    await manager.broadcast_to_workspace(workspace_id, {
        "type": "project_updated",
        "project_id": project_id,
    })

    return serialize_doc(updated)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    workspace_id: str,
    project_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ws = await check_workspace_access(workspace_id, current_user["id"], db)

    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    owner_id = ws["owner_id"]
    if project["created_by"] != current_user["id"] and owner_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    await db.projects.delete_one({"_id": ObjectId(project_id)})
    await db.tasks.delete_many({"project_id": project_id})
    await db.documents.delete_many({"project_id": project_id})
    await db.files.delete_many({"project_id": project_id})

    await manager.broadcast_to_workspace(workspace_id, {
        "type": "project_deleted",
        "project_id": project_id,
    })


@router.get("/{project_id}/analytics")
async def get_project_analytics(
    workspace_id: str,
    project_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user["id"], db)

    # Task status breakdown
    task_counts = {}
    for status in ["todo", "in_progress", "review", "completed"]:
        task_counts[status] = await db.tasks.count_documents({
            "project_id": project_id, "status": status
        })

    # Priority breakdown
    priority_counts = {}
    for priority in ["low", "medium", "high", "urgent"]:
        priority_counts[priority] = await db.tasks.count_documents({
            "project_id": project_id, "priority": priority
        })

    # Assignee task distribution
    pipeline = [
        {"$match": {"project_id": project_id}},
        {"$unwind": "$assignees"},
        {"$group": {"_id": "$assignees", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    assignee_stats = []
    async for stat in db.tasks.aggregate(pipeline):
        user = await db.users.find_one({"_id": ObjectId(stat["_id"])})
        if user:
            assignee_stats.append({
                "user_id": stat["_id"],
                "full_name": user["full_name"],
                "username": user["username"],
                "avatar_color": user.get("avatar_color", "#6366f1"),
                "task_count": stat["count"],
            })

    # Recent activity
    logs_cursor = db.activity_logs.find(
        {"project_id": project_id}
    ).sort("created_at", -1).limit(20)

    recent_activity = []
    async for log in logs_cursor:
        recent_activity.append(serialize_doc(log))

    total_tasks = sum(task_counts.values())
    completion_rate = round(task_counts.get("completed", 0) / max(total_tasks, 1) * 100, 1)

    return {
        "task_counts": task_counts,
        "priority_counts": priority_counts,
        "assignee_stats": assignee_stats,
        "recent_activity": recent_activity,
        "total_tasks": total_tasks,
        "completion_rate": completion_rate,
    }
