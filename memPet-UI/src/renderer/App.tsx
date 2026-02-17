import { useState, useEffect } from 'react'
import { usePetStore } from '@renderer/stores/petStore'
import { useProactiveStore } from '@renderer/stores/proactiveStore'
import PetWindow from '@renderer/components/Pet/PetWindow'
import SpeechBubble from '@renderer/components/Pet/SpeechBubble'
import StatusPanel from '@renderer/components/Pet/StatusPanel'
import ChatWindow from '@renderer/components/Chat/ChatWindow'
import MemoryBrowser from '@renderer/components/Memory/MemoryBrowser'
import SettingsWindow from '@renderer/components/Settings/SettingsWindow'
import ProactiveMessage from '@renderer/components/Proactive/ProactiveMessage'
import DevPanel from '@renderer/components/Dev/DevPanel'

const isDev = import.meta.env.DEV

function App() {
  const {
    position,
    showStatusPanel,
    toggleStatusPanel,
    speechBubble,
    hideSpeech,
    petName,
    status,
    mood,
    focusLevel,
    workTime,
    breakCount,
    showSpeech,
  } = usePetStore()

  const { currentMessage, setCurrentMessage, clearCurrentMessage, isEnabled } = useProactiveStore()

  const [showChat, setShowChat] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // 监听来自主进程的事件
  useEffect(() => {
    const handleOpenChat = () => setShowChat(true)
    const handleOpenMemory = () => setShowMemory(true)
    const handleOpenSettings = () => setShowSettings(true)
    
    // 监听主动推理消息
    const handleProactiveMessage = (_event: any, data: any) => {
      if (isEnabled) {
        setCurrentMessage({
          id: Date.now().toString(),
          ...data,
        })
      }
    }

    // @ts-ignore - electron API
    window.electron?.ipcRenderer?.on('open-chat', handleOpenChat)
    // @ts-ignore
    window.electron?.ipcRenderer?.on('open-memory', handleOpenMemory)
    // @ts-ignore
    window.electron?.ipcRenderer?.on('open-settings', handleOpenSettings)
    // @ts-ignore
    window.electron?.ipcRenderer?.on('proactive-message', handleProactiveMessage)

    return () => {
      // @ts-ignore
      window.electron?.ipcRenderer?.removeListener('open-chat', handleOpenChat)
      // @ts-ignore
      window.electron?.ipcRenderer?.removeListener('open-memory', handleOpenMemory)
      // @ts-ignore
      window.electron?.ipcRenderer?.removeListener('open-settings', handleOpenSettings)
      // @ts-ignore
      window.electron?.ipcRenderer?.removeListener('proactive-message', handleProactiveMessage)
    }
  }, [isEnabled, setCurrentMessage])

  // 首次启动欢迎消息
  useEffect(() => {
    const timer = setTimeout(() => {
      showSpeech('嗨,我是小U!点击我开始聊天吧~')
    }, 1000)

    return () => clearTimeout(timer)
  }, [showSpeech])

  // 点击宠物显示状态面板
  const handlePetClick = () => {
    toggleStatusPanel()
  }

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    
    // 创建简单的右键菜单
    const menu = document.createElement('div')
    menu.className = 'fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50'
    menu.style.left = `${e.clientX}px`
    menu.style.top = `${e.clientY}px`
    
    const menuItems = [
      { label: '打开对话', action: () => setShowChat(true) },
      { label: '查看记忆', action: () => setShowMemory(true) },
      { label: '设置', action: () => setShowSettings(true) },
    ]
    
    menuItems.forEach(item => {
      const button = document.createElement('button')
      button.className = 'w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700'
      button.textContent = item.label
      button.onclick = () => {
        item.action()
        menu.remove()
      }
      menu.appendChild(button)
    })
    
    document.body.appendChild(menu)
    
    // 点击其他地方关闭菜单
    const closeMenu = () => {
      menu.remove()
      document.removeEventListener('click', closeMenu)
    }
    setTimeout(() => document.addEventListener('click', closeMenu), 0)
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent">
      {/* Layer 1: 宠物主窗口 */}
      <div onClick={handlePetClick} onContextMenu={handleContextMenu}>
        <PetWindow />
      </div>

      {/* Layer 2: 对话气泡 */}
      {speechBubble.show && (
        <SpeechBubble
          message={speechBubble.message}
          position={position}
          onClose={hideSpeech}
        />
      )}

      {/* Layer 2: 状态面板 */}
      {showStatusPanel && (
        <StatusPanel
          petName={petName}
          status={status}
          mood={mood}
          focusLevel={focusLevel}
          workTime={workTime}
          breakCount={breakCount}
          position={position}
          onClose={toggleStatusPanel}
        />
      )}

      {/* Layer 3: 记忆浏览器 */}
      {showMemory && <MemoryBrowser onClose={() => setShowMemory(false)} />}

      {/* Layer 4: 对话窗口 */}
      {showChat && <ChatWindow onClose={() => setShowChat(false)} />}

      {/* Layer 5: 设置窗口 */}
      {showSettings && <SettingsWindow onClose={() => setShowSettings(false)} />}

      {/* Layer 6: 主动推理消息 */}
      {currentMessage && (
        <ProactiveMessage
          data={currentMessage}
          onClose={clearCurrentMessage}
          onAction={() => {
            // TODO: 执行建议的操作
            console.log('执行操作:', currentMessage.suggestion.action)
          }}
        />
      )}

      {/* 开发工具面板 */}
      {isDev && <DevPanel />}
    </div>
  )
}

export default App
