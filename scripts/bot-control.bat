@echo off
echo ====================================
echo     LUA VIET BOT CONTROL PANEL
echo ====================================
echo.
echo 1. Start Bot (Development)
echo 2. Start Bot (Production)
echo 3. Stop All Bot Processes
echo 4. Register Commands
echo 5. View Bot Status
echo 6. Exit
echo.
set /p choice=Chon tuy chon (1-6): 

if %choice%==1 (
    echo Starting bot in development mode...
    npm run dev
) else if %choice%==2 (
    echo Starting bot in production mode...
    npm run build
    npm start
) else if %choice%==3 (
    echo Stopping all Node.js processes...
    taskkill /f /im node.exe >nul 2>&1
    echo Bot processes stopped.
    pause
) else if %choice%==4 (
    echo Registering slash commands...
    npm run register
    pause
) else if %choice%==5 (
    echo Checking for running Node.js processes...
    tasklist /fi "imagename eq node.exe"
    pause
) else if %choice%==6 (
    exit
) else (
    echo Invalid choice!
    pause
)

goto :eof
