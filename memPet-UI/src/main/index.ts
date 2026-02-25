import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { MemUService } from './services/MemUService'
import { SystemMonitor } from './services/SystemMonitor'
import { AutoMemoryService } from './services/AutoMemoryService'
import { ProactiveService } from './services/ProactiveService'
import { ChatService } from './services/ChatService'
import { ConfigService } from './services/ConfigService'
import { TrayService } from './services/TrayService'
import { ShortcutService } from './services/ShortcutService'
import { NotificationService } from './services/NotificationService'
import { registerMemoryHandlers } from './ipc/memoryHandlers'
import { registerSystemHandlers } from './ipc/systemHandlers'
import { registerPetHandlers } from './ipc/petHandlers'
import { registerChatHandlers } from './ipc/chatHandlers'
import { registerSettingsHandlers } from './ipc/settingsHandlers'
import { registerTrayHandlers } from './ipc/trayHandlers'

// ES Module 环境下定义 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 开发环境标识
const isDev = process.env.NODE_ENV === 'development'
const rawDevServerURL =
  process.env.VITE_DEV_SERVER_URL ||
  process.env.ELECTRON_RENDERER_URL ||
  'http://127.0.0.1:5173/'
const devServerURL = rawDevServerURL.replace('://localhost', '://127.0.0.1')

