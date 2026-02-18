# 手动修复步骤 - electronAPI 不可用

## 当前问题

```
[ChatWindow] electronAPI.events 不可用
[ChatWindow] electronAPI.chat 不可用
```

## 手动修复步骤（请严格按顺序执行）

### 步骤 1: 完全停止应用

在运行 `npm run dev` 的终端窗口：
1. 按 `Ctrl+C` 停止
2. 等待进程完全退出
3. 关闭 Electron 应用窗口（如果还开着）

### 步骤 2: 清理构建缓存

```powershell
cd memPet-UI

# 删除 dist-electron 目录
Remove-Item -Recurse -Force dist-electron

# 删除 Vite 缓存
Remove-Item -Recurse -Force node_modules\.vite
```

### 步骤 3: 验证关键文件存在

```powershell
# 检查这些文件是否存在
Test-Path src/main/preload.ts
Test-Path src/main/index.ts
Test-Path vite.config.ts
```

都应该返回 `True`。

### 步骤 4: 重新启动

```powershell
npm run dev
```

### 步骤 5: 验证修复

应用启动后：

1. 按 `Ctrl+Shift+I` 打开开发者工具
2. 切换到 `Console` 标签
3. 输入以下命令并按回车：

```javascript
window.electronAPI
```

**预期结果**：应该看到一个对象，包含：
```javascript
{
  chat: {sendMessage: f, sendMessageStream: f, ...},
  events: {on: f, removeListener: f},
  memory: {...},
  pet: {...},
  system: {...}
}
```

**如果看到 `undefined`**：说明 preload 脚本仍未加载，继续下一步。

## 如果还是不行 - 完全重新构建

### 方案 A: 删除并重新安装依赖

```powershell
cd memPet-UI

# 1. 删除所有构建产物和依赖
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist-electron
Remove-Item package-lock.json

# 2. 重新安装
npm install

# 3. 启动
npm run dev
```

### 方案 B: 检查 preload 构建输出

```powershell
# 先构建一次
npm run build

# 检查 preload 文件是否生成
Test-Path dist-electron/preload/index.js
```

如果返回 `False`，说明 preload 脚本没有正确构建。

### 方案 C: 检查主进程日志

在终端中查找类似的日志：
```
[vite-plugin-electron] Electron App started
```

如果没有看到，说明 Electron 没有正确启动。

## 调试技巧

### 1. 在 preload.ts 中添加日志

在 `src/main/preload.ts` 的最后添加：

```typescript
console.log('[Preload] Script loaded successfully')
console.log('[Preload] electronAPI:', {
  chat: !!chatAPI,
  events: !!eventsAPI,
  memory: !!memoryAPI,
  pet: !!petAPI,
  system: !!systemAPI,
})
```

重新启动后，在开发者工具的 Console 中应该看到这些日志。

### 2. 检查主进程是否正确加载 preload

在 `src/main/index.ts` 中找到 `webPreferences`，确认：

```typescript
webPreferences: {
  preload: path.join(__dirname, '../preload/index.js'),
  nodeIntegration: false,
  contextIsolation: true,
}
```

### 3. 检查 Vite 配置

在 `vite.config.ts` 中确认 preload 配置：

```typescript
{
  entry: 'src/main/preload.ts',
  onstart(options) {
    options.reload()
  },
  vite: {
    build: {
      outDir: 'dist-electron/preload',
      rollupOptions: {
        output: {
          entryFileNames: 'index.js'
        }
      }
    }
  }
}
```

## 常见原因

1. **热重载不会重新加载 preload** - 必须完全重启
2. **缓存问题** - 旧的构建产物被缓存
3. **路径问题** - preload 路径配置错误
4. **构建失败** - preload 脚本没有正确构建

## 终极解决方案

如果以上所有方法都不行：

```powershell
# 1. 完全清理
cd memPet-UI
Remove-Item -Recurse -Force node_modules, dist-electron, package-lock.json, .vite

# 2. 重新安装
npm install

# 3. 手动构建一次
npm run build

# 4. 检查构建产物
dir dist-electron\preload\

# 应该看到 index.js 文件

# 5. 启动开发服务器
npm run dev
```

## 需要帮助？

如果问题仍然存在，请提供：

1. Node 版本：`node --version`
2. npm 版本：`npm --version`
3. 操作系统版本
4. `dist-electron/preload/index.js` 是否存在
5. 开发者工具 Console 中的完整错误信息
6. 终端中的完整启动日志

---

**创建时间**: 2026-02-17  
**最后更新**: 2026-02-17
