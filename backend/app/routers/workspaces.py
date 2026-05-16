from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from typing import List
from datetime import timedelta
import secrets
import logging

from app.database import get_db
from app.schemas.schemas import WorkspaceCreate, WorkspaceUpdate, InviteMember, MemberRole
from app.utils.helpers import serialize_doc, utc_now
from app.middleware.auth_middleware import get_current_user
from app.websocket.manager import manager
from app.utils.email import send_workspace_invite_email
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

INVITE_EXPIRE_DAYS = 7


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

    # Also clean up any pending invites for this workspace
    await db.pending_invites.delete_many({"workspace_id": workspace_id})


# ── Invite (new flow: works for anyone, registered or not) ──────────────────

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

    # Only owner/admin can invite
    member = next((m for m in ws.get("members", []) if m["user_id"] == current_user["id"]), None)
    if not member or member["role"] not in [MemberRole.OWNER, MemberRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Check if already a member
    already_member = any(m["email"] == data.email for m in ws.get("members", []))
    if already_member:
        raise HTTPException(status_code=400, detail="This person is already a member of the workspace")

    # Check for an existing unexpired pending invite for this email+workspace
    existing_invite = await db.pending_invites.find_one({
        "workspace_id": workspace_id,
        "email": data.email,
        "used": False,
        "expires_at": {"$gt": utc_now()},
    })
    if existing_invite:
        raise HTTPException(
            status_code=400,
            detail="An invite has already been sent to this email. It expires in 7 days."
        )

    # Generate a secure random token
    token = secrets.token_urlsafe(32)
    expires_at = utc_now() + timedelta(days=INVITE_EXPIRE_DAYS)

    await db.pending_invites.insert_one({
        "token": token,
        "workspace_id": workspace_id,
        "workspace_name": ws["name"],
        "email": data.email,
        "role": data.role if isinstance(data.role, str) else data.role.value,
        "invited_by_id": current_user["id"],
        "invited_by_name": current_user["full_name"],
        "invited_by_email": current_user["email"],
        "used": False,
        "created_at": utc_now(),
        "expires_at": expires_at,
    })

    # Send the email — if it fails, we still return success but log the error
    # so the invite record exists and can be resent
    try:
        await send_workspace_invite_email(
            to_email=data.email,
            inviter_name=current_user["full_name"],
            workspace_name=ws["name"],
            role=data.role if isinstance(data.role, str) else data.role.value,
            invite_token=token,
        )
    except Exception as e:
        logger.error(f"Failed to send invite email to {data.email}: {e}")
        raise HTTPException(
            status_code=502,
            detail="Invite created but email delivery failed. Check your Resend configuration."
        )

    await log_activity(
        db, current_user["id"], workspace_id, "member_invited",
        f'{current_user["full_name"]} invited {data.email} to the workspace'
    )

    return {"message": f"Invitation sent to {data.email}"}


# ── Accept invite (called from magic link in email) ─────────────────────────

@router.get("/invite/accept")
async def accept_invite(
    token: str,
    db=Depends(get_db),
):
    """
    Public endpoint — no auth required.
    Validates the token and returns invite details so the frontend
    can show the accept screen (register or login then join).
    """
    invite = await db.pending_invites.find_one({"token": token, "used": False})

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already used")

    if invite["expires_at"] < utc_now():
        raise HTTPException(status_code=410, detail="This invite link has expired")

    return {
        "token": token,
        "workspace_name": invite["workspace_name"],
        "workspace_id": invite["workspace_id"],
        "email": invite["email"],
        "role": invite["role"],
        "invited_by": invite["invited_by_name"],
    }


@router.post("/invite/accept")
async def confirm_accept_invite(
    token: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Authenticated endpoint.
    After the user logs in / registers, call this to actually join the workspace.
    The logged-in user's email must match the invite email.
    """
    invite = await db.pending_invites.find_one({"token": token, "used": False})

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already used")

    if invite["expires_at"] < utc_now():
        raise HTTPException(status_code=410, detail="This invite link has expired")

    if current_user["email"].lower() != invite["email"].lower():
        raise HTTPException(
            status_code=403,
            detail=f"This invite was sent to {invite['email']}. Please log in with that account."
        )

    workspace_id = invite["workspace_id"]
    ws = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace no longer exists")

    # Check if already a member (e.g. added another way in the meantime)
    already_member = any(m["user_id"] == current_user["id"] for m in ws.get("members", []))
    if already_member:
        # Mark invite used and return the workspace anyway
        await db.pending_invites.update_one({"token": token}, {"$set": {"used": True}})
        return {"message": "You are already a member of this workspace", "workspace_id": workspace_id}

    new_member = {
        "user_id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "username": current_user["username"],
        "role": invite["role"],
        "avatar_color": current_user.get("avatar_color", "#6366f1"),
        "joined_at": utc_now(),
    }

    await db.workspaces.update_one(
        {"_id": ObjectId(workspace_id)},
        {"$push": {"members": new_member}},
    )

    # Mark invite as used
    await db.pending_invites.update_one(
        {"token": token},
        {"$set": {"used": True, "accepted_at": utc_now(), "accepted_by": current_user["id"]}}
    )

    # In-app notification for the inviter
    await db.notifications.insert_one({
        "user_id": invite["invited_by_id"],
        "type": "invite_accepted",
        "title": "Invite Accepted",
        "message": f'{current_user["full_name"]} accepted your invitation to "{ws["name"]}"',
        "resource_id": workspace_id,
        "resource_type": "workspace",
        "read": False,
        "created_at": utc_now(),
    })

    await log_activity(
        db, current_user["id"], workspace_id, "member_joined",
        f'{current_user["full_name"]} joined the workspace via invite'
    )

    # Broadcast presence update to workspace
    await manager.broadcast_to_workspace(workspace_id, {
        "type": "member_joined",
        "workspace_id": workspace_id,
        "user": {
            "id": current_user["id"],
            "full_name": current_user["full_name"],
            "email": current_user["email"],
        }
    })

    return {"message": "Successfully joined the workspace", "workspace_id": workspace_id}


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