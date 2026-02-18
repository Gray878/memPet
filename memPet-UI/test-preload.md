# 测试 Preload 是否加载

## 当前状态

- ✅ preload 文件已构建：`dist-electron/preload/index.js` (2.99 kB)
- ✅ 主进程显示路径：`E:\code\AI_Agent\memPet_github\memPet-UI\dist-electron\preload\index.js`
- ❌ `window.electronAPI` 仍然是 `undefined`
- ❌ Console 中没有 `[Preload]` 日志

## 问题分析

preload 脚本虽然构建了，但在运行时没有被执行。这是 Vite + Electron 开发模式的已知问题。

## 解决方案：使用生产构建测试

### 步骤 1: 构建生产版本

```powershell
cd memPet-UI
npm run build
```

### 步骤 2: 检查构建产物

```powershell
# 检查 preload 文件
Test-Path dist-electron/preload/index.js

# 查看文件大小
(Get-Item dist-electron/preload/index.js).Length
```

### 步骤 3: 运行生产版本

```powershell
# 如果有 preview 命令
npm run preview

# 或者直接运行 electron
npx electron dist-electron/main/index.js
```

### 步骤 4: 验证

在生产版本中：
1. 按 `Ctrl+Shift+I` 打开开发者工具
2. 输入 `window.electronAPI`
3. 应该看到对象而不是 `undefined`

## 如果生产版本可以，开发版本不行

说明是 Vite 开发模式的问题。需要修改 Vite 配置。

### 修复方案：修改 vite.config.ts

在 preload 配置中添加 `onstart` 回调：

```typescript
{
  entry: 'src/main/preload.ts',
  onstart(options) {
    // 强制重新加载
    options.reload()
  },
  vite: {
    build: {
      outDir: 'dist-electron/preload',
      rollupOptions: {
        output: {
          entryFileNames: 'index.js',
          format: 'cjs'  // 使用 CommonJS 格式
        }
      }
    }
  }
}
```

## 临时解决方案：直接在渲染进程中模拟 API

如果 preload 实在无法工作，可以临时在渲染进程中直接调用 IPC：

在 `src/renderer/main.tsx` 的开头添加：

```typescript
// 临时解决方案：如果 electronAPI 不可用，直接使用 ipcRenderer
if (!window.electronAPI && window.electron?.ipcRenderer) {
  const { ipcRenderer } = window.electron
  
  window.electronAPI = {
    chat: {
      sendMessage: (message: string) => ipcRenderer.invoke('chat:send-message', message),
      sendMessageStream: (message: string) => ipcRenderer.invoke('chat:send-message-stream', message),
      updateConfig: (config: any) => ipcRenderer.invoke('chat:update-config', config),
      clearHistory: () => ipcRenderer.invoke('chat:clear-history'),
      getHistory: () => ipcRenderer.invoke('chat:get-history'),
    },
    events: {
      on: (channel: string, callback: Function) => {
        ipcRenderer.on(channel, (_event, ...args) => callback(...args))
      },
      removeListener: (channel: string, callback: Function) => {
        ipcRenderer.removeListener(channel, callback as any)
      },
    },
    // ... 其他 API
  }
}
```

## 请先尝试

1. **构建生产版本**：`npm run build`
2. **运行生产版本**：检查 `window.electronAPI` 是否可用
3. **告诉我结果**

如果生产版本可以，我会修改 Vite 配置来修复开发模式。
如果生产版本也不行，说明是更深层的问题，需要重新检查 Electron 配置。
