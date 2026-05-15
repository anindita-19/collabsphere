#!/bin/bash
# CollabSphere Quick Setup Script
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     CollabSphere Setup Script        ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check dependencies
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required. Please install Python 3.12+"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Please install Node.js 18+"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required."; exit 1; }

echo "✅ Python: $(python3 --version)"
echo "✅ Node: $(node --version)"
echo ""

# ── Backend ──────────────────────────────────────────────

echo "📦 Setting up backend..."
cd backend

# Virtual environment
if [ ! -d "venv" ]; then
    echo "   Creating virtual environment..."
    python3 -m venv venv
fi

# Activate
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

echo "   Installing Python dependencies..."
pip install -q -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "   Creating .env file..."
    cat > .env << 'EOF'
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=collabsphere
SECRET_KEY=collabsphere-super-secret-key-change-this-in-production-32chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE=10485760
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
EOF
fi

mkdir -p uploads
echo "✅ Backend ready!"
cd ..

# ── Frontend ─────────────────────────────────────────────

echo ""
echo "📦 Setting up frontend..."
cd frontend

echo "   Installing npm packages (this may take a moment)..."
npm install --silent

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000
EOF
fi

echo "✅ Frontend ready!"
cd ..

# ── Final Instructions ────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              🚀 Setup Complete!                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  Make sure MongoDB is running on localhost:27017"
echo ""
echo "To start the application, run in TWO terminals:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend"
echo "    source venv/bin/activate"
echo "    uvicorn app.main:app --reload --port 8000"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "  Then open: http://localhost:5173"
echo "  API Docs:  http://localhost:8000/api/docs"
echo ""
