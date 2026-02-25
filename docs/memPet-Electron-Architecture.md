# memPet Electron 完整技术方案

> 基于 Electron + React + Python memU 的桌面宠物应用
>
> 2026-02-25 更新：主运行链路已切换为 `memPet-desktop`（Tauri）；`memPet-UI` 进入冻结维护，仅作参考实现。

---

## 目录

1. [整体架构](#整体架构)
2. [技术栈](#技术栈)
3. [项目结构](#项目结构)
4. [核心功能](#核心功能)
5. [数据流图](#数据流图)
6. [实现细节](#实现细节)

---

## 整体架构

### 三层架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                        memPet Desktop App                           │
│                     (Electron + React + TypeScript)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    渲染进程 (Renderer)                        │  │
│  │                      React + TypeScript                       │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                              │  │
│  │  🎨 UI 层                                                     │  │
│  │  ├─ PetCanvas (Live2D 宠物渲染)                              │  │
│  │  ├─ ChatPanel (对话界面)                                     │  │
│  │  ├─ MemoryBrowser (记忆浏览器)                               │  │
│  │  └─ SettingsPanel (设置面板)                                 │  │
│  │                                                              │  │
│  │  🔌 IPC 通信层                                                │  │
│  │  └─ window.electron.invoke() ──────────────────┐             │  │
│  │                                                │             │  │
│  └────────────────────────────────────────────────┼─────────────┘  │
│                                                   │                │
│                                                   ▼                │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    主进程 (Main)                           │   │
│  │                   Node.js + TypeScript                     │   │
│  ├────────────────────────────────────────────────────────────┤   │
│  │                                                            │   │
│  │  📡 IPC 处理层                                              │   │
│  │  ├─ ipcMain.handle('memorize', ...)                       │   │
│  │  ├─ ipcMain.handle('retrieve', ...)                       │   │
│  │  └─ ipcMain.handle('get-categories', ...)                 │   │
│  │                                                            │   │
│  │  🔧 业务逻辑层                                              │   │
│  │  ├─ MemUService (memU 服务管理)                           │   │
│  │  ├─ SystemMonitor (系统监控)                              │   │
│  │  ├─ ContextDetector (上下文检测)                          │   │
│  │  └─ BehaviorManager (行为管理)                            │   │
│  │                                                            │   │
│  │  🔌 子进程管理                                              │   │
│  │  └─ child_process.spawn('python', ...)                    │   │
│  │                                                            │   │
│  └────────────────────────────────┬───────────────────────────┘   │
│                                   │ HTTP (localhost:8000)         │
└───────────────────────────────────┼───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   memPet-server Service         │
                    │   (子进程)                    │
                    ├───────────────────────────────┤
                    │                               │
                    │  FastAPI Server               │
                    │  ├─ POST /memorize            │
                    │  ├─ POST /retrieve            │
                    │  └─ GET /                     │
                    │                               │
                    │  memU Core (memu-py)          │
                    │  ├─ MemoryService             │
                    │  ├─ Embedding                 │
                    │  └─ LLM Integration           │
                    │                               │
                    └───────────┬───────────────────┘
                                │
                                ▼
                    ┌───────────────────────────────┐
                    │   SQLite Database             │
                    │   %APPDATA%/memPet/data/      │
                    │   - conversation-*.json       │
                    │   - memory.db                 │
                    └───────────────────────────────┘
```

---

## 技术栈

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 28.x | 桌面应用框架 |
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具 |
| TailwindCSS | 3.x | 样式框架 |
| Zustand | 4.x | 状态管理 |
| Live2D | 4.x | 宠物渲染 |

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20.x | 主进程运行时 |
| Python | 3.13+ | memPet-server 运行时 |
| memPet-server | latest | 后端 API 服务 |
| memu-py | 1.2.0+ | 记忆引擎核心库 |
| SQLite | 3.x | 本地数据库 |
| axios | 1.x | HTTP 客户端 |

### 打包工具

| 工具 | 用途 |
|------|------|
| electron-builder | Electron 应用打包 |
| PyInstaller | Python 服务打包 |

---


## 项目结构

```
memPet/
├── src/                          # 前端源码
│   ├── renderer/                 # 渲染进程
│   │   ├── components/
│   │   │   ├── Pet/
│   │   │   │   ├── PetCanvas.tsx          # Live2D 宠物渲染
│   │   │   │   ├── PetBehavior.tsx        # 行为控制
│   │   │   │   └── PetAnimation.tsx       # 动画管理
│   │   │   ├── Chat/
│   │   │   │   ├── ChatPanel.tsx          # 对话面板
│   │   │   │   ├── MessageList.tsx        # 消息列表
│   │   │   │   └── InputBox.tsx           # 输入框
│   │   │   ├── Memory/
│   │   │   │   ├── MemoryBrowser.tsx      # 记忆浏览器
│   │   │   │   ├── CategoryTree.tsx       # 分类树
│   │   │   │   └── MemoryCard.tsx         # 记忆卡片
│   │   │   └── Settings/
│   │   │       ├── PersonalitySettings.tsx # 性格设置
│   │   │       ├── BehaviorSettings.tsx    # 行为设置
│   │   │       └── GeneralSettings.tsx     # 通用设置
│   │   ├── hooks/
│   │   │   ├── useMemU.ts                 # memU 操作 Hook
│   │   │   ├── usePet.ts                  # 宠物状态 Hook
│   │   │   └── useChat.ts                 # 对话 Hook
│   │   ├── stores/
│   │   │   ├── petStore.ts                # 宠物状态
│   │   │   ├── chatStore.ts               # 对话状态
│   │   │   └── memoryStore.ts             # 记忆状态
│   │   ├── types/
│   │   │   ├── pet.ts                     # 宠物类型定义
│   │   │   ├── memory.ts                  # 记忆类型定义
│   │   │   └── electron.d.ts              # Electron API 类型
│   │   ├── App.tsx                        # 根组件
│   │   └── main.tsx                       # 入口文件
│   │
│   └── main/                     # 主进程
│       ├── index.ts                       # 主进程入口
│       ├── services/
│       │   ├── MemUService.ts             # memU 服务管理
│       │   ├── SystemMonitor.ts           # 系统监控
│       │   ├── ContextDetector.ts         # 上下文检测
│       │   └── BehaviorManager.ts         # 行为管理
│       ├── ipc/
│       │   ├── memoryHandlers.ts          # 记忆相关 IPC
│       │   ├── systemHandlers.ts          # 系统相关 IPC
│       │   └── petHandlers.ts             # 宠物相关 IPC
│       └── utils/
│           ├── logger.ts                  # 日志工具
│           └── config.ts                  # 配置管理
│
├── memPet-server/                  # memPet-server 后端服务
│   ├── app/                               # FastAPI 应用
│   │   ├── main.py                        # 服务入口
│   │   ├── database.py                    # 数据库配置
│   │   └── ...
│   ├── pyproject.toml                     # Python 依赖配置
│   └── README.md
│
├── resources/                    # 资源文件
│   ├── memu-server.exe                    # 打包的 memPet-server（Windows）
│   ├── models/                            # Live2D 模型
│   └── icons/                             # 应用图标
│
├── scripts/                      # 构建脚本
│   ├── build-server.js                    # 打包 memPet-server
│   └── build-electron.js                  # 打包 Electron
│
├── electron-builder.json         # Electron 打包配置
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 核心功能

### 1. 记忆管理

```typescript
// 存储记忆（对话格式）
await window.electron.memorize({
  content: [
    { role: "user", content: { text: "我喜欢喝咖啡" }, created_at: "2024-02-12 10:30:00" },
    { role: "assistant", content: { text: "好的，我记住了！" }, created_at: "2024-02-12 10:30:05" }
  ]
})

// 检索记忆
const memories = await window.electron.retrieve({
  query: "用户的饮食偏好"
})
```

### 2. 宠物行为

```typescript
// 行为类型
enum PetBehavior {
  Idle = 'idle',           // 待机
  Walking = 'walking',     // 行走
  Sleeping = 'sleeping',   // 睡觉
  Thinking = 'thinking',   // 思考
  Talking = 'talking',     // 说话
  Celebrating = 'celebrating', // 庆祝
  Worrying = 'worrying',   // 担心
}

// 触发行为
await window.electron.setPetBehavior(PetBehavior.Talking)
```

### 3. 上下文感知

```typescript
// 获取用户上下文
const context = await window.electron.getUserContext()

// 返回：
{
  timestamp: "2024-02-12T10:30:00Z",
  isWorkHours: true,
  isLateNight: false,
  workingDuration: 7200,  // 2小时（秒）
  activeApp: "VSCode",
  userMode: "Working",
  focusLevel: "NormalFocus",
  fatigueLevel: "Normal"
}
```

### 4. 性格系统

```typescript
// 性格类型
enum Personality {
  Friendly = 'friendly',       // 友好型
  Energetic = 'energetic',     // 活力型
  Professional = 'professional', // 专业型
  Tsundere = 'tsundere',       // 傲娇型
}

// 设置性格
await window.electron.setPersonality({
  personality: Personality.Friendly,
  emojiFrequency: 0.3,
  proactiveLevel: 0.7,
  formality: 0.5
})
```

---


## 数据流图

### 1. 用户对话流程

```
用户输入："我今天做了什么？"
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 渲染进程 (React)                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ChatPanel.tsx                                               │
│     ├─ 用户输入消息                                              │
│     ├─ 显示"思考中..."动画                                       │
│     └─ 调用 IPC                                                 │
│         │                                                       │
│         ▼                                                       │
│  window.electron.invoke('chat-message', {                      │
│    message: "我今天做了什么？",                                  │
│    userId: "user123"                                            │
│  })                                                             │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ IPC 通信
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 主进程 (Node.js)                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  2. ipcMain.handle('chat-message')                              │
│     │                                                           │
│     ├─ 获取用户上下文                                            │
│     │  const context = await contextDetector.detect()          │
│     │  // { workingDuration: 7200, activeApp: "VSCode", ... }  │
│     │                                                           │
│     ├─ 检索相关记忆                                              │
│     │  const memories = await memuService.retrieve({           │
│     │    query: "今天的活动"                                    │
│     │  })                                                       │
│     │      │                                                    │
│     │      ▼                                                    │
│     │  HTTP POST http://localhost:8000/retrieve                │
│     │                                                           │
│     ├─ 构建完整上下文                                            │
│     │  const fullContext = {                                   │
│     │    userMessage: "我今天做了什么？",                        │
│     │    memories: [                                            │
│     │      "09:00 开始写代码",                                  │
│     │      "14:00 参加会议",                                    │
│     │      "20:00 阅读文档"                                     │
│     │    ],                                                     │
│     │    context: { workingDuration: 7200, ... }               │
│     │  }                                                        │
│     │                                                           │
│     ├─ 调用 LLM 生成回复                                         │
│     │  const response = await llmClient.chat({                 │
│     │    systemPrompt: personality.getPrompt(),                │
│     │    context: fullContext                                  │
│     │  })                                                       │
│     │  // "你今天很充实呢！上午专注写代码，下午参加了会议..."    │
│     │                                                           │
│     ├─ 存储对话记录                                              │
│     │  await memuService.memorize({                            │
│     │    content: [                                            │
│     │      { role: "user", content: { text: "..." } },        │
│     │      { role: "assistant", content: { text: "..." } }    │
│     │    ]                                                     │
│     │  })                                                       │
│     │      │                                                    │
│     │      ▼                                                    │
│     │  HTTP POST http://localhost:8000/memorize                │
│     │                                                           │
│     └─ 返回结果                                                  │
│        return {                                                 │
│          response: "你今天很充实呢！...",                        │
│          behavior: "talking"                                    │
│        }                                                        │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ IPC 返回
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 渲染进程 (React)                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  3. ChatPanel.tsx                                               │
│     ├─ 接收回复                                                  │
│     ├─ 显示消息                                                  │
│     └─ 触发宠物说话动画                                          │
│                                                                 │
│  4. PetCanvas.tsx                                               │
│     ├─ 切换到 "talking" 行为                                     │
│     ├─ 播放说话动画                                              │
│     └─ 显示对话气泡                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. 系统监控与主动推理流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 主进程 (Node.js) - 后台循环                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SystemMonitor.startMonitoring()                                │
│  └─ setInterval(async () => {                                  │
│                                                                 │
│      // 每 30 秒执行一次                                         │
│      ┌─────────────────────────────────────────────────────┐   │
│      │ 1. 获取系统状态                                      │   │
│      ├─────────────────────────────────────────────────────┤   │
│      │                                                     │   │
│      │  const activeWindow = getActiveWindow()            │   │
│      │  // { app: "VSCode", title: "main.ts" }            │   │
│      │                                                     │   │
│      │  const idleTime = getIdleTime()                    │   │
│      │  // 120 秒                                          │   │
│      │                                                     │   │
│      └─────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│      ┌─────────────────────────────────────────────────────┐   │
│      │ 2. 检测上下文变化                                    │   │
│      ├─────────────────────────────────────────────────────┤   │
│      │                                                     │   │
│      │  if (activeWindow !== lastWindow) {                │   │
│      │    const duration = now - lastChangeTime           │   │
│      │                                                     │   │
│      │    if (duration > 5 * 60) {  // 超过 5 分钟        │   │
│      │      // 记录活动                                    │   │
│      │      await memuService.memorize({                  │   │
│      │        content: [                                  │   │
│      │          {                                         │   │
│      │            role: "system",                         │   │
│      │            content: {                              │   │
│      │              text: `用户在 ${lastWindow.app}       │   │
│      │                     工作了 ${duration/60} 分钟`    │   │
│      │            },                                      │   │
│      │            created_at: new Date().toISOString()   │   │
│      │          }                                         │   │
│      │        ]                                           │   │
│      │      })                                            │   │
│      │    }                                                │   │
│      │  }                                                  │   │
│      │                                                     │   │
│      └─────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│      ┌─────────────────────────────────────────────────────┐   │
│      │ 3. 检测是否需要主动干预                              │   │
│      ├─────────────────────────────────────────────────────┤   │
│      │                                                     │   │
│      │  const context = await contextDetector.detect()    │   │
│      │                                                     │   │
│      │  // 检测疲劳                                         │   │
│      │  if (context.workingDuration > 2 * 3600) {         │   │
│      │    // 连续工作超过 2 小时                           │   │
│      │                                                     │   │
│      │    // 生成关心的话                                   │   │
│      │    const suggestion = await llmClient.chat({       │   │
│      │      prompt: `用户已经连续工作 2 小时了，           │   │
│      │               请生成一句关心的话，建议休息`         │   │
│      │    })                                               │   │
│      │                                                     │   │
│      │    // 发送到渲染进程                                 │   │
│      │    mainWindow.webContents.send(                    │   │
│      │      'proactive-suggestion',                       │   │
│      │      {                                              │   │
│      │        message: suggestion,                        │   │
│      │        behavior: 'worrying',                       │   │
│      │        priority: 'high'                            │   │
│      │      }                                              │   │
│      │    )                                                │   │
│      │  }                                                  │   │
│      │                                                     │   │
│      └─────────────────────────────────────────────────────┘   │
│                                                                 │
│  }, 30000)  // 30 秒                                            │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ IPC 推送
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 渲染进程 (React)                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  window.electron.on('proactive-suggestion', (data) => {         │
│                                                                 │
│    // 显示主动建议                                               │
│    chatStore.addMessage({                                       │
│      role: 'assistant',                                         │
│      content: data.message,                                     │
│      isProactive: true                                          │
│    })                                                           │
│                                                                 │
│    // 切换宠物行为                                               │
│    petStore.setBehavior(data.behavior)                          │
│                                                                 │
│    // 显示通知（可选）                                           │
│    if (data.priority === 'high') {                              │
│      new Notification('memPet 提醒', {                          │
│        body: data.message                                       │
│      })                                                         │
│    }                                                            │
│  })                                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. 记忆检索流程

```
用户点击"查看记忆"
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 渲染进程 - MemoryBrowser.tsx                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 获取分类列表                                                 │
│     const categories = await window.electron.invoke(            │
│       'get-categories',                                         │
│       { userId: 'user123' }                                     │
│     )                                                           │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 渲染进程 - MemoryBrowser.tsx                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 加载记忆列表                                                 │
│     const memories = await window.electron.invoke(              │
│       'retrieve-memories',                                      │
│       { query: "所有记忆" }                                      │
│     )                                                           │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 主进程 - memoryHandlers.ts                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ipcMain.handle('retrieve-memories', async (event, opts) => {   │
│                                                                 │
│    const result = await memuService.retrieve(opts)             │
│                                                                 │
│    return result  // { status: "success", result: [...] }      │
│  })                                                             │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ memPet-server Service                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POST /retrieve                                                 │
│  {                                                              │
│    "query": "所有记忆"                                           │
│  }                                                              │
│                                                                 │
│  MemoryService.retrieve()                                       │
│  └─ 查询向量数据库和 SQLite                                      │
│                                                                 │
│  返回记忆列表                                                     │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 渲染进程 - MemoryBrowser.tsx                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  2. 显示记忆卡片                                                 │
│     {memories.map(memory => (                                   │
│       <MemoryCard key={memory.id} memory={memory} />           │
│     ))}                                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---


## 实现细节

### 1. 主进程 - memPet-server 服务管理

```typescript
// src/main/services/MemUService.ts

import { spawn, ChildProcess } from 'child_process';
import axios, { AxiosInstance } from 'axios';
import path from 'path';
import { app } from 'electron';
import fs from 'fs-extra';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: {
    text: string;
  };
  created_at: string;
}

export interface MemorizeOptions {
  content: ConversationMessage[];
}

export interface RetrieveOptions {
  query: string;
}

export interface Memory {
  id: string;
  content: string;
  summary?: string;
  category?: string;
  memoryType?: string;
  timestamp: number;
}

export class MemUService {
  private process: ChildProcess | null = null;
  private client: AxiosInstance;
  private port: number = 8000;
  private baseUrl: string;
  private dataDir: string;

  constructor() {
    this.baseUrl = `http://localhost:${this.port}`;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    // 获取数据目录
    this.dataDir = path.join(app.getPath('userData'), 'memU');
  }

  /**
   * 启动 memPet-server 服务
   */
  async start(): Promise<void> {
    console.log('启动 memPet-server 服务...');

    // 确保数据目录存在
    await fs.ensureDir(this.dataDir);

    // 获取打包的可执行文件路径
    const isDev = !app.isPackaged;
    const serverExePath = isDev
      ? 'uvx'  // 开发环境使用 uvx 运行
      : path.join(process.resourcesPath, 'memu-server.exe');  // 生产环境使用打包的 exe

    const args = isDev
      ? ['fastapi', 'dev', path.join(__dirname, '../../memPet-server/app/main.py')]
      : [];

    // 启动子进程
    this.process = spawn(serverExePath, args, {
      env: {
        ...process.env,
        STORAGE_PATH: this.dataDir,  // 数据存储路径
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',  // 需要配置
        DATABASE_URL: `sqlite:///${path.join(this.dataDir, 'memory.db')}`,  // SQLite 数据库
      },
      cwd: isDev ? path.join(__dirname, '../../memPet-server') : undefined,
    });

    // 监听输出
    this.process.stdout?.on('data', (data) => {
      console.log(`[memPet-server] ${data.toString()}`);
    });

    this.process.stderr?.on('data', (data) => {
      console.error(`[memPet-server Error] ${data.toString()}`);
    });

    this.process.on('exit', (code) => {
      console.log(`memPet-server 服务退出，代码: ${code}`);
    });

    // 等待服务就绪
    await this.waitForReady();
    console.log('✓ memPet-server 服务已启动');
  }

  /**
   * 等待服务就绪
   */
  private async waitForReady(maxRetries: number = 30): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.client.get('/');
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('memPet-server 服务启动超时');
  }

  /**
   * 存储记忆（对话格式）
   */
  async memorize(options: MemorizeOptions): Promise<any> {
    try {
      const response = await this.client.post('/memorize', {
        content: options.content,
      });

      return response.data;
    } catch (error) {
      console.error('存储记忆失败:', error);
      throw error;
    }
  }

  /**
   * 检索记忆
   */
  async retrieve(options: RetrieveOptions): Promise<any> {
    try {
      const response = await this.client.post('/retrieve', {
        query: options.query,
      });

      return response.data;
    } catch (error) {
      console.error('检索记忆失败:', error);
      throw error;
    }
  }

  /**
   * 停止服务
   */
  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
      console.log('✓ memPet-server 服务已停止');
    }
  }

  /**
   * 获取数据目录
   */
  getDataDir(): string {
    return this.dataDir;
  }
}
```

---

### 2. 主进程 - 系统监控

```typescript
// src/main/services/SystemMonitor.ts

import { powerMonitor, screen } from 'electron';
import activeWin from 'active-win';

export interface WindowInfo {
  app: string;
  title: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class SystemMonitor {
  private lastWindow: WindowInfo | null = null;
  private lastChangeTime: number = Date.now();
  private windowSwitchCount: number = 0;
  private monitorInterval: NodeJS.Timeout | null = null;

  /**
   * 开始监控
   */
  startMonitoring(callback: (window: WindowInfo) => void): void {
    this.monitorInterval = setInterval(async () => {
      const currentWindow = await this.getActiveWindow();

      if (currentWindow && this.hasWindowChanged(currentWindow)) {
        const duration = Date.now() - this.lastChangeTime;

        // 如果在同一个窗口停留超过 5 分钟，触发回调
        if (duration > 5 * 60 * 1000) {
          callback(this.lastWindow!);
        }

        this.lastWindow = currentWindow;
        this.lastChangeTime = Date.now();
        this.windowSwitchCount++;
      }
    }, 30000); // 每 30 秒检查一次
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * 获取活动窗口
   */
  async getActiveWindow(): Promise<WindowInfo | null> {
    try {
      const window = await activeWin();
      if (!window) return null;

      return {
        app: window.owner.name,
        title: window.title,
        bounds: window.bounds,
      };
    } catch (error) {
      console.error('获取活动窗口失败:', error);
      return null;
    }
  }

  /**
   * 获取空闲时间（秒）
   */
  getIdleTime(): number {
    return powerMonitor.getSystemIdleTime();
  }

  /**
   * 检查是否全屏
   */
  isFullscreen(): boolean {
    const displays = screen.getAllDisplays();
    // 简化实现，实际需要检查活动窗口是否覆盖整个屏幕
    return false;
  }

  /**
   * 获取最近 5 分钟的窗口切换次数
   */
  getWindowSwitchCount(): number {
    return this.windowSwitchCount;
  }

  /**
   * 重置窗口切换计数
   */
  resetWindowSwitchCount(): void {
    this.windowSwitchCount = 0;
  }

  /**
   * 检查窗口是否变化
   */
  private hasWindowChanged(current: WindowInfo): boolean {
    if (!this.lastWindow) return true;
    return (
      this.lastWindow.app !== current.app ||
      this.lastWindow.title !== current.title
    );
  }
}
```

---

### 3. 主进程 - IPC 处理器

```typescript
// src/main/ipc/memoryHandlers.ts

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { MemUService } from '../services/MemUService';

export function registerMemoryHandlers(memuService: MemUService): void {
  /**
   * 存储记忆
   */
  ipcMain.handle(
    'memorize',
    async (
      event: IpcMainInvokeEvent,
      options: {
        content: ConversationMessage[];
      }
    ) => {
      try {
        const result = await memuService.memorize(options);
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  /**
   * 检索记忆
   */
  ipcMain.handle(
    'retrieve',
    async (
      event: IpcMainInvokeEvent,
      options: {
        query: string;
      }
    ) => {
      try {
        const result = await memuService.retrieve(options);
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  /**
   * 获取数据目录
   */
  ipcMain.handle('get-data-dir', async () => {
    return memuService.getDataDir();
  });
}
```

---

### 4. 主进程入口

```typescript
// src/main/index.ts

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { MemUService } from './services/MemUService';
import { SystemMonitor } from './services/SystemMonitor';
import { registerMemoryHandlers } from './ipc/memoryHandlers';

let mainWindow: BrowserWindow | null = null;
let memuService: MemUService | null = null;
let systemMonitor: SystemMonitor | null = null;

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 加载页面
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

/**
 * 应用启动
 */
app.whenReady().then(async () => {
  console.log('应用启动中...');

  // 1. 启动 memU 服务
  memuService = new MemUService();
  await memuService.start();

  // 2. 注册 IPC 处理器
  registerMemoryHandlers(memuService);

  // 3. 启动系统监控
  systemMonitor = new SystemMonitor();
  systemMonitor.startMonitoring(async (window) => {
    // 记录用户活动
    const duration = Math.floor((Date.now() - Date.now()) / 1000 / 60);
    await memuService?.memorize({
      content: [
        {
          role: 'system',
          content: {
            text: `用户在 ${window.app} 工作了 ${duration} 分钟`,
          },
          created_at: new Date().toISOString(),
        },
      ],
    });
  });

  // 4. 创建窗口
  createWindow();

  console.log('✓ 应用启动完成');
});

/**
 * 应用退出
 */
app.on('quit', () => {
  console.log('应用退出中...');

  // 停止服务
  systemMonitor?.stopMonitoring();
  memuService?.stop();

  console.log('✓ 应用已退出');
});

/**
 * 所有窗口关闭
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

---


### 5. Preload 脚本 - IPC 桥接

```typescript
// src/main/preload.ts

import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electron', {
  /**
   * 存储记忆（对话格式）
   */
  memorize: (options: {
    content: Array<{
      role: 'user' | 'assistant' | 'system';
      content: { text: string };
      created_at: string;
    }>;
  }) => ipcRenderer.invoke('memorize', options),

  /**
   * 检索记忆
   */
  retrieve: (options: {
    query: string;
  }) => ipcRenderer.invoke('retrieve', options),

  /**
   * 获取数据目录
   */
  getDataDir: () => ipcRenderer.invoke('get-data-dir'),

  /**
   * 监听主动建议
   */
  onProactiveSuggestion: (
    callback: (data: {
      message: string;
      behavior: string;
      priority: string;
    }) => void
  ) => {
    ipcRenderer.on('proactive-suggestion', (event, data) => callback(data));
  },

  /**
   * 移除监听
   */
  removeProactiveSuggestionListener: () => {
    ipcRenderer.removeAllListeners('proactive-suggestion');
  },
});
```

---

### 6. 渲染进程 - 类型定义

```typescript
// src/renderer/types/electron.d.ts

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: { text: string };
  created_at: string;
}

export interface ElectronAPI {
  memorize: (options: {
    content: ConversationMessage[];
  }) => Promise<{ success: boolean; data?: any; error?: string }>;

  retrieve: (options: {
    query: string;
  }) => Promise<{ success: boolean; data?: any; error?: string }>;

  getDataDir: () => Promise<string>;

  onProactiveSuggestion: (
    callback: (data: {
      message: string;
      behavior: string;
      priority: string;
    }) => void
  ) => void;

  removeProactiveSuggestionListener: () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
```

---

### 7. 渲染进程 - memU Hook

```typescript
// src/renderer/hooks/useMemU.ts

import { useState, useCallback } from 'react';

export interface Memory {
  id: string;
  content: string;
  summary?: string;
  category?: string;
  memoryType?: string;
  timestamp: number;
}

export function useMemU() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 存储记忆（对话格式）
   */
  const memorize = useCallback(
    async (messages: Array<{ role: string; content: string }>) => {
      setLoading(true);
      setError(null);

      try {
        const formattedMessages = messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: { text: msg.content },
          created_at: new Date().toISOString(),
        }));

        const result = await window.electron.memorize({
          content: formattedMessages,
        });

        if (!result.success) {
          throw new Error(result.error || '存储失败');
        }

        return result.data;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 检索记忆
   */
  const retrieve = useCallback(
    async (query: string): Promise<any> => {
      setLoading(true);
      setError(null);

      try {
        const result = await window.electron.retrieve({ query });

        if (!result.success) {
          throw new Error(result.error || '检索失败');
        }

        return result.data;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    memorize,
    retrieve,
    loading,
    error,
  };
}
```

---

### 8. 渲染进程 - 对话组件

```typescript
// src/renderer/components/Chat/ChatPanel.tsx

import React, { useState, useEffect } from 'react';
import { useMemU } from '../../hooks/useMemU';
import { useChatStore } from '../../stores/chatStore';
import { usePetStore } from '../../stores/petStore';

export const ChatPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const { memorize, retrieve } = useMemU();
  const { messages, addMessage } = useChatStore();
  const { setBehavior } = usePetStore();

  /**
   * 发送消息
   */
  const handleSend = async () => {
    if (!input.trim()) return;

    // 添加用户消息
    addMessage({
      role: 'user',
      content: input,
      timestamp: Date.now(),
    });

    // 切换到思考状态
    setBehavior('thinking');

    try {
      // 1. 检索相关记忆
      const memoryResult = await retrieve(input);

      // 2. 调用 LLM 生成回复（这里简化，实际需要调用 LLM API）
      const response = await generateResponse(input, memoryResult);

      // 3. 存储对话（对话格式）
      await memorize([
        { role: 'user', content: input },
        { role: 'assistant', content: response },
      ]);

      // 4. 添加助手消息
      addMessage({
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      });

      // 5. 切换到说话状态
      setBehavior('talking');
    } catch (error) {
      console.error('发送消息失败:', error);
      addMessage({
        role: 'assistant',
        content: '抱歉，我遇到了一些问题...',
        timestamp: Date.now(),
      });
    }

    setInput('');
  };

  /**
   * 监听主动建议
   */
  useEffect(() => {
    window.electron.onProactiveSuggestion((data) => {
      addMessage({
        role: 'assistant',
        content: data.message,
        timestamp: Date.now(),
        isProactive: true,
      });

      setBehavior(data.behavior);
    });

    return () => {
      window.electron.removeProactiveSuggestionListener();
    };
  }, []);

  return (
    <div className="chat-panel">
      <div className="messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.role} ${
              msg.isProactive ? 'proactive' : ''
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <div className="input-box">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="和我聊聊吧..."
        />
        <button onClick={handleSend}>发送</button>
      </div>
    </div>
  );
};

/**
 * 生成回复（简化版，实际需要调用 LLM）
 */
async function generateResponse(
  input: string,
  memories: any[]
): Promise<string> {
  // 这里应该调用 LLM API，传入 input 和 memories
  // 暂时返回模拟数据
  return `收到你的消息："${input}"。我找到了 ${memories.length} 条相关记忆。`;
}
```

---


### 9. 打包配置

```json
// electron-builder.json

{
  "appId": "com.mempet.app",
  "productName": "memPet",
  "directories": {
    "output": "dist",
    "buildResources": "resources"
  },
  "files": [
    "dist-electron/**/*",
    "dist-renderer/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "resources/memu-server.exe",
      "to": "memu-server.exe"
    },
    {
      "from": "resources/models",
      "to": "models"
    }
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ],
    "icon": "resources/icons/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "memPet",
    "language": "2052"
  },
  "mac": {
    "target": ["dmg"],
    "icon": "resources/icons/icon.icns",
    "category": "public.app-category.productivity"
  },
  "linux": {
    "target": ["AppImage"],
    "icon": "resources/icons/icon.png",
    "category": "Utility"
  }
}
```

---

### 10. 打包脚本

```javascript
// scripts/build-server.js

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function buildMemUServer() {
  console.log('开始打包 memPet-server 服务...');

  const serverDir = path.join(__dirname, '../memPet-server');
  const outputDir = path.join(__dirname, '../resources');

  // 确保输出目录存在
  await fs.ensureDir(outputDir);

  // 进入 memPet-server 目录
  process.chdir(serverDir);

  // 安装依赖
  console.log('安装 memPet-server 依赖...');
  execSync('uv sync', { stdio: 'inherit' });
  execSync('uv pip install pyinstaller', { stdio: 'inherit' });

  // 使用 PyInstaller 打包
  console.log('使用 PyInstaller 打包...');
  execSync(
    `pyinstaller --onefile --name memu-server ` +
    `--hidden-import memu ` +
    `--hidden-import fastapi ` +
    `--hidden-import uvicorn ` +
    `--hidden-import sqlalchemy ` +
    `--collect-all memu ` +
    `app/main.py`,
    { stdio: 'inherit' }
  );

  // 复制到 resources 目录
  const exePath = path.join(serverDir, 'dist', 'memu-server.exe');
  const targetPath = path.join(outputDir, 'memu-server.exe');

  console.log('复制到 resources 目录...');
  await fs.copy(exePath, targetPath);

  console.log('✓ memPet-server 服务打包完成');
}

buildMemUServer().catch((error) => {
  console.error('打包失败:', error);
  process.exit(1);
});
```

---

### 11. package.json 脚本

```json
// package.json

{
  "name": "mempet",
  "version": "1.0.0",
  "description": "AI 桌面宠物",
  "main": "dist-electron/main/index.js",
  "scripts": {
    "dev": "vite",
    "dev:server": "cd memPet-server && uv run fastapi dev",
    "build": "npm run build:server && npm run build:electron",
    "build:server": "node scripts/build-server.js",
    "build:electron": "tsc && vite build && electron-builder",
    "build:win": "npm run build -- --win",
    "build:mac": "npm run build -- --mac",
    "build:linux": "npm run build -- --linux"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.5.0",
    "axios": "^1.6.0",
    "active-win": "^8.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-electron": "^0.28.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 部署流程

### 开发环境

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/memPet.git
cd memPet

# 2. 安装依赖
npm install

# 3. 安装 Python 依赖（需要先安装 uv）
cd memPet-server
uv sync
cd ..

# 4. 配置环境变量
# 创建 memPet-server/.env 文件
echo "OPENAI_API_KEY=your_api_key_here" > memPet-server/.env

# 5. 启动开发服务器
# 终端 1: 启动 memPet-server
npm run dev:server

# 终端 2: 启动 Electron
npm run dev
```

### 生产环境打包

```bash
# 1. 打包 memPet-server 服务
npm run build:server

# 2. 打包 Electron 应用
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux

# 3. 输出文件
# Windows: dist/memPet-Setup-1.0.0.exe (~200MB)
# macOS: dist/memPet-1.0.0.dmg
# Linux: dist/memPet-1.0.0.AppImage
```

---

## 性能指标

| 指标 | 数值 |
|------|------|
| 安装包大小 | ~200MB |
| 安装后大小 | ~400MB |
| 启动时间 | ~3-5 秒 |
| 内存占用 | 200-350MB |
| CPU 占用（空闲） | <5% |
| CPU 占用（活跃） | 10-20% |

---

## 数据存储

### 目录结构

```
Windows: C:\Users\{用户}\AppData\Roaming\memPet\
├── memU\
│   ├── conversation-*.json    # 对话记录文件
│   └── memory.db              # SQLite 数据库
├── config\
│   ├── settings.json          # 应用设置
│   └── personality.json       # 性格配置
└── logs\
    └── app.log                # 应用日志

macOS: ~/Library/Application Support/memPet/
Linux: ~/.local/share/memPet/
```

### 数据库表结构

```sql
-- 记忆表
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  summary TEXT,
  category TEXT,
  memory_type TEXT,
  user_id TEXT,
  timestamp INTEGER,
  metadata TEXT
);

-- 分类表
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT,
  user_id TEXT,
  created_at INTEGER
);

-- 资源表
CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  modality TEXT,
  user_id TEXT,
  created_at INTEGER
);
```

---

## 跨平台注意事项

### Windows

- 使用 NSIS 安装器
- 需要管理员权限安装
- 支持开机自启动

### macOS

- 需要代码签名
- 需要公证（Notarization）
- 支持拖拽安装

### Linux

- 使用 AppImage 格式
- 需要设置执行权限
- 支持多种发行版

---

## 总结

这个方案的核心优势：

1. **完全本地化**：数据存储在用户本地，隐私安全
2. **开发体验好**：JavaScript/TypeScript 生态，开发效率高
3. **功能完整**：复用完整的 memU 功能
4. **跨平台支持**：一套代码，三个平台
5. **易于维护**：前后端分离，职责清晰

主要挑战：

1. **打包体积较大**：~200MB（包含 Electron + Python + memPet-server）
2. **内存占用**：200-350MB
3. **跨平台打包**：需要在各平台分别打包
4. **依赖管理**：需要配置 OPENAI_API_KEY 等环境变量

但对于桌面应用来说，这些都是可接受的代价。

---

## 与 memPet-server 集成的优势

1. **标准化 API**：使用 memPet-server 提供的标准 REST API
2. **简化维护**：memPet-server 独立维护和更新
3. **功能完整**：直接使用 memu-py 核心库的所有功能
4. **数据持久化**：支持 SQLite 本地存储和 PostgreSQL 扩展
5. **易于调试**：可以独立测试 memPet-server 服务
