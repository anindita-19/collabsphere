from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import RedirectResponse
from bson import ObjectId
import os
import cloudinary
import cloudinary.uploader
from app.database import get_db
from app.utils.helpers import serialize_doc, utc_now, generate_unique_filename
from app.middleware.auth_middleware import get_current_user
from app.config import settings

router = APIRouter(prefix="/files", tags=["Files"])

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".pdf",
    ".txt", ".csv", ".md", ".markdown",
    ".doc", ".docx",
    ".xls", ".xlsx",
    ".zip", ".rar", ".7z",
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
    if not is_allowed_file(file.filename):
        ext = os.path.splitext(file.filename)[-1].lower() or "(no extension)"
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Determine resource type for Cloudinary
    ext = os.path.splitext(file.filename)[-1].lower()
    image_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    video_exts = {".mp4", ".mov", ".avi"}

    if ext in image_exts:
        resource_type = "image"
    elif ext in video_exts:
        resource_type = "video"
    else:
        resource_type = "raw"

    # Upload to Cloudinary
    try:
        upload_result = cloudinary.uploader.upload(
            content,
            resource_type=resource_type,
            public_id=f"collabsphere/{generate_unique_filename(file.filename).split('.')[0]}",
            original_filename=file.filename,
            use_filename=False,
        )
        file_url = upload_result["secure_url"]
        cloudinary_public_id = upload_result["public_id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    # Store metadata in MongoDB
    file_doc = {
        "original_name": file.filename,
        "stored_name": cloudinary_public_id,
        "content_type": file.content_type or "application/octet-stream",
        "size": len(content),
        "task_id": task_id,
        "project_id": project_id,
        "workspace_id": workspace_id,
        "uploaded_by": current_user["id"],
        "uploader_name": current_user["full_name"],
        "url": file_url,                          # permanent Cloudinary URL
        "cloudinary_public_id": cloudinary_public_id,
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

    # Redirect to Cloudinary URL (permanent, no disk dependency)
    url = file_doc.get("url")
    if not url:
        raise HTTPException(status_code=404, detail="File URL not available")

    return RedirectResponse(url=url)


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

    # Delete from Cloudinary
    public_id = file_doc.get("cloudinary_public_id")
    if public_id:
        try:
            ext = os.path.splitext(file_doc["original_name"])[-1].lower()
            image_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
            video_exts = {".mp4", ".mov", ".avi"}
            if ext in image_exts:
                resource_type = "image"
            elif ext in video_exts:
                resource_type = "video"
            else:
                resource_type = "raw"
            cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        except Exception:
            pass  # Don't fail the delete if Cloudinary cleanup fails

    await db.files.delete_one({"_id": ObjectId(file_id)})