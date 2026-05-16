from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from app.config import settings
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.DATABASE_NAME]
        # Verify connection
        await client.admin.command("ping")
        logger.info(f"Connected to MongoDB: {settings.DATABASE_NAME}")
        await create_indexes()
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def disconnect_db():
    global client
    if client:
        client.close()
        logger.info("Disconnected from MongoDB")


async def create_indexes():
    """Create database indexes for performance."""
    try:
        # Users
        await db.users.create_index([("email", ASCENDING)], unique=True)
        await db.users.create_index([("username", ASCENDING)], unique=True)

        # Workspaces
        await db.workspaces.create_index([("owner_id", ASCENDING)])
        await db.workspaces.create_index([("members.user_id", ASCENDING)])

        # Projects
        await db.projects.create_index([("workspace_id", ASCENDING)])
        await db.projects.create_index([("created_by", ASCENDING)])

        # Tasks
        await db.tasks.create_index([("project_id", ASCENDING)])
        await db.tasks.create_index([("assignees", ASCENDING)])
        await db.tasks.create_index([("status", ASCENDING)])
        await db.tasks.create_index([("due_date", ASCENDING)])

        # Comments
        await db.comments.create_index([("task_id", ASCENDING)])
        await db.comments.create_index([("created_at", DESCENDING)])

        # Notifications
        await db.notifications.create_index([("user_id", ASCENDING)])
        await db.notifications.create_index([("read", ASCENDING)])
        await db.notifications.create_index([("created_at", DESCENDING)])

        # Activity logs
        await db.activity_logs.create_index([("workspace_id", ASCENDING)])
        await db.activity_logs.create_index([("project_id", ASCENDING)])
        await db.activity_logs.create_index([("created_at", DESCENDING)])

        # Files
        await db.files.create_index([("task_id", ASCENDING)])
        await db.files.create_index([("project_id", ASCENDING)])

        # Chat messages
        await db.chat_messages.create_index([("workspace_id", ASCENDING)])
        await db.chat_messages.create_index([("created_at", ASCENDING)])

        # Docs
        await db.documents.create_index([("project_id", ASCENDING)])

        # Pending invites
        await db.pending_invites.create_index([("token", ASCENDING)], unique=True)
        await db.pending_invites.create_index([("workspace_id", ASCENDING)])
        await db.pending_invites.create_index([("email", ASCENDING)])
        await db.pending_invites.create_index(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0  # TTL index — MongoDB auto-deletes expired invites
        )

        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")


def get_db():
    return db