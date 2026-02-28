# memPet - 智能桌面宠物

> 一款具备持续记忆和主动推理能力的桌面宠物智能体

**项目定位**：新一代智能桌面陪伴助手，具备长期记忆和主动学习和成长能力

**核心亮点**：
- 🧠 **持续记忆**：基于向量数据库，记住所有对话和行为模式
- 🤖 **主动推理**：实时监控工作状态，智能生成个性化建议
- 🎭 **多性格系统**：4 种预设性格，同一场景不同表达方式

**典型场景**：疲劳提醒、习惯学习、专注保护、个性化陪伴

## 功能详解

### 🧠 持续记忆能力
- 基于向量数据库（pgvector）的记忆存储与检索
- 记住所有对话内容和用户行为模式
- 支持长期记忆的智能关联和上下文理解

### 🤖 主动推理引擎
- 实时监控用户工作状态（应用使用、工作时长、专注度等）
- 智能分析上下文，在合适时机生成个性化建议
- 冷却机制避免过度打扰，保护用户专注力

### 🎭 多性格系统
- 4 种预设性格：友好型、活力型、专业型、傲娇型
- 同一场景下不同性格有不同的表达方式
- 支持自定义性格参数调节

### 💬 应用场景示例

| 场景 | 触发条件 | 推理过程 | 宠物行为 |
|------|---------|---------|---------|
| **智能疲劳干预** | 连续编码 2.5 小时 + 键盘敲击频率下降 30% | 检索到上次提醒后用户继续工作了 40 分钟，判断为高专注状态但需要休息 | "检测到你已经连续写代码 2 个半小时了，而且敲键盘的速度明显变慢了呢。要不要起来活动一下？上次你休息 10 分钟后效率提升了不少哦~" |
| **上下文关怀** | 检测到 IDE 报错频率增加 + 同一文件反复修改 | 结合记忆发现用户在处理类似问题时曾搜索过相关文档，主动提供帮助 | "看起来这个 bug 有点棘手啊...我记得上周你遇到类似问题时查过官方文档的第 3 章，要不要我帮你找出来？" |
| **习惯预测** | 每天 14:30 左右打开音乐播放器（连续 5 天） | 学习到用户下午有听音乐的习惯，在 14:25 主动询问 | "又到下午茶时间啦！要不要我帮你打开音乐播放器？你最近好像很喜欢在这个时候听歌放松一下~" |
| **专注保护** | 检测到 Zoom/Teams 启动 + 日历显示会议中 | 进入静默模式，暂停所有主动推理，会议结束后恢复并询问会议情况 | [静默模式] 会议结束后："会议开了 1 小时呢，辛苦啦！需要我帮你整理一下会议要点吗？" |
| **情绪感知** | 检测到用户删除大量代码 + 长时间无操作 + 深夜时段 | 结合历史记忆判断可能遇到挫折，提供情绪支持 | "看起来今天的进度不太顺利...我记得你上次遇到困难时，出去散步 15 分钟后就想到解决方案了。要不要试试？明天的你一定会感谢现在休息的自己~" |
| **个性化提醒** | 用户连续 3 天在 23:00 后仍在工作 | 检索到用户曾说过要早睡，结合性格（傲娇型）生成提醒 | "哼，又熬夜了...虽然我不是很在意啦，但是你之前不是说要早点睡的吗？身体可是革命的本钱，我可不想看到你明天顶着黑眼圈工作！" |

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
