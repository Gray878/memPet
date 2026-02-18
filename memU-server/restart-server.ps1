# 手动重启 memU-server
Write-Host "停止所有 memU-server 进程..." -ForegroundColor Yellow

# 停止所有相关的 Python 进程
Get-Process | Where-Object {
    $_.Path -like "*memU-server*" -or 
    ($_.ProcessName -eq "python" -and $_.Path -like "*memU-server\.venv*")
} | Stop-Process -Force

Write-Host "等待进程完全停止..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "启动 memU-server..." -ForegroundColor Green
uv run fastapi dev app/main.py
