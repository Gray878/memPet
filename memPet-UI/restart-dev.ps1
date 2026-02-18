# Electron Development Server Complete Restart Script
# Fixes preload script not loading issue

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Electron Dev Server Complete Restart" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Stop existing processes
Write-Host "[1/4] Stopping existing processes..." -ForegroundColor Yellow
Write-Host "  Please manually stop npm run dev (Ctrl+C)" -ForegroundColor Red
Write-Host "  Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# 2. Clean build cache
Write-Host ""
Write-Host "[2/4] Cleaning build cache..." -ForegroundColor Yellow

if (Test-Path "dist-electron") {
    Remove-Item -Recurse -Force "dist-electron" -ErrorAction SilentlyContinue
    Write-Host "  OK Deleted dist-electron" -ForegroundColor Green
}

if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
    Write-Host "  OK Deleted node_modules\.vite" -ForegroundColor Green
}

# 3. Verify key files
Write-Host ""
Write-Host "[3/4] Verifying key files..." -ForegroundColor Yellow

$files = @(
    "src/main/index.ts",
    "src/main/preload.ts",
    "vite.config.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  OK $file" -ForegroundColor Green
    } else {
        Write-Host "  ERROR $file not found!" -ForegroundColor Red
    }
}

# 4. Restart
Write-Host ""
Write-Host "[4/4] Restarting dev server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running: npm run dev" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After startup, please check:" -ForegroundColor Yellow
Write-Host "  1. Open DevTools (Ctrl+Shift+I)" -ForegroundColor Gray
Write-Host "  2. In Console, type: window.electronAPI" -ForegroundColor Gray
Write-Host "  3. Should see object with chat, events, memory properties" -ForegroundColor Gray
Write-Host ""

npm run dev
