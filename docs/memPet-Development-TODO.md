# memPet 10天开发计划 TODO

基于 Electron + React + memU-server 的桌面宠物应用开发计划

---

## 开发团队

- **HGH**: 负责 memU 部分（后端服务、记忆系统、API 集成）
- **nil-byte**: 负责 Electron 部分（前端界面、UI 组件、用户交互）

---

## 开发周期：10天（2月12日开始）

### 总体目标
- 完成 memPet 桌面应用的核心功能
- 实现前后端集成
- 完成基础 UI 和交互
- 实现记忆系统和主动推理

### 任务标注说明
- `[HGH]` - HGH 负责的后端任务
- `[nil-byte]` - nil-byte 负责的前端任务
- `[共同]` - 需要两人协作的任务

---

## Day 1: 项目准备与环境搭建

- [ ] 阅读并理解所有项目文档 `[共同]`：memPet-Electron-Architecture.md；memPet-Features-Guide.md；memPet-Dual-Agent-Analysis.md；memU-server-Usage-Guide.md
- [ ] 熟悉 memU 核心概念 `[HGH]`：理解三层架构（Resource → Memory Item → Category）；理解 memorize 和 retrieve API
- [ ] 创建项目开发文档 `[共同]`：技术选型确认；开发规范文档；Git 工作流规范
- [ ] 安装必要工具 `[共同]`：Node.js 20.x；Python 3.13+ `[HGH]`；uv 包管理器 `[HGH]`；VS Code + 插件
- [ ] 初始化项目结构 `[nil-byte]`：创建 memPet 根目录；初始化 package.json；配置 TypeScript；配置 ESLint 和 Prettier
- [ ] 测试 memU-server `[HGH]`：启动 memU-server；测试 /memorize 接口；测试 /retrieve 接口；验证数据存储
- [ ] 初始化 Electron 项目 `[nil-byte]`：安装 Electron 依赖；配置 electron-builder；创建主进程入口文件
- [ ] 配置 Vite 构建 `[nil-byte]`：安装 vite-plugin-electron；配置开发服务器；测试热重载

---

## Day 2: 后端服务层开发

- [ ] 创建 MemUService 类 `[HGH]`：实现服务启动逻辑；实现子进程管理；实现服务健康检查
- [ ] 实现 memorize 方法 `[HGH]`：HTTP 请求封装；错误处理；数据格式转换
- [ ] 实现 retrieve 方法 `[HGH]`：HTTP 请求封装；结果解析；缓存机制（可选）
- [ ] 创建 SystemMonitor 类 `[HGH]`：安装 active-win 依赖；实现活动窗口检测；实现空闲时间检测
- [ ] 实现监控循环 `[HGH]`：30秒定时检查；窗口切换检测；工作时长统计
- [ ] 实现记忆存储 `[HGH]`：自动记录用户活动；过滤短暂切换；批量存储优化
- [ ] 创建 IPC 处理器 `[HGH]`：memoryHandlers.ts；systemHandlers.ts；petHandlers.ts
- [ ] 实现 Preload 脚本 `[nil-byte]`：暴露安全 API；TypeScript 类型定义；事件监听器

---

## Day 3: 前端基础框架搭建 `[nil-byte]`

- [ ] 安装 React 依赖 `[nil-byte]`：React 18.x；React DOM；React Router（可选）
- [ ] 配置 TailwindCSS `[nil-byte]`：安装依赖；配置 tailwind.config.js；创建基础样式
- [ ] 安装状态管理 `[nil-byte]`：Zustand 4.x；创建 store 结构
- [ ] 创建 App.tsx 根组件 `[nil-byte]`：布局结构；路由配置（如需要）
- [ ] 创建基础 UI 组件 `[nil-byte]`：Button 组件；Input 组件；Card 组件；Modal 组件
- [ ] 创建 Layout 组件 `[nil-byte]`：主窗口布局；透明窗口样式；拖拽区域
- [ ] 创建 useMemU Hook `[共同]`：memorize 方法（调用后端 API）；retrieve 方法（调用后端 API）；loading 状态；error 处理
- [ ] 创建工具函数 `[nil-byte]`：日期格式化；错误处理；本地存储


---

## Day 4: 宠物角色系统开发 `[nil-byte]`