let mainWindow: BrowserWindow | null = null
let configService: ConfigService | null = null
let memUService: MemUService | null = null
let systemMonitor: SystemMonitor | null = null
let autoMemoryService: AutoMemoryService | null = null
let proactiveService: ProactiveService | null = null
let chatService: ChatService | null = null
let trayService: TrayService | null = null
let shortcutService: ShortcutService | null = null
let notificationService: NotificationService | null = null

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: isDev ? 1200 : 200,
    height: isDev ? 800 : 200,
    frame: isDev ? true : false,
    transparent: !isDev,
    alwaysOnTop: !isDev,
    resizable: isDev,
    hasShadow: false,
    skipTaskbar: !isDev,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 调试：打印 preload 路径
  console.log('[Main] Preload path:', path.join(__dirname, '../preload/index.js'))
  console.log('[Main] Raw dev server URL:', rawDevServerURL)
  console.log('[Main] Dev server URL:', devServerURL)

  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[Main] Renderer started loading')
  })

  mainWindow.webContents.on('dom-ready', () => {
    console.log('[Main] Renderer DOM ready')
  })

  mainWindow.webContents.on('did-frame-finish-load', (_event, isMainFrame) => {
    if (isMainFrame) {
      console.log('[Main] Main frame finished load')
    }
  })

  mainWindow.webContents.on('did-finish-load', async () => {
    console.log('[Main] Renderer finished load')
    try {
      const diagnostics = await mainWindow?.webContents.executeJavaScript(`
        ({
          href: location.href,
          title: document.title,
          readyState: document.readyState,
          hasRoot: !!document.getElementById('root'),
          rootHtmlLength: document.getElementById('root')?.innerHTML?.length ?? -1
        })
      `)
      console.log('[Main] Renderer diagnostics:', diagnostics)
    } catch (error) {
      console.error('[Main] Failed to read renderer diagnostics:', error)
    }
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Main] Renderer process gone:', details)
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer:${level}] ${message} (${sourceId}:${line})`)
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc, validatedURL) => {
    console.error('[Main] Renderer load failed:', { errorCode, errorDesc, validatedURL })

    if (isDev) {
      const escapedURL = devServerURL.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      mainWindow?.loadURL(`data:text/html,${encodeURIComponent(`
        <html>
          <head><meta charset="UTF-8"><title>memPet 启动失败</title></head>
          <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;padding:24px;line-height:1.6;">
            <h2>前端页面加载失败</h2>
            <p>Electron 无法连接到开发服务器：</p>
            <pre style="background:#f3f4f6;padding:12px;border-radius:8px;">${escapedURL}</pre>
            <p>请确认在 <code>memPet-UI</code> 目录运行的是 <code>npm run dev</code>，且端口未被占用。</p>
          </body>
        </html>
      `)}`)
    }
  })

  mainWindow.setIgnoreMouseEvents(false)

  if (isDev) {
    mainWindow
      .loadURL(devServerURL)
      .catch((error) => {
        console.error('[Main] loadURL failed:', error)
      })
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 创建系统托盘
function createTray() {
  trayService = new TrayService()
  if (mainWindow) {
    trayService.setMainWindow(mainWindow)
  }
  trayService.create()
  
  // 根据配置更新托盘菜单
  if (configService) {
    const config = configService.get()
    trayService.updateContextMenu({
      proactiveEnabled: config.behavior.proactiveEnabled
    })
  }
}

// 初始化服务
async function initializeServices() {
  try {
    console.log('[Main] 初始化服务...')
    
    // 0. 加载配置
    configService = new ConfigService()
    await configService.load()
    console.log('[Main] 配置加载成功')
    
    // 1. 启动 memPet-server
    memUService = new MemUService()
    await memUService.start()
    console.log('[Main] memPet-server 启动成功')
    
    // 2. 启动系统监控
    systemMonitor = new SystemMonitor(memUService)
    systemMonitor.start()
    console.log('[Main] 系统监控启动成功')
    
    // 3. 启动自动记忆服务
    autoMemoryService = new AutoMemoryService(memUService, systemMonitor)
    autoMemoryService.start()
    console.log('[Main] 自动记忆服务启动成功')
    
    // 4. 启动主动推理服务
    proactiveService = new ProactiveService(memUService, systemMonitor)
    proactiveService.start()
    console.log('[Main] 主动推理服务启动成功')
    
    // 5. 启动对话服务
    chatService = new ChatService(memUService)
    console.log('[Main] 对话服务启动成功')
    
    // 6. 初始化通知服务
    const config = configService.get()
    notificationService = new NotificationService({
      enabled: config.behavior.notificationsEnabled,
      quietHoursEnabled: config.behavior.quietHoursEnabled,
      quietHoursStart: config.behavior.quietHoursStart,
      quietHoursEnd: config.behavior.quietHoursEnd,
    })
    console.log('[Main] 通知服务初始化成功')
    
    // 7. 初始化快捷键服务
    shortcutService = new ShortcutService()
    console.log('[Main] 快捷键服务初始化成功')
    
    // 8. 注册 IPC 处理器
    registerMemoryHandlers(memUService, autoMemoryService)
    registerSystemHandlers(systemMonitor)
    registerPetHandlers(memUService)
    registerChatHandlers(chatService)
    registerSettingsHandlers(configService, memUService)
    registerTrayHandlers(trayService, notificationService, shortcutService)
    console.log('[Main] IPC 处理器注册成功')
    
    console.log('[Main] 所有服务初始化完成')
  } catch (error) {
    console.error('[Main] 服务初始化失败:', error)
    // 显示错误对话框
    const { dialog } = await import('electron')
    dialog.showErrorBox(
      'memPet 启动失败',
      `服务初始化失败：${error}\n\n请检查：\n1. memPet-server 是否正确配置\n2. 环境变量是否设置\n3. 数据库是否运行`
    )
    app.quit()
  }
}

// 清理服务
async function cleanupServices() {
  console.log('[Main] 清理服务...')
  
  if (shortcutService) {
    shortcutService.unregisterAll()
    console.log('[Main] 快捷键已注销')
  }
  
  if (trayService) {
    trayService.destroy()
    console.log('[Main] 托盘已销毁')
  }
  
  if (proactiveService) {
    proactiveService.stop()
    console.log('[Main] 主动推理服务已停止')
  }
  
  if (autoMemoryService) {
    autoMemoryService.stop()
    console.log('[Main] 自动记忆服务已停止')
  }
  
  if (systemMonitor) {
    await systemMonitor.stop()
    console.log('[Main] 系统监控已停止')
  }
  
  if (memUService) {
    await memUService.stop()
    console.log('[Main] memPet-server 已停止')
  }
}

// 应用准备就绪
app.whenReady().then(async () => {
  await initializeServices()
  createWindow()
  createTray()

  // 设置主窗口引用到各个服务
  if (mainWindow) {
    if (proactiveService) {
      proactiveService.setMainWindow(mainWindow)
    }
    if (chatService) {
      chatService.setMainWindow(mainWindow)
    }
    if (trayService) {
      trayService.setMainWindow(mainWindow)
    }
    if (shortcutService) {
      shortcutService.setMainWindow(mainWindow)
    }
  }

  // 注册全局快捷键
  if (shortcutService) {
    shortcutService.registerAll()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', async (event) => {
  event.preventDefault()
  await cleanupServices()
  app.exit(0)
})
