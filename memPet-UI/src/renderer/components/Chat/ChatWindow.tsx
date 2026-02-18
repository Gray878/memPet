import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '@renderer/stores/chatStore'
import { useAutoMemory } from '@renderer/hooks/useMemU'
import { X, Send } from 'lucide-react'

interface ChatWindowProps {
  onClose: () => void
}

/**
 * 对话窗口 - Layer 4 独立窗口
 * 特点: 可拖拽,可调整大小,现代化聊天界面
 */
export default function ChatWindow({ onClose }: ChatWindowProps) {
  const { messages, addMessage, updateLastMessage, setLastMessageStreaming, setThinking, isThinking } = useChatStore()
  const { recordConversation } = useAutoMemory()
  const [input, setInput] = useState('')
  const [useStream, setUseStream] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 监听流式事件
  useEffect(() => {
    // 检查 electronAPI 是否可用
    if (!window.electronAPI?.events) {
      console.warn('[ChatWindow] electronAPI.events 不可用')
      return
    }

    const handleStreamChunk = (chunk: string) => {
      updateLastMessage(chunk)
    }

    const handleStreamComplete = () => {
      setLastMessageStreaming(false)
      setThinking(false)
    }

    const handleStreamError = (error: string) => {
      console.error('流式对话错误:', error)
      setLastMessageStreaming(false)
      setThinking(false)
      addMessage({
        role: 'assistant',
        content: `抱歉,发生了错误: ${error}`,
        timestamp: new Date(),
      })
    }

    window.electronAPI.events.on('chat-stream-chunk', handleStreamChunk)
    window.electronAPI.events.on('chat-stream-complete', handleStreamComplete)
    window.electronAPI.events.on('chat-stream-error', handleStreamError)

    return () => {
      window.electronAPI.events.removeListener('chat-stream-chunk', handleStreamChunk)
      window.electronAPI.events.removeListener('chat-stream-complete', handleStreamComplete)
      window.electronAPI.events.removeListener('chat-stream-error', handleStreamError)
    }
  }, [updateLastMessage, setLastMessageStreaming, setThinking, addMessage])

  const handleSend = async () => {
    if (!input.trim() || isThinking) return

    // 检查 API 是否可用
    if (!window.electronAPI?.chat) {
      console.error('[ChatWindow] electronAPI.chat 不可用')
      addMessage({
        role: 'assistant',
        content: '抱歉,对话服务暂时不可用。请稍后再试。',
        timestamp: new Date(),
      })
      return
    }

    const userMessage = input.trim()
    
    // 添加用户消息
    addMessage({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    })

    setInput('')
    setThinking(true)

    try {
      if (useStream) {
        // 流式对话
        // 先添加一个空的 AI 消息
        addMessage({
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        })

        const result = await window.electronAPI.chat.sendMessageStream(userMessage)
        
        if (!result.success) {
          throw new Error(result.error || '流式对话失败')
        }
        // 流式完成后会通过事件处理
      } else {
        // 非流式对话
        const result = await window.electronAPI.chat.sendMessage(userMessage)
        
        if (result.success && result.data) {
          addMessage({
            role: 'assistant',
            content: result.data,
            timestamp: new Date(),
          })
          setThinking(false)
        } else {
          throw new Error(result.error || '未知错误')
        }
      }
      
    } catch (error: any) {
      console.error('发送消息失败:', error)
      addMessage({
        role: 'assistant',
        content: `抱歉,我遇到了一些问题: ${error.message || error}`,
        timestamp: new Date(),
      })
      setThinking(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 animate-fade-in">
      <div className="w-[400px] h-[600px] bg-white rounded-card shadow-modal flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-lg py-md border-b border-border draggable">
          <h2 className="text-base font-medium text-text">memPet 对话</h2>
          <div className="flex items-center gap-sm non-draggable">
            <button
              onClick={() => setUseStream(!useStream)}
              className={`px-sm py-xs text-xs rounded transition-colors duration-micro ${
                useStream 
                  ? 'bg-primary text-white' 
                  : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
              }`}
              title={useStream ? '流式模式' : '普通模式'}
            >
              {useStream ? '⚡ 流式' : '📝 普通'}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-background-secondary rounded transition-colors duration-micro"
            >
              <X size={18} className="text-text-secondary" />
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-lg space-y-md">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))
          )}
          {isThinking && <ThinkingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="border-t border-border p-lg">
          <div className="flex gap-sm">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="说点什么..."
              className="input flex-1"
              disabled={isThinking}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
              className="btn btn-primary px-md"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 空状态组件
 */
function EmptyState() {
  const { addMessage } = useChatStore()

  const quickStarts = [
    '介绍一下自己',
    '今天做了什么',
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <p className="text-text-secondary mb-md">还没有对话记录</p>
      <p className="text-sm text-text-tertiary mb-lg">说点什么开始吧,比如:</p>
      <div className="flex gap-sm">
        {quickStarts.map((text) => (
          <button
            key={text}
            onClick={() => {
              addMessage({
                role: 'user',
                content: text,
                timestamp: new Date(),
              })
            }}
            className="btn btn-secondary text-xs"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * 消息气泡组件
 */
function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user'
  const isStreaming = message.isStreaming

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`
          max-w-[70%] px-md py-sm rounded-card relative
          ${isUser 
            ? 'bg-primary text-white' 
            : 'bg-background-secondary text-text'
          }
          ${isStreaming ? 'streaming-message' : ''}
        `}
      >
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
          )}
        </p>
        <p className={`text-xs mt-xs ${isUser ? 'text-blue-100' : 'text-text-tertiary'}`}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

/**
 * 思考中指示器
 */
function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-background-secondary px-md py-sm rounded-card">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
