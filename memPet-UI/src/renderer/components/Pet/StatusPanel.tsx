import { useEffect, useRef } from 'react'

interface StatusPanelProps {
  petName: string
  status: string
  mood: string
  focusLevel: string
  workTime: string
  breakCount: number
  position: { x: number; y: number }
  onClose: () => void
}

/**
 * 状态面板 - Layer 2 附着气泡
 * 特点: 小型面板,紧贴宠物显示,点击外部自动关闭
 */
export default function StatusPanel({
  petName,
  status,
  mood,
  focusLevel,
  workTime,
  breakCount,
  position,
  onClose,
}: StatusPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // 自动关闭 (3秒后)
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      className="fixed z-40 w-[150px] animate-fade-in"
      style={{
        left: position.x + 210, // 在宠物右侧显示
        top: position.y,
      }}
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-card shadow-panel border border-border p-md">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm font-medium text-text">{petName}</span>
        </div>

        {/* 分割线 */}
        <div className="h-px bg-border my-sm" />

        {/* 状态信息 */}
        <div className="space-y-xs text-xs">
          <div className="flex justify-between">
            <span className="text-text-secondary">状态:</span>
            <span className="text-text">{status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">心情:</span>
            <span className="text-text">{mood}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">专注度:</span>
            <span className="text-text">{focusLevel}</span>
          </div>
        </div>

        {/* 分割线 */}
        <div className="h-px bg-border my-sm" />

        {/* 统计信息 */}
        <div className="space-y-xs text-xs">
          <div className="flex justify-between">
            <span className="text-text-secondary">今日工作:</span>
            <span className="text-text">{workTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">休息次数:</span>
            <span className="text-text">{breakCount}次</span>
          </div>
        </div>
      </div>
    </div>
  )
}
