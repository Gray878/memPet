import { useState, useEffect } from 'react'
import { X, Lightbulb, AlertCircle, Coffee, Moon } from 'lucide-react'

interface ProactiveMessageProps {
  data: {
    suggestion: {
      type: string
      priority: 'high' | 'medium' | 'low'
      message: string
      reason: string
      action: string
    }
    message: string
    context: any
    timestamp: string
  }
  onClose: () => void
  onAction?: () => void
}

/**
 * 主动推理消息组件
 * 显示宠物的主动建议和提醒
 */
export default function ProactiveMessage({ data, onClose, onAction }: ProactiveMessageProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 入场动画
    setTimeout(() => setIsVisible(true), 50)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const handleAction = () => {
    if (onAction) {
      onAction()
    }
    handleClose()
  }

  // 根据建议类型选择图标和颜色
  const getTypeConfig = () => {
    const { type, priority } = data.suggestion

    const configs: Record<string, { icon: any; color: string; bgColor: string }> = {
      fatigue_reminder: {
        icon: AlertCircle,
        color: 'text-warning',
        bgColor: 'bg-orange-50',
      },
      late_night_reminder: {
        icon: Moon,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
      break_suggestion: {
        icon: Coffee,
        color: 'text-success',
        bgColor: 'bg-green-50',
      },
      idle_interaction: {
        icon: Lightbulb,
        color: 'text-primary',
        bgColor: 'bg-blue-50',
      },
      hydration_reminder: {
        icon: Coffee,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
      },
    }

    return configs[type] || {
      icon: Lightbulb,
      color: 'text-text-secondary',
      bgColor: 'bg-background-secondary',
    }
  }

  const config = getTypeConfig()
  const Icon = config.icon

  // 优先级样式
  const getPriorityStyle = () => {
    const { priority } = data.suggestion
    switch (priority) {
      case 'high':
        return 'border-l-4 border-warning'
      case 'medium':
        return 'border-l-4 border-primary'
      case 'low':
        return 'border-l-4 border-text-tertiary'
      default:
        return ''
    }
  }

  return (
    <div
      className={`
        fixed bottom-24 right-6 w-80 z-50
        transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
    >
      <div
        className={`
          bg-white rounded-card shadow-modal
          ${getPriorityStyle()}
          overflow-hidden
        `}
      >
        {/* 头部 */}
        <div className={`${config.bgColor} px-lg py-md flex items-start gap-md`}>
          <div className={`${config.color} mt-1`}>
            <Icon size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-text mb-xs">
              {data.suggestion.message}
            </h3>
            <p className="text-xs text-text-secondary">
              {data.suggestion.reason}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/50 rounded transition-colors duration-micro"
          >
            <X size={16} className="text-text-secondary" />
          </button>
        </div>

        {/* 消息内容 */}
        <div className="px-lg py-md">
          <p className="text-sm text-text leading-relaxed">
            {data.message}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="px-lg py-md border-t border-border flex gap-sm">
          <button
            onClick={handleAction}
            className="btn btn-primary flex-1 text-sm"
          >
            {data.suggestion.action}
          </button>
          <button
            onClick={handleClose}
            className="btn btn-secondary text-sm"
          >
            稍后
          </button>
        </div>

        {/* 时间戳 */}
        <div className="px-lg py-xs bg-background-secondary">
          <p className="text-xs text-text-tertiary">
            {new Date(data.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
