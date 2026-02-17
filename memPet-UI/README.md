# memPet UI

基于 Electron + React + TypeScript 的智能桌面宠物应用前端

## 技术栈

- Electron 28.x - 桌面应用框架
- React 18.x - UI 框架
- TypeScript 5.x - 类型安全
- Vite 5.x - 构建工具
- TailwindCSS 3.x - 样式框架
- Zustand 4.x - 状态管理

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 代码检查
npm run lint

# 代码格式化
npm run format

# 构建应用
npm run build
```

## 项目结构

```
memPet-UI/
├── src/
│   ├── main/              # 主进程
│   │   ├── index.ts      # 主进程入口
│   │   └── preload.ts    # Preload 脚本
│   └── renderer/          # 渲染进程
│       ├── components/    # React 组件
│       ├── hooks/         # 自定义 Hooks
│       ├── stores/        # 状态管理
│       ├── types/         # 类型定义
│       ├── App.tsx        # 根组件
│       └── main.tsx       # 入口文件
├── resources/             # 资源文件
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 开发规范

- 使用 TypeScript 进行类型检查
- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- 组件使用函数式组件 + Hooks
- 状态管理使用 Zustand
