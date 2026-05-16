from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────────────────

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ProjectStatus(str, Enum):
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class MemberRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


# ── Auth ────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    full_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_color: Optional[str] = None
    timezone: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


# ── Workspace ───────────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"
    icon: Optional[str] = "🚀"


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class InviteMember(BaseModel):
    email: EmailStr
    role: MemberRole = MemberRole.MEMBER


# ── Project ─────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    color: Optional[str] = "#6366f1"
    due_date: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    color: Optional[str] = None
    due_date: Optional[datetime] = None


# ── Task ─────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    assignees: List[str] = []
    due_date: Optional[datetime] = None
    tags: List[str] = []
    position: Optional[int] = 0


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignees: Optional[List[str]] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    position: Optional[int] = None


class TaskMove(BaseModel):
    status: TaskStatus
    position: int


# ── Comment ──────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


# ── Document ─────────────────────────────────────────────────────────────────

class DocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: Optional[str] = ""


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


# ── Notification ─────────────────────────────────────────────────────────────

class NotificationMarkRead(BaseModel):
    notification_ids: List[str] = []


class NotificationPreferences(BaseModel):
    task_assignments: bool = True
    task_completions: bool = True
    comments: bool = True
    workspace_updates: bool = True