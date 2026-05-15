@echo off
echo.
echo ==========================================
echo      CollabSphere Setup Script (Win)
echo ==========================================
echo.

where python >nul 2>&1 || (echo Python 3 is required. Install from python.org && exit /b 1)
where node >nul 2>&1 || (echo Node.js is required. Install from nodejs.org && exit /b 1)

echo Setting up backend...
cd backend

if not exist venv (
    python -m venv venv
)

call venv\Scripts\activate

pip install -q -r requirements.txt

if not exist .env (
    echo MONGODB_URL=mongodb://localhost:27017 > .env
    echo DATABASE_NAME=collabsphere >> .env
    echo SECRET_KEY=collabsphere-super-secret-key-change-this-in-production-32chars >> .env
    echo ALGORITHM=HS256 >> .env
    echo ACCESS_TOKEN_EXPIRE_MINUTES=10080 >> .env
    echo UPLOAD_DIR=uploads >> .env
    echo MAX_UPLOAD_SIZE=10485760 >> .env
    echo CORS_ORIGINS=http://localhost:5173,http://localhost:3000 >> .env
)

if not exist uploads mkdir uploads
echo Backend ready!
cd ..

echo.
echo Setting up frontend...
cd frontend
npm install
if not exist .env (
    echo VITE_API_BASE_URL=http://localhost:8000/api/v1 > .env
    echo VITE_WS_URL=ws://localhost:8000 >> .env
)
echo Frontend ready!
cd ..

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Make sure MongoDB is running on port 27017
echo.
echo Terminal 1 (Backend):
echo   cd backend ^& venv\Scripts\activate ^& uvicorn app.main:app --reload --port 8000
echo.
echo Terminal 2 (Frontend):
echo   cd frontend ^& npm run dev
echo.
echo Open: http://localhost:5173
echo.
pause
