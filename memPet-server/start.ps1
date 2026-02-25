# memPet-server 快速启动脚本

Write-Host "=== memPet-server 启动脚本 ===" -ForegroundColor Green

# 检查 Docker 是否运行
Write-Host "`n[检查] Docker 状态..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker 未运行，请先启动 Docker Desktop" -ForegroundColor Red
    Write-Host "  下载地址: https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
    exit 1
}
Write-Host "✓ Docker 正在运行" -ForegroundColor Green

# 1. 启动 PostgreSQL
Write-Host "`n[1/4] 启动 PostgreSQL..." -ForegroundColor Yellow
docker compose up -d postgres
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ PostgreSQL 启动成功" -ForegroundColor Green
    Start-Sleep -Seconds 3
} else {
    Write-Host "✗ PostgreSQL 启动失败" -ForegroundColor Red
    exit 1
}

# 2. 设置环境变量
Write-Host "`n[2/4] 设置环境变量..." -ForegroundColor Yellow

# 提示用户输入 API Key（如果未设置）
if (-not $env:OPENAI_API_KEY) {
    Write-Host "请输入你的 API Key:" -ForegroundColor Cyan
    Write-Host "  - OpenAI: sk-..." -ForegroundColor Gray
    Write-Host "  - 通义千问: sk-..." -ForegroundColor Gray
    $apiKey = Read-Host "API Key"
    $env:OPENAI_API_KEY = $apiKey
}

# 询问是否使用通义千问
Write-Host "`n是否使用通义千问？(y/n) [默认: n]" -ForegroundColor Cyan
$useQwen = Read-Host
if ($useQwen -eq "y" -or $useQwen -eq "Y") {
    $env:OPENAI_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    $env:DEFAULT_LLM_MODEL = "qwen-plus"
    Write-Host "✓ 已配置通义千问 (qwen-plus)" -ForegroundColor Green
} else {
    Write-Host "✓ 使用 OpenAI 默认配置" -ForegroundColor Green
}

# 设置数据库 URL
$env:DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/memu"

# 3. 验证配置
Write-Host "`n[3/4] 验证配置..." -ForegroundColor Yellow
if ($env:OPENAI_API_KEY.Length -gt 10) {
    Write-Host "  ✓ API Key: $($env:OPENAI_API_KEY.Substring(0, 10))..." -ForegroundColor Gray
} else {
    Write-Host "  ✓ API Key: $env:OPENAI_API_KEY" -ForegroundColor Gray
}
Write-Host "  ✓ Database: $env:DATABASE_URL" -ForegroundColor Gray
if ($env:OPENAI_BASE_URL) {
    Write-Host "  ✓ Base URL: $env:OPENAI_BASE_URL" -ForegroundColor Gray
    Write-Host "  ✓ Model: $env:DEFAULT_LLM_MODEL" -ForegroundColor Gray
}

# 4. 启动服务
Write-Host "`n[4/4] 启动 memPet-server..." -ForegroundColor Yellow
Write-Host "服务将运行在: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止服务`n" -ForegroundColor Gray
Write-Host "=" * 50 -ForegroundColor Green

uv run fastapi dev