- [ ] 创建 PetCharacter 组件 `[nil-byte]`：宠物形象显示；动画状态管理；表情系统
- [ ] 实现宠物动画 `[nil-byte]`：待机动画；说话动画；思考动画；睡眠动画
- [ ] 实现拖拽功能 `[nil-byte]`：窗口拖拽；位置记忆；边界检测
- [ ] 创建 ChatBubble 组件 `[nil-byte]`：气泡样式；文字动画；自动换行
- [ ] 实现对话显示 `[nil-byte]`：打字机效果；多行文本；自动隐藏
- [ ] 实现交互反馈 `[nil-byte]`：点击展开；历史记录；复制功能
- [ ] 创建 PetStore `[nil-byte]`：宠物状态（待机/说话/思考）；当前对话内容；历史对话记录
- [ ] 实现状态切换 `[nil-byte]`：自动状态机；状态持久化；状态恢复

---

## Day 5: 记忆系统集成

- [x] 实现自动记忆 `[HGH]`：用户活动记录；对话内容记录；系统事件记录
- [x] 创建 AutoMemoryService 类 `[HGH]`：对话缓冲区机制；自动刷新逻辑；记忆检索功能
- [x] 集成到主进程 `[HGH]`：服务启动和清理；IPC 处理器扩展；错误处理
- [x] 前端 Hook 实现 `[nil-byte]`：useAutoMemory Hook；记录对话；搜索记忆
- [x] ChatWindow 集成 `[nil-byte]`：自动记录对话；临时 LLM 模拟；错误处理
- [x] MemoryBrowser 集成 `[nil-byte]`：真实记忆检索；实时搜索；类型筛选
- [ ] 实现手动记忆 `[共同]`：快捷键触发 `[nil-byte]`；右键菜单 `[nil-byte]`；记忆确认提示 `[nil-byte]`
- [ ] 实现记忆分类 `[HGH]`：工作记忆；学习记忆；娱乐记忆；其他记忆
- [ ] 实现记忆查询 `[HGH]`：关键词搜索；时间范围筛选；分类筛选
- [x] 实现记忆展示 `[nil-byte]`：记忆列表；记忆详情；记忆时间线
- [ ] 实现记忆管理 `[共同]`：编辑记忆 `[HGH]`；删除记忆 `[HGH]`；导出记忆 `[HGH]`
- [ ] 创建 MemoryViewer 组件 `[nil-byte]`：记忆卡片；时间轴视图；统计图表
- [ ] 实现记忆统计 `[nil-byte]`：每日记忆数量；分类占比；活跃时段

---

## Day 6: 主动推理系统（Proactive Agent）

- [x] 创建 ProactiveService 类 `[HGH]`：定时检查逻辑；上下文收集；推理触发条件
- [x] 补充冷却接口 `[HGH]`：getCooldownStatus；resetCooldown
- [x] 实现上下文收集 `[HGH]`：当前活动窗口；最近记忆检索；时间和日期；系统状态
- [x] 实现推理逻辑 `[HGH]`：调用 LLM API；结果解析；错误处理
- [x] 创建规则配置 `[HGH]`：工作时长提醒；休息建议；任务提醒；学习建议
- [x] 实现规则匹配 `[HGH]`：条件判断；优先级排序；冷却时间
- [x] 实现推理缓存 `[HGH]`：避免重复推理；结果缓存；缓存失效
- [x] 创建 ProactiveMessage 组件 `[nil-byte]`：推理结果显示；建议操作按钮；忽略功能
- [x] 集成到主进程 `[HGH]`：服务启动；事件通知；配置管理
- [x] 创建 ProactiveStore `[nil-byte]`：消息管理；历史记录；启用开关
- [x] 修复构建错误 `[共同]`：preload.ts 语法错误；memoryHandlers.ts 闭合括号；SystemMonitor active-win 兼容性；ProactiveService 方法名错误
- [ ] 实现推理历史 `[nil-byte]`：历史记录；统计分析；效果评估

**Day 6 完成度：95%** ✅

---

## Day 7: 对话系统开发

