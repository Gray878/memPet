# memPet Desktop

基于 Tauri + Vue 3 开发的智能桌面宠物应用，集成记忆功能和 AI 对话能力。

## 环境要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **Rust**: >= 1.70.0
- **Python**: >= 3.13（用于 memPet-server）
- **uv**: Python 包管理工具（推荐）

## Windows 系统额外要求

### 1. 修改 PowerShell 执行策略（首次需要）

```powershell
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. 配置 Cargo 镜像源（可选，加速依赖下载）

```powershell
# 创建配置文件
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cargo"

# 写入配置（使用国内镜像）
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

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 准备 Sidecar 启动器

```bash
# 生成各平台的 memPet-server 启动器
pnpm run sidecar:prepare
```

这个命令会在 `src-tauri/binaries/` 目录下生成：
- `memPet-server-x86_64-pc-windows-msvc.exe` (Windows)
- `memPet-server-x86_64-apple-darwin` (macOS Intel)
- `memPet-server-aarch64-apple-darwin` (macOS Apple Silicon)

### 3. 启动开发模式

```bash
# 启动 Tauri 开发模式（包含前端和桌面应用）
pnpm run tauri:dev
```

或者分步启动：

```bash
# 仅启动前端开发服务器
pnpm run dev

# 在另一个终端启动 Tauri
pnpm tauri dev
```

## 常用命令

```bash
# 代码检查和修复
pnpm run lint

# 构建图标资源
pnpm run build:icon

# 构建应用（仅应用包）
pnpm run tauri:build

# 构建应用和安装程序
pnpm run tauri:build:installer

# 同步 API 类型（从 memPet-server 生成）
pnpm run api:sync

# 检查 Tauri HTTP 配置对齐
pnpm run check:http-alignment

# 准备 Sidecar（开发模式）
pnpm run sidecar:prepare

# 同步 Sidecar（构建模式，包含后端运行时）
pnpm run sidecar:sync
```

## 项目结构

```
memPet-desktop/
├── src/                    # 前端源码
│   ├── components/         # Vue 组件
│   ├── composables/        # 组合式函数
│   ├── pages/              # 页面
│   ├── services/           # API 服务
│   ├── stores/             # 状态管理
│   └── main.ts             # 入口文件
├── src-tauri/              # Tauri 后端
│   ├── binaries/           # Sidecar 启动器
│   ├── src/                # Rust 源码
│   └── Cargo.toml          # Rust 依赖配置
├── scripts/                # 构建脚本
│   ├── prepareSidecar.mjs  # 生成 Sidecar 启动器
│   ├── buildIcon.mjs       # 构建图标
│   └── ...
└── package.json            # 项目配置
```

## 常见问题

### Q1: `tauri` 命令未找到

确保已经运行 `pnpm install` 安装了所有依赖。`tauri` CLI 会自动安装到 `node_modules/.bin` 目录。

### Q2: PowerShell 脚本执行被阻止

参考上面的"Windows 系统额外要求"，修改执行策略。

### Q3: Cargo 依赖下载超时

配置 Cargo 镜像源（参考上面的配置步骤），或使用代理。

### Q4: 缺少 `memPet-server-x86_64-pc-windows-msvc.exe`

运行 `pnpm run sidecar:prepare` 生成启动器文件。

### Q5: 如何调试 Rust 代码

```bash
# 检查 Rust 代码
cd src-tauri
cargo check

# 运行测试
cargo test

# 查看日志
cargo run
```

## 调试技巧

1. **前端调试**：在浏览器开发者工具中调试（开发模式会自动打开）
2. **Rust 调试**：使用 `println!` 或 `dbg!` 宏输出日志
3. **查看日志**：Tauri 日志会输出到终端

## 技术栈

- **框架**: Vue 3 + TypeScript
- **UI**: Ant Design Vue + UnoCSS
- **桌面**: Tauri 2.0
- **状态管理**: Pinia
- **路由**: Vue Router
- **构建工具**: Vite

## 许可证

MIT License
