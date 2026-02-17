import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { MemUService } from './services/MemUService'
import { SystemMonitor } from './services/SystemMonitor'
import { registerMemoryHandlers } from './ipc/memoryHandlers'
import { registerSystemHandlers } from './ipc/systemHandlers'
import { registerPetHandlers } from './ipc/petHandlers'

// ES Module 环境下定义 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 开发环境标识
const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let memUService: MemUService | null = null
let systemMonitor: SystemMonitor | null = null

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

  mainWindow.setIgnoreMouseEvents(false)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
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
  // 创建托盘图标（这里使用一个简单的图标，实际应该使用 .ico 或 .png 文件）
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示宠物',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
        }
      }
    },
    {
      label: '打开对话',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('open-chat')
        }
      }
    },
    {
      label: '查看记忆',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('open-memory')
        }
      }
    },
    {
      label: '设置',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('open-settings')
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])
  
  tray.setToolTip('memPet - 桌面宠物')
  tray.setContextMenu(contextMenu)
  
  // 双击托盘图标显示/隐藏窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
      }
    }
  })
}

// 初始化服务
async function initializeServices() {
  try {
    console.log('[Main] 初始化服务...')
    
    // 1. 启动 memU-server
    memUService = new MemUService()
    await memUService.start()
    console.log('[Main] memU-server 启动成功')
    
    // 2. 启动系统监控
    systemMonitor = new SystemMonitor(memUService)
    systemMonitor.start()
    console.log('[Main] 系统监控启动成功')
    
    // 3. 注册 IPC 处理器
    registerMemoryHandlers(memUService)
    registerSystemHandlers(systemMonitor)
    registerPetHandlers(memUService)
    console.log('[Main] IPC 处理器注册成功')
    
    console.log('[Main] 所有服务初始化完成')
  } catch (error) {
    console.error('[Main] 服务初始化失败:', error)
    // 显示错误对话框
    const { dialog } = await import('electron')
    dialog.showErrorBox(
      'memPet 启动失败',
      `服务初始化失败：${error}\n\n请检查：\n1. memU-server 是否正确配置\n2. 环境变量是否设置\n3. 数据库是否运行`
    )
    app.quit()
  }
}

// 清理服务
async function cleanupServices() {
  console.log('[Main] 清理服务...')
  
  if (systemMonitor) {
    await systemMonitor.stop()
    console.log('[Main] 系统监控已停止')
  }
  
  if (memUService) {
    await memUService.stop()
    console.log('[Main] memU-server 已停止')
  }
}

// 应用准备就绪
app.whenReady().then(async () => {
  await initializeServices()
  createWindow()
  createTray()

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
