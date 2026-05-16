from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from bson import ObjectId
import aiofiles
import os
from app.database import get_db
from app.utils.helpers import serialize_doc, utc_now, generate_unique_filename
from app.middleware.auth_middleware import get_current_user
from app.config import settings

router = APIRouter(prefix="/files", tags=["Files"])

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".pdf",
    ".txt", ".csv", ".md", ".markdown",
    ".doc", ".docx",
    ".xls", ".xlsx",
    ".zip", ".rar", ".7z",
    ".mp4", ".mov", ".avi",
    ".mp3", ".wav",
    ".ppt", ".pptx",
    ".json", ".xml", ".yaml", ".yml",
    ".py", ".js", ".ts", ".html", ".css",
}


def is_allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[-1].lower()
    return ext in ALLOWED_EXTENSIONS


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    task_id: str = None,
    project_id: str = None,
    workspace_id: str = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    # Validate by extension instead of MIME type — browsers report MIME inconsistently
    if not is_allowed_file(file.filename):
        ext = os.path.splitext(file.filename)[-1].lower() or "(no extension)"
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")

    # Read file content
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Generate unique filename
    unique_name = generate_unique_filename(file.filename)
    upload_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    async with aiofiles.open(upload_path, "wb") as f:
        await f.write(content)

    # Store metadata in DB
    file_doc = {
        "original_name": file.filename,
        "stored_name": unique_name,
        "content_type": file.content_type or "application/octet-stream",
        "size": len(content),
        "task_id": task_id,
        "project_id": project_id,
        "workspace_id": workspace_id,
        "uploaded_by": current_user["id"],
        "uploader_name": current_user["full_name"],
        "path": upload_path,
        "created_at": utc_now(),
    }

    result = await db.files.insert_one(file_doc)
    file_doc["_id"] = result.inserted_id

    return serialize_doc(file_doc)


@router.get("/task/{task_id}")
async def get_task_files(
    task_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = db.files.find({"task_id": task_id}).sort("created_at", -1)
    files = []
    async for f in cursor:
        files.append(serialize_doc(f))
    return files


@router.get("/project/{project_id}")
async def get_project_files(
    project_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = db.files.find({"project_id": project_id}).sort("created_at", -1)
    files = []
    async for f in cursor:
        files.append(serialize_doc(f))
    return files


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    file_doc = await db.files.find_one({"_id": ObjectId(file_id)})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    if not os.path.exists(file_doc["path"]):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=file_doc["path"],
        filename=file_doc["original_name"],
        media_type=file_doc["content_type"],
    )


@router.delete("/{file_id}", status_code=204)
async def delete_file(
    file_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    file_doc = await db.files.find_one({"_id": ObjectId(file_id)})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    if file_doc["uploaded_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete others' files")

    # Remove from disk
    if os.path.exists(file_doc["path"]):
        os.remove(file_doc["path"])

    await db.files.delete_one({"_id": ObjectId(file_id)})