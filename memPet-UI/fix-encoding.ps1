# Fix Windows PowerShell encoding for Chinese characters
# Run this before starting the dev server

Write-Host "Setting console encoding to UTF-8..." -ForegroundColor Yellow

# Set console encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"

Write-Host "Encoding set successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now run: npm run dev" -ForegroundColor Cyan
