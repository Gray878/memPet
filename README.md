# memPet - 智能桌面宠物

> 一款具备持续记忆和主动推理能力的桌面宠物智能体

与传统桌面宠物不同，memPet 旨在打造持续学习和自主成长性的桌面陪伴助手。它不仅能记住你的每次对话，还能主动观察你的工作状态，在合适的时机给予关怀建议以及信息获取。

## 核心特性

### 🧠 持续记忆能力
- 基于向量数据库的记忆存储与检索系统
- 记住所有对话内容和用户行为模式
- 支持长期记忆的智能关联

### 🤖 主动推理引擎
- 实时监控用户工作状态（应用使用、工作时长、专注度等）
- 智能分析上下文，生成个性化建议
- 冷却机制避免过度打扰

### 🎭 多性格系统
- 4 种预设性格：友好型、活力型、专业型、傲娇型
- 同一场景下不同性格有不同的表达方式
- 支持自定义性格参数调节

## 典型应用场景

- **疲劳提醒**：连续工作 2 小时后主动提醒休息
- **习惯学习**：识别用户行为模式，在合适时机主动提醒
- **专注保护**：会议等场景自动进入静默模式
- **个性化陪伴**：根据不同性格提供差异化的关怀表达

## 项目结构

```
memPet/
├── memPet-desktop/     # 桌面应用（Tauri + Vue 3）
└── memPet-server/      # 后端服务（FastAPI + PostgreSQL）
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
