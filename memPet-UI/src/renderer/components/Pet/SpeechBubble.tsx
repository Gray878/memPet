import { useEffect, useState } from 'react'

interface SpeechBubbleProps {
  message: string
  position: { x: number; y: number }
  onClose?: () => void
  autoClose?: boolean
  duration?: number
}

/**
 * 对话气泡 - Layer 2 临时提示
 * 特点: 轻量级,自动消失,带小三角指向宠物
 */
export default function SpeechBubble({
  message,
  position,
  onClose,
  autoClose = true,
  duration = 4000,
}: SpeechBubbleProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (!autoClose) return

    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose?.(), 200) // 等待淡出动画
    }, duration)

    return () => clearTimeout(timer)
  }, [autoClose, duration, onClose])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className="fixed z-50 animate-slide-up"
      style={{
        left: position.x,
        top: position.y - 80, // 在宠物上方显示
        maxWidth: '250px',
      }}
    >
      {/* 气泡内容 */}
      <div className="bg-white rounded-card shadow-panel border border-border p-md">
        <p className="text-sm text-text leading-relaxed break-words">
          {message}
        </p>
      </div>

      {/* 小三角 */}
      <div className="flex justify-center mt-1">
        <div
          className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px]"
          style={{
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: 'white',
          }}
        />
      </div>
    </div>
  )
}
