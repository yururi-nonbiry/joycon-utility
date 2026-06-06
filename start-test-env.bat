@echo off
title Joy-Con Utility Development Environment

echo =================================================================
echo  Starting Joy-Con Utility Development Environment
echo =================================================================

REM Change directory to the UI folder
cd /d "%~dp0ui"
if %errorlevel% neq 0 (
    echo ERROR: Could not change directory to '%~dp0ui'.
    pause
    exit /b 1
)

echo Starting the UI (Vite + Electron)...
npm run dev

echo.
echo The development server has been shut down.
pause