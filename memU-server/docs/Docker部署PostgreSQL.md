# Docker 部署 PostgreSQL + pgvector

## 方案 1: 使用 docker-compose（推荐）

### 1. 启动数据库

```bash
# 在 memU-server 目录下执行
docker-compose up -d postgres
```

### 2. 查看状态

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs postgres
```

### 3. 连接测试

```bash
# 进入容器
docker exec -it memu-postgres psql -U postgres -d memu

# 验证 pgvector 扩展
\dx

# 退出
\q
```

### 4. 停止和清理

```bash
# 停止容器
docker-compose stop

# 停止并删除容器（保留数据）
docker-compose down

# 停止并删除容器和数据
docker-compose down -v
```

---

## 方案 2: 使用 docker run 命令

### 单条命令启动

```bash
docker run -d \
  --name memu-postgres \
  --restart unless-stopped \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_secure_password_here \
  -e POSTGRES_DB=memu \
  -p 5432:5432 \
  -v memu_postgres_data:/var/lib/postgresql/data \
  pgvector/pgvector:pg16
```

### 管理命令

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs memu-postgres

# 停止容器
docker stop memu-postgres

# 启动容器
docker start memu-postgres

# 删除容器（保留数据卷）
docker rm memu-postgres

# 删除容器和数据卷
docker rm memu-postgres
docker volume rm memu_postgres_data
```

---

## 远程服务器部署

### 1. 在远程服务器上安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 上传 docker-compose.yml

```bash
# 从本地上传到服务器
scp docker-compose.yml user@your-server:/path/to/memU-server/
```

### 3. 在服务器上启动

```bash
# SSH 连接到服务器
ssh user@your-server

# 进入目录
cd /path/to/memU-server

# 启动数据库
docker-compose up -d postgres
```

### 4. 配置防火墙（如果需要外部访问）

```bash
# Ubuntu/Debian
sudo ufw allow 5432/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload
```

---

## 安全建议

### 1. 修改默认密码

编辑 `docker-compose.yml`，修改 `POSTGRES_PASSWORD`：

```yaml
environment:
  POSTGRES_PASSWORD: your_very_secure_password_123!@#
```

### 2. 限制外部访问（推荐）

如果只在本地访问，修改端口映射：

```yaml
ports:
  - "127.0.0.1:5432:5432"  # 只允许本地访问
```

### 3. 定期备份

```bash
# 备份数据库
docker exec memu-postgres pg_dump -U postgres memu > backup.sql

# 恢复数据库
docker exec -i memu-postgres psql -U postgres memu < backup.sql
```

---

## 连接配置

### 本地连接

```env
DATABASE_PROVIDER=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password_here
DATABASE_NAME=memu
```

### 远程连接

```env
DATABASE_PROVIDER=postgres
DATABASE_HOST=your-server-ip
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password_here
DATABASE_NAME=memu
```

---

## 常见问题

### Q: 端口 5432 被占用

**解决方案**：修改映射端口

```yaml
ports:
  - "5433:5432"  # 使用 5433 端口
```

然后在 `.env` 中修改：

```env
DATABASE_PORT=5433
```

### Q: 容器启动失败

**检查日志**：

```bash
docker-compose logs postgres
```

**常见原因**：
- 端口被占用
- 数据卷权限问题
- Docker 服务未启动

### Q: 无法连接数据库

**检查步骤**：

1. 确认容器运行：`docker ps`
2. 检查端口：`netstat -an | grep 5432`
3. 测试连接：`telnet localhost 5432`
4. 查看防火墙：`sudo ufw status`

---

## 性能优化（可选）

编辑 `docker-compose.yml`，添加性能参数：

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    command:
      - "postgres"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "work_mem=16MB"
    # ... 其他配置
```
