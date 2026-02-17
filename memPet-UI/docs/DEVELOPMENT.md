# memPet UI 开发指南

## 快速开始

### 1. 安装依赖

```bash
cd memPet-UI
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

这将启动 Vite 开发服务器和 Electron 应用。

## 项目结构

```
memPet-UI/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts         # 主进程入口
│   │   ├── preload.ts       # 预加载脚本
│   │   ├── ipc/             # IPC 通信处理
│   │   ├── services/        # 后台服务
│   │   └── utils/           # 工具函数
│   │
│   └── renderer/            # React 渲染进程
│       ├── App.tsx          # 主应用组件
│       ├── main.tsx         # 渲染进程入口
│       ├── index.css        # 全局样式
│       │
│       ├── components/      # UI 组件
│       │   ├── Pet/         # 宠物相关组件
│       │   │   ├── PetWindow.tsx      # 宠物主窗口
│       │   │   ├── SpeechBubble.tsx   # 对话气泡
│       │   │   └── StatusPanel.tsx    # 状态面板
│       │   │
│       │   ├── Chat/        # 对话相关组件
│       │   │   └── ChatWindow.tsx     # 对话窗口
│       │   │
│       │   ├── Memory/      # 记忆相关组件
│       │   │   └── MemoryBrowser.tsx  # 记忆浏览器
│       │   │
│       │   └── Settings/    # 设置相关组件
│       │       └── SettingsWindow.tsx # 设置窗口
│       │
│       ├── stores/          # Zustand 状态管理
│       │   ├── petStore.ts      # 宠物状态
│       │   ├── chatStore.ts     # 对话状态
│       │   └── memoryStore.ts   # 记忆状态
│       │
│       ├── hooks/           # 自定义 Hooks
│       ├── types/           # TypeScript 类型定义
│       ├── utils/           # 工具函数
│       └── styles/          # 样式文件
│
├── dist-electron/           # Electron 构建输出
├── public/                  # 静态资源
├── index.html              # HTML 模板
├── package.json            # 项目配置
├── tailwind.config.js      # Tailwind CSS 配置
├── tsconfig.json           # TypeScript 配置
└── vite.config.ts          # Vite 配置
```

## 界面层级

根据设计文档,界面分为 5 个层级:

- **Layer 1**: 宠物主窗口 (PetWindow) - 始终置顶的悬浮层
- **Layer 2**: 状态面板 (StatusPanel) 和对话气泡 (SpeechBubble) - 附着在宠物上的小面板
- **Layer 3**: 记忆浏览器 (MemoryBrowser) - 独立窗口
- **Layer 4**: 对话窗口 (ChatWindow) - 独立窗口
- **Layer 5**: 设置窗口 (SettingsWindow) - 模态窗口

## 设计规范

### 色彩系统

```css
--color-primary: #3B82F6        /* 主色调 */
--color-text: #1F2937           /* 主要文字 */
--color-text-secondary: #6B7280 /* 次要文字 */
--color-text-tertiary: #9CA3AF  /* 辅助文字 */
--color-border: #E5E7EB         /* 边框 */
--color-background: #FFFFFF     /* 背景 */
--color-success: #10B981        /* 成功 */
--color-warning: #F59E0B        /* 警告 */
--color-error: #EF4444          /* 错误 */
```

### 间距系统

- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- 2xl: 32px
- 3xl: 48px

### 圆角系统

- input: 6px (输入框/小按钮)
- button: 8px (普通按钮)
- card: 12px (卡片/面板)
- panel: 16px (主要卡片)
- window: 20px (宠物窗口)

### 动画时长

- micro: 150ms (微交互)
- state: 200ms (状态切换)
- page: 300ms (页面过渡)
- action: 400ms (宠物动作)

## 开发注意事项

### 1. 简洁风格原则

- 避免使用 emoji 作为功能图标
- 优先使用文字标签,图标仅在必要时使用
- 统一使用 Lucide Icons 线性图标
- 避免渐变色和过度装饰

### 2. 状态设计

必须设计以下状态:
- 空状态 (首次使用,无数据)
- 加载状态 (数据加载中)
- 错误状态 (网络断开,API 失败)
- 边界状态 (长文本溢出,超长对话)

### 3. 性能优化

- 记忆列表使用虚拟滚动
- 图片懒加载
- 对话历史分页加载
- 防抖/节流处理

### 4. 可访问性

- 所有交互元素支持键盘操作
- 提供清晰的焦点指示
- 使用语义化 HTML
- 颜色不是唯一的信息传达方式

## 待实现功能

### 高优先级

- [ ] Electron 主进程实现
- [ ] IPC 通信机制
- [ ] memU-server 集成
- [ ] LLM API 调用
- [ ] 系统监控功能
- [ ] Live2D 宠物动画

### 中优先级

- [ ] 右键菜单完整实现
- [ ] 全局快捷键
- [ ] 系统托盘
- [ ] 窗口拖拽优化
- [ ] 数据持久化

### 低优先级

- [ ] 主题切换 (暗色模式)
- [ ] 多语言支持
- [ ] 自定义皮肤
- [ ] 插件系统

## 调试技巧

### 1. 查看 Electron 开发者工具

在应用运行时按 `Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Option+I` (macOS)

### 2. 查看主进程日志

主进程的 console.log 会输出到启动应用的终端

### 3. 热重载

修改渲染进程代码会自动热重载,修改主进程代码需要重启应用

## 构建

### 开发构建

```bash
npm run build
```

### 生产构建

```bash
npm run build
npm run dist
```

这将生成可分发的安装包。

## 相关文档

- [功能文档](../docs/memPet-Features-Guide.md)
- [架构文档](../docs/memPet-Electron-Architecture.md)
- [开发计划](../docs/memPet-Development-TODO.md)
