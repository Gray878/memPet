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
 * 宠物动画组件 - 临时占位符
 * TODO: 集成 Live2D 或使用 Lottie 动画
 */
function PetAnimation({ behavior }: { behavior: string }) {
  return (
    <div className="relative w-32 h-32">
      {/* 临时占位 - 简单圆形宠物 */}
      <div
        className={`
          w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-400
          flex items-center justify-center text-white text-4xl
          shadow-float
          ${behavior === 'Idle' ? 'animate-breathe' : ''}
        `}
      >
        🐱
      </div>
      
      {/* 行为指示器 */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-text-secondary">
        {behavior}
      </div>
    </div>
  )
}