- [x] 创建 ChatService 类 `[HGH]`：LLM API 集成；对话上下文管理；流式响应处理
- [x] 实现对话功能 `[HGH]`：发送消息；接收响应；上下文注入
- [x] 实现记忆增强 `[HGH]`：自动检索相关记忆；记忆注入到 prompt；对话后自动记忆
- [x] 创建 IPC 处理器 `[HGH]`：chat:send-message；chat:send-message-stream；chat:update-config；chat:clear-history；chat:get-history
- [x] 集成到主进程 `[HGH]`：服务初始化；IPC 注册；窗口引用设置
- [x] 更新 Preload 脚本 `[nil-byte]`：chatAPI 暴露；流式事件监听
- [x] 更新类型定义 `[nil-byte]`：ElectronAPI.chat 接口
- [x] 更新 ChatWindow 组件 `[nil-byte]`：集成真实 LLM API；移除临时模拟代码
- [ ] 实现流式对话 UI `[nil-byte]`：监听流式事件；实时显示响应；打字机效果
- [ ] 创建 ChatPanel 组件 `[nil-byte]`：对话列表；输入框；发送按钮
- [ ] 实现对话交互 `[nil-byte]`：消息发送；实时响应；滚动控制
- [ ] 实现对话功能 `[nil-byte]`：Markdown 渲染；代码高亮；复制功能
- [ ] 创建 ChatHistory 组件 `[nil-byte]`：会话列表；会话切换；会话删除
- [ ] 实现历史存储 `[HGH]`：本地持久化；自动保存；数据恢复
- [ ] 实现历史搜索 `[nil-byte]`：关键词搜索；时间筛选；导出功能

**Day 7 完成度：60%** 🚧

---

## Day 8: 设置系统和配置管理

- [ ] 创建 Settings 组件 `[nil-byte]`：通用设置；AI 模型设置；性格设置；行为设置
- [ ] 实现通用设置 `[nil-byte]`：宠物名称；语言选择；开机自启；窗口置顶；透明度调节
- [ ] 实现 AI 模型设置 `[共同]`：API Key 配置 `[nil-byte]`；模型选择 `[nil-byte]`；参数调节 `[nil-byte]`；连接测试 `[HGH]`
- [ ] 实现性格设置 `[nil-byte]`：性格类型选择；自定义性格描述；性格预览
- [ ] 实现行为设置 `[共同]`：主动推理开关 `[nil-byte]`；推理频率 `[HGH]`；推理规则配置 `[HGH]`；通知设置 `[nil-byte]`
- [ ] 实现 Skills 设置 `[nil-byte]`：技能列表；技能开关；技能配置
- [ ] 实现后台服务设置 `[HGH]`：memU-server 配置；服务状态显示；服务重启；日志查看
- [ ] 实现 MCP 设置 `[HGH]`：MCP 服务器列表；添加/删除服务器；服务器配置；连接测试
- [ ] 实现数据管理 `[共同]`：数据统计 `[HGH]`；数据导出 `[HGH]`；数据清理 `[HGH]`；数据备份 `[HGH]`

---

## Day 9: 系统托盘和快捷键

- [ ] 创建托盘图标 `[nil-byte]`：图标设计；状态指示；动画效果
- [ ] 实现托盘菜单 `[nil-byte]`：显示/隐藏；设置；关于；退出
- [ ] 实现托盘交互 `[nil-byte]`：单击显示；右键菜单；气泡通知
- [ ] 实现全局快捷键 `[nil-byte]`：显示/隐藏宠物；快速记忆；快速对话；设置面板
- [ ] 实现快捷键配置 `[nil-byte]`：自定义快捷键；冲突检测；快捷键提示
- [ ] 实现快捷键管理 `[nil-byte]`：快捷键列表；启用/禁用；重置默认
- [ ] 实现系统通知 `[nil-byte]`：推理结果通知；任务提醒通知；系统事件通知
- [ ] 实现通知配置 `[nil-byte]`：通知开关；通知样式；免打扰模式
- [ ] 实现通知历史 `[HGH]`：历史记录；标记已读；清空历史

---

## Day 10: 测试、优化和打包

- [ ] 测试核心功能 `[共同]`：记忆存储和检索 `[HGH]`；主动推理 `[HGH]`；对话功能 `[共同]`；设置保存 `[nil-byte]`
- [ ] 测试 UI 交互 `[nil-byte]`：拖拽功能；窗口显示；动画效果；响应速度
- [ ] 测试边界情况 `[共同]`：网络断开 `[HGH]`；服务异常 `[HGH]`；数据损坏 `[HGH]`；内存泄漏 `[共同]`
- [ ] 优化启动速度 `[nil-byte]`：延迟加载；预加载优化；资源压缩
- [ ] 优化运行性能 `[共同]`：内存使用 `[共同]`；CPU 占用 `[HGH]`；网络请求 `[HGH]`；渲染性能 `[nil-byte]`
- [ ] 优化用户体验 `[nil-byte]`：加载动画；错误提示；操作反馈；流畅度
- [ ] 配置打包 `[nil-byte]`：electron-builder 配置；图标和资源；安装程序配置；自动更新配置
- [ ] 打包测试 `[nil-byte]`：Windows 打包；macOS 打包（可选）；Linux 打包（可选）；安装测试
- [ ] 准备发布 `[共同]`：版本号确认；更新日志；README 文档；使用说明

