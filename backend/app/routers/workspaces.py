from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from typing import List
from app.database import get_db
from app.schemas.schemas import WorkspaceCreate, WorkspaceUpdate, InviteMember, MemberRole
from app.utils.helpers import serialize_doc, utc_now
from app.middleware.auth_middleware import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


async def log_activity(db, user_id: str, workspace_id: str, action: str, description: str, project_id: str = None):
    await db.activity_logs.insert_one({
        "user_id": user_id,
        "workspace_id": workspace_id,
        "project_id": project_id,
        "action": action,
        "description": description,
        "created_at": utc_now(),
    })


@router.post("", status_code=201)
async def create_workspace(
    data: WorkspaceCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    workspace_doc = {
        "name": data.name,
        "description": data.description or "",
        "color": data.color,
        "icon": data.icon,
        "owner_id": current_user["id"],
        "members": [
            {
                "user_id": current_user["id"],
                "email": current_user["email"],
                "full_name": current_user["full_name"],
                "username": current_user["username"],
                "role": MemberRole.OWNER,
                "avatar_color": current_user.get("avatar_color", "#6366f1"),
                "joined_at": utc_now(),
            }
        ],
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    result = await db.workspaces.insert_one(workspace_doc)
    workspace_doc["_id"] = result.inserted_id

    await log_activity(db, current_user["id"], str(result.inserted_id), "workspace_created",
                       f'Workspace "{data.name}" created')

    return serialize_doc(workspace_doc)


@router.get("")
async def get_my_workspaces(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = db.workspaces.find(
        {"members.user_id": current_user["id"]}
    ).sort("created_at", -1)

    workspaces = []
    async for ws in cursor:
        w = serialize_doc(ws)
        # Attach project count
        project_count = await db.projects.count_documents({"workspace_id": str(ws["_id"])})
        w["project_count"] = project_count
        workspaces.append(w)
    return workspaces


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ws = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check membership
    member_ids = [m["user_id"] for m in ws.get("members", [])]
    if current_user["id"] not in member_ids:
        raise HTTPException(status_code=403, detail="Access denied")

    w = serialize_doc(ws)
    online_users = manager.get_online_users(workspace_id)
    w["online_users"] = online_users
    return w


@router.put("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    data: WorkspaceUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ws = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Only owner or admin
    member = next((m for m in ws.get("members", []) if m["user_id"] == current_user["id"]), None)
    if not member or member["role"] not in [MemberRole.OWNER, MemberRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = utc_now()

    await db.workspaces.update_one({"_id": ObjectId(workspace_id)}, {"$set": update_data})
    updated = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})

    await log_activity(db, current_user["id"], workspace_id, "workspace_updated",
                       f'Workspace "{ws["name"]}" updated')

    await manager.broadcast_to_workspace(workspace_id, {
        "type": "workspace_updated",
        "workspace_id": workspace_id,
    })

    return serialize_doc(updated)


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(
    workspace_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ws = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if ws["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can delete the workspace")

    await db.workspaces.delete_one({"_id": ObjectId(workspace_id)})
    # Cascade delete
    project_ids = []
    async for p in db.projects.find({"workspace_id": workspace_id}):
        project_ids.append(str(p["_id"]))

    await db.projects.delete_many({"workspace_id": workspace_id})
    if project_ids:
        await db.tasks.delete_many({"project_id": {"$in": project_ids}})
        await db.documents.delete_many({"project_id": {"$in": project_ids}})
        await db.files.delete_many({"project_id": {"$in": project_ids}})

    await db.chat_messages.delete_many({"workspace_id": workspace_id})
    await db.activity_logs.delete_many({"workspace_id": workspace_id})


@router.post("/{workspace_id}/invite")
async def invite_member(
    workspace_id: str,
    data: InviteMember,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ws = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    member = next((m for m in ws.get("members", []) if m["user_id"] == current_user["id"]), None)
    if not member or member["role"] not in [MemberRole.OWNER, MemberRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Find user by email
    invitee = await db.users.find_one({"email": data.email})
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a member
    existing = [m for m in ws.get("members", []) if m["user_id"] == str(invitee["_id"])]
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    new_member = {
        "user_id": str(invitee["_id"]),
        "email": invitee["email"],
        "full_name": invitee["full_name"],
        "username": invitee["username"],
        "role": data.role,
        "avatar_color": invitee.get("avatar_color", "#6366f1"),
        "joined_at": utc_now(),
    }

    await db.workspaces.update_one(
        {"_id": ObjectId(workspace_id)},
        {"$push": {"members": new_member}},
    )

    # Create notification for invitee
    await db.notifications.insert_one({
        "user_id": str(invitee["_id"]),
        "type": "workspace_invite",
        "title": "Workspace Invitation",
        "message": f'{current_user["full_name"]} added you to "{ws["name"]}"',
        "resource_id": workspace_id,
        "resource_type": "workspace",
        "read": False,
        "created_at": utc_now(),
    })

    await log_activity(db, current_user["id"], workspace_id, "member_invited",
                       f'{current_user["full_name"]} invited {invitee["full_name"]} to the workspace')

    # Notify via WebSocket
    await manager.send_to_user(str(invitee["_id"]), {
        "type": "notification",
        "message": f'You were added to "{ws["name"]}"',
    })

    return {"message": "Member invited successfully"}


@router.delete("/{workspace_id}/members/{user_id}")
async def remove_member(
    workspace_id: str,
    user_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ws = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    member = next((m for m in ws.get("members", []) if m["user_id"] == current_user["id"]), None)
    is_owner = ws["owner_id"] == current_user["id"]
    is_self = user_id == current_user["id"]

    if not is_owner and not is_self:
        if not member or member["role"] != MemberRole.ADMIN:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Cannot remove the owner
    if user_id == ws["owner_id"] and not is_self:
        raise HTTPException(status_code=400, detail="Cannot remove the workspace owner")

    await db.workspaces.update_one(
        {"_id": ObjectId(workspace_id)},
        {"$pull": {"members": {"user_id": user_id}}},
    )

    return {"message": "Member removed successfully"}


@router.get("/{workspace_id}/activity")
async def get_workspace_activity(
    workspace_id: str,
    limit: int = 50,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ws = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    member_ids = [m["user_id"] for m in ws.get("members", [])]
    if current_user["id"] not in member_ids:
        raise HTTPException(status_code=403, detail="Access denied")

    cursor = db.activity_logs.find(
        {"workspace_id": workspace_id}
    ).sort("created_at", -1).limit(limit)

    logs = []
    async for log in cursor:
        logs.append(serialize_doc(log))
    return logs
