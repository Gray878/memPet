import { useState, useEffect } from 'react'
import { usePetStore } from '@renderer/stores/petStore'

/**
 * 宠物主窗口 - Layer 1 核心悬浮层
 * 特点: 无边框透明窗口,始终置顶,可拖拽
 */
export default function PetWindow() {
  const { behavior, position, setPosition } = usePetStore()
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, setPosition])

  return (
    <div
      className="fixed w-[200px] h-[200px] no-select"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 宠物动画区域 */}
      <div className="w-full h-full flex items-center justify-center">
        <PetAnimation behavior={behavior} />
      </div>
    </div>
  )
}

/**
 * 宠物动画组件 - SVG 精灵
 * 支持多种行为状态的动画
 */
function PetAnimation({ behavior }: { behavior: string }) {
  const getAnimationClass = () => {
    switch (behavior) {
      case 'Idle':
        return 'animate-breathe'
      case 'Speaking':
        return 'animate-bounce'
      case 'Thinking':
        return 'animate-pulse'
      case 'Sleeping':
        return 'opacity-60'
      default:
        return ''
    }
  }

  return (
    <div className="relative w-32 h-32">
      {/* SVG 宠物精灵 */}
      <div className={`w-full h-full ${getAnimationClass()}`}>
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full drop-shadow-lg"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.3))' }}
        >
          {/* 身体 */}
          <ellipse
            cx="60"
            cy="70"
            rx="35"
            ry="30"
            fill="url(#bodyGradient)"
            className="transition-all duration-300"
          />
          
          {/* 头部 */}
          <circle
            cx="60"
            cy="40"
            r="28"
            fill="url(#headGradient)"
            className="transition-all duration-300"
          />
          
          {/* 耳朵 */}
          <path
            d="M 35 25 Q 30 10 40 15 Z"
            fill="url(#earGradient)"
            className="transition-all duration-300"
          />
          <path
            d="M 85 25 Q 90 10 80 15 Z"
            fill="url(#earGradient)"
            className="transition-all duration-300"
          />
          
          {/* 眼睛 */}
          {behavior === 'Sleeping' ? (
            <>
              <line x1="48" y1="38" x2="56" y2="38" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
              <line x1="64" y1="38" x2="72" y2="38" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="50" cy="38" r="4" fill="#1F2937">
                {behavior === 'Thinking' && (
                  <animate
                    attributeName="cy"
                    values="38;36;38"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              <circle cx="70" cy="38" r="4" fill="#1F2937">
                {behavior === 'Thinking' && (
                  <animate
                    attributeName="cy"
                    values="38;36;38"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              {/* 眼睛高光 */}
              <circle cx="51" cy="37" r="1.5" fill="white" opacity="0.8" />
              <circle cx="71" cy="37" r="1.5" fill="white" opacity="0.8" />
            </>
          )}
          
          {/* 嘴巴 */}
          {behavior === 'Speaking' ? (
            <ellipse cx="60" cy="50" rx="6" ry="8" fill="#1F2937" opacity="0.6">
              <animate
                attributeName="ry"
                values="8;4;8"
                dur="0.6s"
                repeatCount="indefinite"
              />
            </ellipse>
          ) : (
            <path
              d="M 52 48 Q 60 52 68 48"
              stroke="#1F2937"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          )}
          
          {/* 腮红 */}
          <ellipse cx="42" cy="45" rx="5" ry="3" fill="#FF6B9D" opacity="0.3" />
          <ellipse cx="78" cy="45" rx="5" ry="3" fill="#FF6B9D" opacity="0.3" />
          
          {/* 渐变定义 */}
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="headGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
            <linearGradient id="earGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#BFDBFE" />
              <stop offset="100%" stopColor="#93C5FD" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* 行为指示器 - 开发模式显示 */}
      {import.meta.env.DEV && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-text-secondary bg-white/80 px-2 py-0.5 rounded">
          {behavior}
        </div>
      )}
    </div>
  )
}
