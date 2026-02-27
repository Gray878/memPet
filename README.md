# memPet - 智能桌面宠物

一个集成了记忆功能的智能桌面宠物项目，基于 Tauri + Vue 3 + FastAPI 构建。

## 项目结构

```
memPet/
├── memPet-desktop/     # 桌面应用（Tauri + Vue 3）
├── memPet-server/      # 后端服务（FastAPI + PostgreSQL）
└── docs/               # 项目文档
```

## 快速开始

### 1. 启动后端服务（memPet-server）

#### 环境要求

- Python >= 3.13
- PostgreSQL >= 14
- uv（Python 包管理工具）

#### 安装 uv

**Windows (PowerShell)**:
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS/Linux**:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### 启动服务

```bash
# 进入 memPet-server 目录
cd memPet-server

# 方式 1: 使用启动脚本（推荐，会自动启动 PostgreSQL）
./start.ps1          # Windows
./start.sh           # macOS/Linux

# 方式 2: 手动启动
# 先启动 PostgreSQL
docker compose up -d postgres

# 配置环境变量（创建 .env 文件）
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key

# 启动服务
uv run fastapi dev app/main.py
```

服务启动后会运行在 `http://127.0.0.1:8000`

### 2. 启动桌面应用（memPet-desktop）

#### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Rust >= 1.70.0

#### Windows 系统额外配置

1. **修改 PowerShell 执行策略**（首次需要）：
```powershell
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

2. **配置 Cargo 镜像源**（可选，加速依赖下载）：
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cargo"

@"
[source.crates-io]
replace-with = 'rsproxy-sparse'

[source.rsproxy-sparse]
registry = "sparse+https://rsproxy.cn/index/"

[net]
git-fetch-with-cli = true

[http]
check-revoke = false
timeout = 60
"@ | Out-File -FilePath "$env:USERPROFILE\.cargo\config.toml" -Encoding UTF8
```

#### 启动应用

```bash
# 进入 memPet-desktop 目录
cd memPet-desktop

# 安装依赖
pnpm install

# 准备 Sidecar 启动器（重要！）
pnpm run sidecar:prepare

# 启动开发模式
pnpm run tauri:dev
```

## 核心功能

### memPet-server（后端服务）

- **记忆存储**：存储用户对话和系统观察
- **记忆检索**：基于向量相似度的智能检索
- **主动推理**：根据用户状态主动生成关心消息
- **记忆增强对话**：结合历史记忆的智能对话

### memPet-desktop（桌面应用）

- **跨平台支持**：Windows、macOS、Linux
- **键鼠监控**：根据键盘、鼠标操作同步动作
- **自定义模型**：支持导入自定义 Live2D 模型
- **隐私保护**：完全离线运行，不收集用户数据

## 开发文档

- [memPet-server 快速开始](memPet-server/docs/桌面宠物快速开始.md)
- [memPet-desktop 开发指南](memPet-desktop/README.md)
- [项目架构说明](docs/memPet-Electron-Architecture.md)
- [功能特性指南](docs/memPet-Features-Guide.md)

## 常用命令

### memPet-server

```bash
# 启动开发服务器
uv run fastapi dev app/main.py

# 运行测试
python tests/test_api.py

# 启动 PostgreSQL
docker compose up -d postgres
```

### memPet-desktop

```bash
# 安装依赖
pnpm install

# 准备 Sidecar 启动器
pnpm run sidecar:prepare

# 启动开发模式
pnpm run tauri:dev

# 代码检查
pnpm run lint

# 构建应用
pnpm run tauri:build
```

## 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **UI**: Ant Design Vue + UnoCSS
- **桌面**: Tauri 2.0
- **状态管理**: Pinia
- **路由**: Vue Router

### 后端
- **框架**: FastAPI
- **数据库**: PostgreSQL + pgvector
- **ORM**: SQLModel
- **AI**: OpenAI API / 通义千问

## 常见问题

### Q1: uv 命令未找到

参考上面的"安装 uv"部分，安装 Python 包管理工具。

### Q2: tauri 命令未找到

确保已运行 `pnpm install` 安装依赖。

### Q3: PowerShell 脚本执行被阻止

以管理员身份运行 PowerShell，执行：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q4: Cargo 依赖下载超时

配置 Cargo 镜像源（参考上面的 Windows 系统额外配置）。

### Q5: 缺少 memPet-server-x86_64-pc-windows-msvc.exe

运行 `pnpm run sidecar:prepare` 生成启动器文件。

### Q6: PostgreSQL 连接失败

确保 Docker 正在运行，并且 PostgreSQL 容器已启动：
```bash
docker compose up -d postgres
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 致谢

本项目灵感来源于 [Bongo-Cat-Mver](https://github.com/MMmmmoko/Bongo-Cat-Mver)。
