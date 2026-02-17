# memPet UI 开发指南

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

这将启动：
- Vite 开发服务器（端口 5173）
- Electron 应用窗口
- 热重载功能

### 3. 开发调试

开发模式下会自动打开 DevTools，可以查看控制台输出和调试代码。

## 项目结构说明

```
memPet-UI/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts            # 主进程入口，创建窗口
│   │   └── preload.ts          # Preload 脚本，暴露安全 API
│   │
│   └── renderer/                # React 渲染进程
│       ├── components/          # React 组件
│       ├── hooks/              # 自定义 Hooks
│       │   └── useMemU.ts      # memU 服务 Hook
│       ├── stores/             # Zustand 状态管理
│       │   ├── chatStore.ts    # 对话状态
│       │   ├── memoryStore.ts  # 记忆状态
│       │   └── petStore.ts     # 宠物状态
│       ├── types/              # TypeScript 类型定义
│       │   └── electron.d.ts   # Electron API 类型
│       ├── utils/              # 工具函数
│       │   └── helpers.ts      # 通用辅助函数
│       ├── App.tsx             # 根组件
│       ├── main.tsx            # React 入口
│       └── index.css           # 全局样式
│
├── index.html                   # HTML 模板
├── vite.config.ts              # Vite 配置
├── tsconfig.json               # TypeScript 配置
├── tailwind.config.js          # TailwindCSS 配置
└── electron-builder.json       # Electron 打包配置
```

## 核心功能模块

### 1. 状态管理（Zustand）

#### chatStore - 对话状态
- 管理消息列表
- 处理用户和 AI 的对话
- 支持主动推理消息

#### memoryStore - 记忆状态
- 管理记忆列表
- 记忆分类
- 记忆检索结果

#### petStore - 宠物状态
- 宠物行为状态
- 当前显示的消息
- 宠物位置信息

### 2. Hooks

#### useMemU
- memorize: 存储记忆
- retrieve: 检索记忆
- getCategories: 获取记忆分类

### 3. Electron API（通过 preload.ts 暴露）

```typescript
window.electron.memorize(data)        // 存储记忆
window.electron.retrieve(query)       // 检索记忆
window.electron.getCategories()       // 获取分类
window.electron.getUserContext()      // 获取用户上下文
window.electron.getActiveWindow()     // 获取活动窗口
window.electron.setPetBehavior(behavior) // 设置宠物行为
window.electron.getSettings()         // 获取设置
window.electron.updateSettings(settings) // 更新设置
```

## 开发规范

### TypeScript
- 所有文件使用 TypeScript
- 为组件 props 定义接口
- 使用类型推断，避免 any

### React
- 使用函数式组件
- 使用 Hooks 管理状态和副作用
- 组件拆分要合理，保持单一职责

### 样式
- 使用 TailwindCSS 工具类
- 自定义样式写在 index.css
- 响应式设计优先

### 代码格式
- 使用 Prettier 格式化代码
- 使用 ESLint 检查代码质量
- 提交前运行 `npm run lint`

## 下一步开发任务

### Day 2: 后端服务层开发
- [ ] 创建 MemUService 类
- [ ] 实现 memorize 和 retrieve 方法
- [ ] 创建 SystemMonitor 类
- [ ] 实现 IPC 处理器

### Day 3: 前端基础组件
- [ ] 创建基础 UI 组件（Button, Input, Card, Modal）
- [ ] 创建 Layout 组件
- [ ] 完善 useMemU Hook

### Day 4: 宠物角色系统
- [ ] 创建 PetCharacter 组件
- [ ] 实现宠物动画
- [ ] 实现拖拽功能
- [ ] 创建 ChatBubble 组件

## 常见问题

### Q: 如何调试主进程代码？
A: 在主进程代码中使用 `console.log`，输出会显示在启动终端中。

### Q: 如何调试渲染进程代码？
A: 开发模式下会自动打开 DevTools，可以在 Console 中查看输出。

### Q: 如何与 memU-server 通信？
A: 通过主进程的 IPC 处理器，主进程会调用 memU-server 的 HTTP API。

### Q: 如何添加新的 Electron API？
A: 
1. 在 `src/main/preload.ts` 中暴露 API
2. 在 `src/renderer/types/electron.d.ts` 中添加类型定义
3. 在主进程中实现对应的 IPC 处理器

## 参考资料

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev/)
- [Zustand 文档](https://docs.pmnd.rs/zustand)
- [TailwindCSS 文档](https://tailwindcss.com/docs)
- [Vite 文档](https://vitejs.dev/)
