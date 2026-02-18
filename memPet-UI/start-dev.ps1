# Start development server with proper encoding
# This script sets UTF-8 encoding before starting the dev server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting memPet Development Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set console encoding to UTF-8
Write-Host "Setting console encoding to UTF-8..." -ForegroundColor Yellow
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"
$env:NO_COLOR = "1"
$env:TERM = "dumb"

Write-Host "Encoding configured successfully!" -ForegroundColor Green
Write-Host ""

# Start dev server
Write-Host "Starting npm run dev..." -ForegroundColor Cyan
Write-Host ""

npm run dev
