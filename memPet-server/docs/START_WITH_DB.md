# memPet-server 启动指南（含数据库）

memPet-server 需要 PostgreSQL 数据库。以下是完整的启动步骤。

---

## 方案 1: 使用 Docker 启动数据库（推荐）

### 步骤 1: 启动 PostgreSQL

```powershell
# 在 memPet-server 目录下
docker compose up -d postgres
```

这会启动一个 PostgreSQL 数据库，配置如下：
- 主机: localhost
- 端口: 5432
- 用户: postgres
- 密码: postgres
- 数据库: memu

### 步骤 2: 设置环境变量

```powershell
# 设置 API Key
$env:OPENAI_API_KEY="your_api_key"

# 设置数据库 URL（使用 Docker 的数据库）
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/memu"

# 如果使用通义千问
$env:OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
$env:DEFAULT_LLM_MODEL="qwen-plus"
```

### 步骤 3: 启动服务

```powershell
uv run fastapi dev
```

### 步骤 4: 运行测试

```powershell
python test_all.py
```

---

## 方案 2: 使用 SQLite（简单但功能受限）

如果不想安装 Docker，可以修改代码使用 SQLite。

### 修改 app/database.py

在 `get_database_url()` 函数开头添加：

```python
def get_database_url() -> str:
    # 优先使用 SQLite（用于开发测试）
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        # 默认使用 SQLite
        data_dir = Path("./data")
        data_dir.mkdir(exist_ok=True)
        return f"sqlite+aiosqlite:///{data_dir}/memu.db"
    
    # 原有的 PostgreSQL 逻辑...
```

然后正常启动：

```powershell
$env:OPENAI_API_KEY="your_api_key"
uv run fastapi dev
```

注意: SQLite 不支持 pgvector 扩展，向量检索功能会受限。

---

## 方案 3: 手动配置 PostgreSQL

如果你已经有 PostgreSQL 服务器：

```powershell
# 设置独立的数据库变量
$env:DATABASE_HOST="localhost"
$env:DATABASE_PORT="5432"
$env:DATABASE_USER="postgres"
$env:DATABASE_PASSWORD="your_password"
$env:DATABASE_NAME="memu"

# 设置 API Key
$env:OPENAI_API_KEY="your_api_key"

# 启动服务
uv run fastapi dev
```

---

## 快速启动脚本

创建 `start.ps1`：

```powershell
# memPet-server 快速启动脚本

Write-Host "=== memPet-server 启动脚本 ===" -ForegroundColor Green

# 1. 启动 PostgreSQL
Write-Host "`n[1/4] 启动 PostgreSQL..." -ForegroundColor Yellow
docker compose up -d postgres
Start-Sleep -Seconds 3

# 2. 设置环境变量
Write-Host "[2/4] 设置环境变量..." -ForegroundColor Yellow
$env:OPENAI_API_KEY="your_api_key_here"  # 修改为你的 API Key
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/memu"

# 如果使用通义千问，取消下面两行的注释
# $env:OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
# $env:DEFAULT_LLM_MODEL="qwen-plus"

# 3. 验证配置
Write-Host "[3/4] 验证配置..." -ForegroundColor Yellow
Write-Host "  API Key: $($env:OPENAI_API_KEY.Substring(0, 10))..." -ForegroundColor Gray
Write-Host "  Database: $env:DATABASE_URL" -ForegroundColor Gray

# 4. 启动服务
Write-Host "[4/4] 启动 memPet-server..." -ForegroundColor Yellow
Write-Host ""
uv run fastapi dev
```

使用方法：
```powershell
# 修改 start.ps1 中的 API Key
# 然后运行
.\start.ps1
```

---

## 停止服务

```powershell
# 停止 memPet-server: Ctrl+C

# 停止 PostgreSQL
docker compose down
```

---

## 常见问题

### Q: Docker 未安装

**解决**: 
1. 下载 Docker Desktop: https://www.docker.com/products/docker-desktop
2. 安装并启动 Docker
3. 重新运行 `docker compose up -d postgres`

### Q: 端口 5432 被占用

**解决**:
```powershell
# 修改 docker-compose.yml 中的端口映射
# 将 "5432:5432" 改为 "5433:5432"

# 然后修改 DATABASE_URL
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5433/memu"
```

### Q: 数据库连接失败

**解决**:
```powershell
# 检查 PostgreSQL 是否运行
docker ps

# 查看日志
docker compose logs postgres

# 重启数据库
docker compose restart postgres
```

---

## 验证数据库连接

```powershell
# 使用 psql 连接测试
docker exec -it memPet-server-postgres-1 psql -U postgres -d memu

# 在 psql 中执行
\dt  # 查看表
\q   # 退出
```

---

## 推荐配置（用于开发）

```powershell
# 使用 Docker PostgreSQL + 通义千问
docker compose up -d postgres

$env:OPENAI_API_KEY="your_dashscope_api_key"
$env:OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
$env:DEFAULT_LLM_MODEL="qwen-plus"
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/memu"

uv run fastapi dev
```

这样配置：
- 成本低（使用通义千问）
- 功能完整（PostgreSQL + pgvector）
- 易于管理（Docker）
