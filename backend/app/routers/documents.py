from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from app.database import get_db
from app.schemas.schemas import DocumentCreate, DocumentUpdate
from app.utils.helpers import serialize_doc, utc_now
from app.middleware.auth_middleware import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["Documents"])


async def check_project_access(project_id: str, user_id: str, db):
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    ws = await db.workspaces.find_one({"_id": ObjectId(project["workspace_id"])})
    member_ids = [m["user_id"] for m in ws.get("members", [])]
    if user_id not in member_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    return project


@router.post("", status_code=201)
async def create_document(
    project_id: str,
    data: DocumentCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    project = await check_project_access(project_id, current_user["id"], db)

    doc = {
        "project_id": project_id,
        "workspace_id": project["workspace_id"],
        "title": data.title,
        "content": data.content or "",
        "created_by": current_user["id"],
        "author_name": current_user["full_name"],
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    result = await db.documents.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.get("")
async def get_documents(
    project_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await check_project_access(project_id, current_user["id"], db)
    cursor = db.documents.find({"project_id": project_id}).sort("updated_at", -1)
    docs = []
    async for d in cursor:
        docs.append(serialize_doc(d))
    return docs


@router.get("/{doc_id}")
async def get_document(
    project_id: str,
    doc_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await check_project_access(project_id, current_user["id"], db)
    doc = await db.documents.find_one({"_id": ObjectId(doc_id), "project_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize_doc(doc)


@router.put("/{doc_id}")
async def update_document(
    project_id: str,
    doc_id: str,
    data: DocumentUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    project = await check_project_access(project_id, current_user["id"], db)
    doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = utc_now()
    update_data["last_edited_by"] = current_user["id"]
    update_data["last_editor_name"] = current_user["full_name"]

    await db.documents.update_one({"_id": ObjectId(doc_id)}, {"$set": update_data})
    updated = await db.documents.find_one({"_id": ObjectId(doc_id)})

    # Broadcast live update
    await manager.broadcast_to_workspace(project["workspace_id"], {
        "type": "document_updated",
        "project_id": project_id,
        "doc_id": doc_id,
        "updated_by": current_user["full_name"],
    })

    return serialize_doc(updated)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    project_id: str,
    doc_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    await check_project_access(project_id, current_user["id"], db)
    doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the author can delete this document")
    await db.documents.delete_one({"_id": ObjectId(doc_id)})
