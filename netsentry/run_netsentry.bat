@echo off
title NetSentry - Interactive Network Monitoring & Resilience Lab
echo =====================================================================
echo  NetSentry - Interactive Network Monitoring & Resilience Lab
echo  Army Institute of Technology, Pune (SPPU Curriculum)
echo =====================================================================
echo.

cd /d "%~dp0\backend"

if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found in backend\venv.
    echo Please create it first: python -m venv venv and pip install -r requirements.txt
    pause
    exit /b 1
)

echo Starting NetSentry Unified Server on:
echo   - Web Dashboard: http://localhost:8000
echo   - REST APIs:     http://localhost:8000/api/v1
echo   - Real TCP Port: 9001
echo   - Real UDP Port: 9002
echo.
echo Press Ctrl+C to stop the server.
echo.

.\venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000
pause
