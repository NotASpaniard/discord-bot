# Lua Viet Bot Control Script
param(
    [string]$Action = ""
)

function Show-Menu {
    Clear-Host
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host "     LUA VIET BOT CONTROL PANEL     " -ForegroundColor Yellow
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Start Bot (Development)" -ForegroundColor Green
    Write-Host "2. Start Bot (Production)" -ForegroundColor Green  
    Write-Host "3. Stop All Bot Processes" -ForegroundColor Red
    Write-Host "4. Register Commands" -ForegroundColor Blue
    Write-Host "5. View Bot Status" -ForegroundColor Magenta
    Write-Host "6. Exit" -ForegroundColor Gray
    Write-Host ""
}

function Start-DevBot {
    Write-Host "Starting bot in development mode..." -ForegroundColor Green
    npm run dev
}

function Start-ProdBot {
    Write-Host "Building bot..." -ForegroundColor Yellow
    npm run build
    Write-Host "Starting bot in production mode..." -ForegroundColor Green
    npm start
}

function Stop-BotProcesses {
    Write-Host "Stopping all Node.js processes..." -ForegroundColor Red
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Bot processes stopped." -ForegroundColor Green
    Start-Sleep 2
}

function Register-Commands {
    Write-Host "Registering slash commands..." -ForegroundColor Blue
    npm run register
    Write-Host "Commands registered successfully!" -ForegroundColor Green
    Start-Sleep 2
}

function Show-BotStatus {
    Write-Host "Checking for running Node.js processes..." -ForegroundColor Magenta
    $processes = Get-Process -Name node -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host "Found running Node.js processes:" -ForegroundColor Green
        $processes | Format-Table Name, Id, CPU, WorkingSet
    } else {
        Write-Host "No Node.js processes found." -ForegroundColor Yellow
    }
    Read-Host "Press Enter to continue"
}

# Handle direct action parameter
switch ($Action.ToLower()) {
    "start" { Start-DevBot; return }
    "dev" { Start-DevBot; return }
    "prod" { Start-ProdBot; return }
    "stop" { Stop-BotProcesses; return }
    "register" { Register-Commands; return }
    "status" { Show-BotStatus; return }
}

# Interactive menu
while ($true) {
    Show-Menu
    $choice = Read-Host "Chon tuy chon (1-6)"
    
    switch ($choice) {
        "1" { Start-DevBot; break }
        "2" { Start-ProdBot; break }
        "3" { Stop-BotProcesses }
        "4" { Register-Commands }
        "5" { Show-BotStatus }
        "6" { exit }
        default { 
            Write-Host "Invalid choice!" -ForegroundColor Red
            Start-Sleep 1
        }
    }
}
