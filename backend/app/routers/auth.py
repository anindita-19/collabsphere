from fastapi import APIRouter, HTTPException, Depends, status
from datetime import timedelta
from bson import ObjectId
from app.database import get_db
from app.schemas.schemas import UserRegister, UserLogin, TokenResponse, UserUpdate, PasswordChange
from app.utils.auth import get_password_hash, verify_password, create_access_token
from app.utils.helpers import serialize_doc, utc_now
from app.middleware.auth_middleware import get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=dict, status_code=201)
async def register(data: UserRegister, db=Depends(get_db)):
    # Check email uniqueness
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check username uniqueness
    if await db.users.find_one({"username": data.username}):
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_password = get_password_hash(data.password)
    colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]
    import random
    avatar_color = random.choice(colors)

    user_doc = {
        "email": data.email,
        "username": data.username,
        "full_name": data.full_name,
        "hashed_password": hashed_password,
        "bio": "",
        "avatar_color": avatar_color,
        "timezone": "UTC",
        "is_active": True,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }

    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token(
        {"sub": user_id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    user_doc["_id"] = result.inserted_id
    user = serialize_doc(user_doc)
    user.pop("hashed_password", None)

    # Log activity
    await db.activity_logs.insert_one({
        "user_id": user_id,
        "action": "user_registered",
        "resource_type": "user",
        "resource_id": user_id,
        "description": f"{data.full_name} joined CollabSphere",
        "created_at": utc_now(),
    })

    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=dict)
async def login(data: UserLogin, db=Depends(get_db)):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Account is deactivated")

    token = create_access_token(
        {"sub": str(user["_id"])},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    user_data = serialize_doc(user)
    user_data.pop("hashed_password", None)

    return {"access_token": token, "token_type": "bearer", "user": user_data}


@router.get("/me", response_model=dict)
async def get_me(current_user=Depends(get_current_user)):
    user = dict(current_user)
    user.pop("hashed_password", None)
    return user


@router.put("/me", response_model=dict)
async def update_profile(
    data: UserUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = utc_now()

    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": update_data},
    )

    updated = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    user_data = serialize_doc(updated)
    user_data.pop("hashed_password", None)
    return user_data


@router.put("/me/password")
async def change_password(
    data: PasswordChange,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    if not verify_password(data.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_hash = get_password_hash(data.new_password)
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"hashed_password": new_hash, "updated_at": utc_now()}},
    )
    return {"message": "Password updated successfully"}


@router.get("/users/search")
async def search_users(
    q: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if len(q) < 2:
        return []

    cursor = db.users.find(
        {
            "$or": [
                {"email": {"$regex": q, "$options": "i"}},
                {"username": {"$regex": q, "$options": "i"}},
                {"full_name": {"$regex": q, "$options": "i"}},
            ]
        }
    ).limit(10)

    users = []
    async for user in cursor:
        u = serialize_doc(user)
        u.pop("hashed_password", None)
        users.append(u)
    return users
