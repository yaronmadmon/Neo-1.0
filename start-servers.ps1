# Neo-1.0 - Start Both Servers with Port Management
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Neo-1.0 - Development Server Manager" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check and clear a port (uses approved verb 'Clear')
function Clear-Port {
    param([int]$Port)
    
    Write-Host "Checking port $Port..." -ForegroundColor Yellow
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($connections) {
        $processId = $connections.OwningProcess
        
        # Skip system processes (process ID 0 = Idle, 4 = System, etc.)
        # These are Windows kernel processes that can't be killed
        if ($processId -eq 0 -or $processId -eq 4) {
            Write-Host "[OK] Port $Port appears available (system process detected)" -ForegroundColor Green
            return $true
        }
        
        try {
            $processName = (Get-Process -Id $processId -ErrorAction SilentlyContinue).ProcessName
        } catch {
            $processName = "Unknown"
        }
        Write-Host "[!] Port $Port is in use by process $processId ($processName)" -ForegroundColor Yellow
        Write-Host "    Attempting to clear port..." -ForegroundColor Yellow
        
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Start-Sleep -Seconds 1
            
            # Verify port is free
            $stillInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
            if (-not $stillInUse) {
                Write-Host "[OK] Port $Port is now available" -ForegroundColor Green
                return $true
            } else {
                Write-Host "[!] Port $Port may still be in use" -ForegroundColor Yellow
                return $false
            }
        } catch {
            Write-Host "[ERROR] Failed to clear port $Port : $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "[OK] Port $Port is available" -ForegroundColor Green
        return $true
    }
}

# Clear ports before starting
Write-Host "Pre-flight Port Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Clear-Port -Port 3000 | Out-Null
Clear-Port -Port 5173 | Out-Null
Write-Host ""

# Start backend server in background (hidden window)
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Write-Host "   Port: 3000" -ForegroundColor Gray
Write-Host "   Path: apps\server" -ForegroundColor Gray
$backendPath = Join-Path $PSScriptRoot "apps\server"
$backendScript = Join-Path $backendPath "start.ps1"
if (-not (Test-Path $backendScript)) {
    # Create a temporary start script
    $backendCommand = "cd '$backendPath'; npm run build; if (`$LASTEXITCODE -eq 0) { npm run dev } else { Write-Host 'Build failed!' -ForegroundColor Red; Read-Host 'Press Enter to exit' }"
    Start-Process powershell -ArgumentList @("-NoExit", "-WindowStyle Minimized", "-Command", $backendCommand)
} else {
    Start-Process powershell -ArgumentList @("-NoExit", "-WindowStyle Minimized", "-File", $backendScript)
}

Start-Sleep -Seconds 3

# Start frontend server in background (hidden window)
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
Write-Host "   Port: 5173" -ForegroundColor Gray
Write-Host "   Path: apps\web" -ForegroundColor Gray
$frontendPath = Join-Path $PSScriptRoot "apps\web"
$frontendCommand = "cd '$frontendPath'; npm run dev"
Start-Process powershell -ArgumentList @("-NoExit", "-WindowStyle Minimized", "-Command", $frontendCommand)

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "[OK] Servers Starting in Separate Windows" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitor the server windows for startup status" -ForegroundColor Yellow
Write-Host ""