---

## 技术栈总结

### 前端技术
- Electron 28.x - 桌面应用框架
- React 18.x - UI 框架
- TypeScript 5.x - 类型安全
- Vite 5.x - 构建工具
- TailwindCSS 3.x - 样式框架
- Zustand 4.x - 状态管理
- Live2D 4.x - 宠物渲染（可选）

### 后端技术
- Node.js 20.x - 主进程运行时
- memU-server - 记忆服务
- Python 3.13+ - memU-server 运行环境
- uv - Python 包管理器
- axios 1.x - HTTP 客户端

### 开发工具
- VS Code - 代码编辑器
- ESLint - 代码检查
- Prettier - 代码格式化
- electron-builder - 打包工具
- Git - 版本控制

---

## 关键依赖包

### 生产依赖
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "zustand": "^4.5.0",
  "axios": "^1.6.0",
  "active-win": "^8.0.0"
}
```

### 开发依赖
```json
{
  "electron": "^28.0.0",
  "typescript": "^5.3.0",
  "vite": "^5.0.0",
  "vite-plugin-electron": "^0.28.0",
  "electron-builder": "^24.9.0",
  "tailwindcss": "^3.4.0",
  "eslint": "^9.0.0",
  "prettier": "^3.3.0"
}
```

---

## 项目结构

```
memPet/
├── src/
│   ├── main/                 # 主进程（Node.js）
│   │   ├── index.ts         # 主进程入口
│   │   ├── services/        # 后端服务
│   │   │   ├── MemUService.ts
│   │   │   ├── SystemMonitor.ts
│   │   │   ├── ProactiveService.ts
│   │   │   └── ChatService.ts
│   │   ├── ipc/             # IPC 处理器
│   │   │   ├── memoryHandlers.ts
│   │   │   ├── systemHandlers.ts
│   │   │   └── petHandlers.ts
│   │   ├── preload.ts       # Preload 脚本
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── config.ts
│   └── renderer/            # 渲染进程（React）
│       ├── App.tsx
│       ├── main.tsx         # 入口文件
│       ├── components/      # 组件
│       │   ├── Pet/
│       │   │   ├── PetCanvas.tsx
│       │   │   └── PetBehavior.tsx
│       │   ├── Chat/
│       │   │   ├── ChatPanel.tsx
│       │   │   └── MessageList.tsx
│       │   ├── Memory/
│       │   │   └── MemoryBrowser.tsx
│       │   └── Settings/
│       │       └── SettingsPanel.tsx
│       ├── hooks/           # 自定义 Hooks
│       │   ├── useMemU.ts
│       │   └── useChat.ts
│       ├── stores/          # 状态管理
│       │   ├── petStore.ts
│       │   ├── chatStore.ts
│       │   └── memoryStore.ts
│       ├── types/
│       │   ├── pet.ts
│       │   ├── memory.ts
│       │   └── electron.d.ts
│       └── utils/
│           └── helpers.ts
├── memU-server/            # memU 服务器（子模块）
├── resources/              # 资源文件
│   ├── memu-server.exe    # 打包的 memU-server
│   ├── models/            # Live2D 模型
│   └── icons/             # 应用图标
├── scripts/               # 构建脚本
│   ├── build-server.js
│   └── build-electron.js
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.json
```

---

## 开发注意事项

### 1. memU-server 集成
- memU-server 作为子进程启动
- 使用 HTTP API 通信
- 需要处理服务启动失败的情况
- 数据存储在用户目录

### 2. 窗口管理
- 主窗口透明，无边框
- 支持拖拽移动
- 支持置顶显示
- 记住窗口位置

### 3. 性能优化
- 避免频繁的 IPC 通信
- 使用防抖和节流
- 合理使用缓存
- 优化渲染性能

### 4. 错误处理
- 所有异步操作都要有错误处理
- 用户友好的错误提示
- 记录错误日志
- 优雅降级

### 5. 数据安全
- API Key 加密存储
- 敏感数据不记录日志
- 用户数据本地存储
- 定期数据备份

---

## 测试清单

### 功能测试
- [ ] 记忆存储功能正常
- [ ] 记忆检索功能正常
- [ ] 主动推理功能正常
- [ ] 对话功能正常
- [ ] 设置保存和加载正常
- [ ] 快捷键功能正常
- [ ] 托盘功能正常
- [ ] 通知功能正常

### 性能测试
- [ ] 启动时间 < 3秒
- [ ] 内存占用 < 200MB
- [ ] CPU 占用 < 5%（空闲时）
- [ ] 响应时间 < 100ms

### 兼容性测试
- [ ] Windows 10/11 正常运行
- [ ] 不同分辨率显示正常
- [ ] 不同 DPI 缩放正常
- [ ] 多显示器支持

### 稳定性测试
- [ ] 长时间运行稳定
- [ ] 网络异常恢复正常
- [ ] 服务异常恢复正常
- [ ] 无内存泄漏

---

## 发布清单

### 打包前
- [ ] 版本号更新
- [ ] 更新日志编写
- [ ] README 文档完善
- [ ] 使用说明编写
- [ ] 依赖版本锁定

### 打包配置
- [ ] 应用图标设置
- [ ] 安装程序配置
- [ ] 自动更新配置
- [ ] 代码签名（可选）

### 发布后
- [ ] 安装测试
- [ ] 功能验证
- [ ] 性能测试
- [ ] 用户反馈收集

---

## 后续优化方向

### 短期优化（1-2周）
- [ ] 添加更多宠物形象
- [ ] 优化动画效果
- [ ] 添加更多推理规则
- [ ] 优化 UI 细节

### 中期优化（1-2月）
- [ ] 支持多语言
- [ ] 支持主题切换
- [ ] 添加插件系统
- [ ] 支持云同步

### 长期优化（3-6月）
- [ ] 支持多宠物
- [ ] 支持宠物社交
- [ ] 支持宠物商店
- [ ] 支持宠物养成

---

## 参考文档

- [Electron 官方文档](https://www.electronjs.org/docs)
- [React 官方文档](https://react.dev/)
- [memU 项目文档](../memU/README.md)
- [memU-server 使用指南](./memU-server-Usage-Guide.md)
- [memPet 架构文档](./memPet-Electron-Architecture.md)
- [memPet 功能指南](./memPet-Features-Guide.md)

---

## 开发日志

### Day 1
- [ ] 完成情况：
- [ ] 遇到的问题：
- [ ] 解决方案：
- [ ] 明天计划：

### Day 2
- [ ] 完成情况：
- [ ] 遇到的问题：
- [ ] 解决方案：
- [ ] 明天计划：

### Day 3
- [ ] 完成情况：
- [ ] 遇到的问题：
- [ ] 解决方案：
- [ ] 明天计划：

### Day 4
- [ ] 完成情况：
- [ ] 遇到的问题：
- [ ] 解决方案：
- [ ] 明天计划：

### Day 5
- [x] 完成情况：AutoMemoryService 服务创建；对话自动记录功能；记忆检索和搜索；ChatWindow 和 MemoryBrowser 集成；SVG 宠物动画优化
- [x] 遇到的问题：需要集成真实 LLM API；记忆分类逻辑需要优化
- [x] 解决方案：先使用临时模拟回复，LLM 集成放到 Day 7；记忆分类使用 metadata 字段
- [ ] 明天计划：完成手动记忆触发；开始 Day 6 主动推理系统

### Day 6
- [x] 完成情况：ProactiveService 服务创建；冷却接口补充；ProactiveMessage 组件；主进程集成；事件通知机制；配置管理系统
- [x] 遇到的问题：需要实现推理历史面板；操作执行逻辑待完善
- [x] 解决方案：先完成核心推理功能，历史面板和操作执行放到后续优化
- [ ] 明天计划：开始 Day 7 对话系统开发；集成真实 LLM API

### Day 7
- [ ] 完成情况：
- [ ] 遇到的问题：
- [ ] 解决方案：
- [ ] 明天计划：

### Day 8
- [ ] 完成情况：
- [ ] 遇到的问题：
- [ ] 解决方案：
- [ ] 明天计划：

### Day 9
- [ ] 完成情况：
- [ ] 遇到的问题：
- [ ] 解决方案：
- [ ] 明天计划：

### Day 10
- [ ] 完成情况：
- [ ] 遇到的问题：
- [ ] 解决方案：
- [ ] 项目总结：

---

**文档创建时间：** 2026-02-12  
**最后更新时间：** 2026-02-12  
**文档版本：** v1.0
