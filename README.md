# 🚀 CollabSphere — Production-Grade Project Collaboration Platform

> A modern, full-stack project collaboration system built for startup ecosystems. Combines Kanban workflows, real-time collaboration, documentation, analytics, and team management into one unified workspace.

![Stack](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python%203.12-009688?style=flat-square)
![Stack](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61dafb?style=flat-square)
![Stack](https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square)
![Stack](https://img.shields.io/badge/Realtime-WebSockets-f7df1e?style=flat-square)

---

## ✨ Features

### Core Platform
- 🔐 **JWT Authentication** — Register, login, persistent sessions, password hashing
- 🏢 **Workspaces** — Create and manage collaborative workspaces with roles (Owner, Admin, Member, Viewer)
- 📁 **Projects** — Organize work into projects with status tracking and progress visualization
- 🎯 **Kanban Board** — Full drag-and-drop Kanban with DnD Kit: Todo → In Progress → Review → Completed
- 📊 **Analytics Dashboard** — Recharts-powered insights: completion rates, priority breakdown, contributor stats
- 📝 **Documentation** — Markdown editor with split-pane live preview per project
- 💬 **Team Chat** — Floating real-time workspace chat panel
- 🔔 **Notifications** — Smart in-app notification system for assignments, comments, completions
- 📎 **File Management** — Local file upload/download with type validation attached to tasks
- ⚡ **WebSocket** — Live updates for tasks, presence indicators, typing indicators

### Task Features
- Create / Edit / Delete tasks with full metadata
- Priority labels: Low, Medium, High, Urgent
- Status management with drag-and-drop
- Assignee search & multi-assignment
- Due dates with overdue highlighting
- Tags / Labels
- Task comments with author attribution
- File attachments per task
- Task detail slide-in panel

### UI/UX
- 🌙 **Dark/Light Mode** — Sophisticated dual-theme with smooth transitions
- ⌨️ **Command Palette** — Cmd+K search for workspaces and navigation
- 💀 **Loading Skeletons** — Content-aware skeleton loaders
- 🎨 **Animations** — Framer Motion throughout: page transitions, card hovers, slide panels
- 📱 **Responsive** — Works on mobile, tablet, and desktop
- 🎯 **Empty States** — Thoughtful empty state illustrations

---

## 🏗️ Architecture

```
collabsphere/
├── backend/                  # FastAPI Python application
│   ├── app/
│   │   ├── main.py           # Application entry point
│   │   ├── config.py         # Settings / environment
│   │   ├── database.py       # MongoDB connection + indexes
│   │   ├── routers/          # API route handlers
│   │   │   ├── auth.py       # Register, login, profile
│   │   │   ├── workspaces.py # Workspace CRUD + members
│   │   │   ├── projects.py   # Project CRUD + analytics
│   │   │   ├── tasks.py      # Task CRUD + comments
│   │   │   ├── files.py      # File upload/download
│   │   │   ├── documents.py  # Markdown docs
│   │   │   ├── notifications.py # Notifications + chat + analytics
│   │   │   └── websocket.py  # WS endpoint
│   │   ├── schemas/
│   │   │   └── schemas.py    # Pydantic request/response models
│   │   ├── middleware/
│   │   │   └── auth_middleware.py # JWT dependency injection
│   │   ├── utils/
│   │   │   ├── auth.py       # JWT + password hashing
│   │   │   └── helpers.py    # Serialization, utilities
│   │   └── websocket/
│   │       └── manager.py    # WebSocket connection manager
│   ├── uploads/              # Local file storage
│   ├── requirements.txt
│   └── .env
│
└── frontend/                 # React + Vite application
    ├── src/
    │   ├── App.jsx            # Router + protected routes
    │   ├── main.jsx           # Entry point
    │   ├── index.css          # Tailwind + design tokens
    │   ├── pages/             # Route-level page components
    │   │   ├── Landing.jsx
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── WorkspacePage.jsx
    │   │   ├── ProjectPage.jsx
    │   │   ├── KanbanPage.jsx
    │   │   ├── AnalyticsPage.jsx
    │   │   ├── DocumentsPage.jsx
    │   │   ├── NotificationsPage.jsx
    │   │   ├── ProfilePage.jsx
    │   │   └── SettingsPage.jsx
    │   ├── components/
    │   │   ├── layout/        # AppLayout, Sidebar, TopBar
    │   │   ├── ui/            # Reusable components
    │   │   │   ├── Avatar, Badge, Modal, EmptyState
    │   │   │   ├── LoadingScreen, CommandPalette
    │   │   │   ├── WorkspaceModal, ProjectModal
    │   │   │   ├── TaskModal, InviteModal
    │   │   ├── kanban/        # TaskDetailPanel
    │   │   └── chat/          # WorkspaceChat
    │   ├── hooks/             # Custom React hooks
    │   │   ├── useWebSocket.js
    │   │   └── useAsync.js
    │   ├── services/          # API layer
    │   │   ├── api.js         # Axios instance
    │   │   └── apiServices.js # All API calls
    │   ├── store/             # Zustand state management
    │   │   ├── authStore.js
    │   │   └── appStore.js
    │   └── utils/
    │       └── helpers.js     # Formatters, utilities
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── .env
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- MongoDB 6+ running locally

### 1. Clone and navigate

```bash
git clone <repo-url>
cd collabsphere
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Linux/macOS
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env              # Edit values as needed
# Ensure MongoDB is running on localhost:27017

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
Interactive docs: `http://localhost:8000/api/docs`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env              # Or edit .env directly

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=collabsphere
SECRET_KEY=your-super-secret-key-change-in-production-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE=10485760
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000
```

---

## 🗄️ Database Schema

### Collections

**users**
```json
{
  "_id": "ObjectId",
  "email": "string (unique)",
  "username": "string (unique)",
  "full_name": "string",
  "hashed_password": "string",
  "bio": "string",
  "avatar_color": "string",
  "timezone": "string",
  "is_active": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**workspaces**
```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "color": "string",
  "icon": "string",
  "owner_id": "string",
  "members": [
    {
      "user_id": "string",
      "email": "string",
      "full_name": "string",
      "username": "string",
      "role": "owner|admin|member|viewer",
      "avatar_color": "string",
      "joined_at": "datetime"
    }
  ],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**projects**
```json
{
  "_id": "ObjectId",
  "workspace_id": "string",
  "name": "string",
  "description": "string",
  "status": "active|on_hold|completed|archived",
  "color": "string",
  "due_date": "datetime",
  "created_by": "string",
  "members": ["string"],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**tasks**
```json
{
  "_id": "ObjectId",
  "project_id": "string",
  "workspace_id": "string",
  "title": "string",
  "description": "string",
  "status": "todo|in_progress|review|completed",
  "priority": "low|medium|high|urgent",
  "assignees": ["string"],
  "due_date": "datetime",
  "tags": ["string"],
  "position": "number",
  "created_by": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**comments** · **notifications** · **activity_logs** · **files** · **chat_messages** · **documents**

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| GET | `/api/v1/auth/me` | Get current user |
| PUT | `/api/v1/auth/me` | Update profile |
| PUT | `/api/v1/auth/me/password` | Change password |
| GET | `/api/v1/auth/users/search?q=` | Search users |

### Workspaces
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/workspaces` | Get all my workspaces |
| POST | `/api/v1/workspaces` | Create workspace |
| GET | `/api/v1/workspaces/{id}` | Get workspace |
| PUT | `/api/v1/workspaces/{id}` | Update workspace |
| DELETE | `/api/v1/workspaces/{id}` | Delete workspace |
| POST | `/api/v1/workspaces/{id}/invite` | Invite member |
| GET | `/api/v1/workspaces/{id}/activity` | Get activity log |

### Projects, Tasks, Documents, Files
> Full CRUD + analytics. See `/api/docs` for complete reference.

### WebSocket
```
ws://localhost:8000/ws/{workspace_id}?token={jwt_token}
```

**Events received:**
- `task_created`, `task_updated`, `task_moved`, `task_deleted`
- `project_created`, `project_updated`, `project_deleted`
- `chat_message`, `notification`
- `presence`, `presence_list`
- `typing`, `document_updated`

**Events sent:**
- `{ type: "ping" }` — Heartbeat
- `{ type: "typing", is_typing: true }` — Typing indicator
- `{ type: "presence_request" }` — Get online users

---

## 🎨 Design System

**Color Palette:**
- Primary: Indigo (`#6366f1`)
- Accent: Violet, Cyan, Emerald, Amber, Rose
- Surface: Slate scale (50–950)

**Typography:**
- Headings: Syne (display font)
- Body: DM Sans
- Code: JetBrains Mono

**Component Classes:**
- `.card` — Elevated card surface
- `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`
- `.input`, `.label`, `.badge`
- `.sidebar-item` — Navigation items
- `.gradient-text` — Gradient heading text
- `.glass` — Glassmorphism surface

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS 3.4 |
| Animations | Framer Motion 11 |
| Routing | React Router 6 |
| State Management | Zustand 4 |
| HTTP Client | Axios 1.7 |
| Drag & Drop | DnD Kit 6 |
| Charts | Recharts 2.12 |
| Markdown | React Markdown 9 |
| Icons | React Icons 5 |
| Backend Framework | FastAPI 0.111 |
| ASGI Server | Uvicorn 0.30 |
| Database | MongoDB 6 |
| ODM/Driver | Motor 3.4 (async) |
| Authentication | JWT (python-jose) |
| Password Hashing | Passlib + bcrypt |
| File Handling | aiofiles |
| WebSockets | FastAPI native |
| Validation | Pydantic v2 |

---

## 📦 Installation Commands

### Backend
```bash
pip install fastapi==0.111.0 uvicorn[standard]==0.30.1 motor==3.4.0 \
  pymongo==4.7.2 pydantic==2.7.1 pydantic-settings==2.3.0 \
  python-jose[cryptography]==3.3.0 passlib[bcrypt]==1.7.4 \
  python-multipart==0.0.9 aiofiles==23.2.1 python-dotenv==1.0.1 \
  websockets==12.0 bcrypt==4.1.3 email-validator==2.1.1
```

### Frontend
```bash
npm install react react-dom react-router-dom axios framer-motion \
  react-icons recharts zustand @dnd-kit/core @dnd-kit/sortable \
  @dnd-kit/utilities react-hot-toast react-markdown date-fns clsx
```

---

## 🚢 Deployment Guide

### MongoDB
Use MongoDB Atlas (free tier) for production:
1. Create account at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create cluster → Get connection string
3. Set `MONGODB_URL` in backend `.env`

### Backend (Render / Railway / EC2)
```bash
# Procfile
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT

# Or run directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend (Vercel / Netlify)
```bash
npm run build
# Deploy the `dist/` folder

# Set environment variable:
VITE_API_BASE_URL=https://your-api-domain.com/api/v1
VITE_WS_URL=wss://your-api-domain.com
```

### CORS Configuration
Update `CORS_ORIGINS` in backend `.env`:
```env
CORS_ORIGINS=https://your-frontend-domain.com
```

---

## 🛠️ Development Tips

- API docs available at `http://localhost:8000/api/docs` (Swagger UI)
- Use `Cmd+K` / `Ctrl+K` to open command palette
- WebSocket reconnects automatically on disconnect
- All MongoDB operations are async (Motor)
- Files stored in `backend/uploads/` — add to `.gitignore`
- JWT tokens expire in 7 days by default

---

## 📋 Known Limitations

- File storage is local only (no S3/CDN in this version)
- No email verification flow (can be added with SendGrid/Resend)
- No 2FA (architecture supports adding it)
- WebSocket state resyncs on reconnect (not event-sourced)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feat/your-feature`
3. Commit: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — See LICENSE file for details.

---

*Built with ❤️ using FastAPI, React, and MongoDB*
