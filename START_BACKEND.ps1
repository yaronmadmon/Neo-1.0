# Start Backend Server
Set-Location "$PSScriptRoot\apps\server"
Write-Host "Building backend server..." -ForegroundColor Cyan
npm run build
Write-Host ""
Write-Host "Starting backend server on port 3000..." -ForegroundColor Green
npm run dev
