import { useState, useEffect } from 'react'
import { useMemoryStore } from '@renderer/stores/memoryStore'
import { useAutoMemory } from '@renderer/hooks/useMemU'
import { X, Search, Filter } from 'lucide-react'

interface MemoryBrowserProps {
  onClose: () => void
}

/**
 * 记忆浏览器 - Layer 3 独立窗口
 * 特点: 时间轴视图,搜索和筛选功能
 */
export default function MemoryBrowser({ onClose }: MemoryBrowserProps) {
  const { memories, setMemories, searchQuery, filterType, setSearchQuery, setFilterType } = useMemoryStore()
  const { getRecentMemories, searchMemories, loading } = useAutoMemory()
  const [showFilter, setShowFilter] = useState(false)

  // 加载最近记忆
  useEffect(() => {
    loadMemories()
  }, [])

  const loadMemories = async () => {
    const recentMemories = await getRecentMemories(50)
    setMemories(recentMemories)
  }

  // 搜索记忆
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (!query.trim()) {
      await loadMemories()
      return
    }

    const results = await searchMemories(query, {
      limit: 50,
      type: filterType || undefined,
    })
    setMemories(results)
  }

  // 过滤记忆
  const filteredMemories = memories.filter((memory) => {
    const matchesFilter = !filterType || memory.type === filterType || memory.metadata?.type === filterType
    return matchesFilter
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 animate-fade-in">
      <div className="w-[500px] h-[700px] bg-white rounded-card shadow-modal flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-lg py-md border-b border-border draggable">
          <h2 className="text-base font-medium text-text">记忆浏览器</h2>
          <button
            onClick={onClose}
            className="non-draggable p-1 hover:bg-background-secondary rounded transition-colors duration-micro"
          >
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* 搜索和筛选 */}
        <div className="px-lg py-md border-b border-border space-y-sm">
          <div className="flex gap-sm">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜索记忆..."
                className="input pl-9"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`btn ${showFilter ? 'btn-primary' : 'btn-secondary'} px-md`}
            >
              <Filter size={16} />
            </button>
          </div>

          {/* 筛选选项 */}
          {showFilter && (
            <div className="flex gap-sm animate-slide-up">
              <button
                onClick={() => setFilterType(null)}
                className={`btn text-xs ${!filterType ? 'btn-primary' : 'btn-secondary'}`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterType('conversation')}
                className={`btn text-xs ${filterType === 'conversation' ? 'btn-primary' : 'btn-secondary'}`}
              >
                对话
              </button>
              <button
                onClick={() => setFilterType('observation')}
                className={`btn text-xs ${filterType === 'observation' ? 'btn-primary' : 'btn-secondary'}`}
              >
                观察
              </button>
              <button
                onClick={() => setFilterType('action')}
                className={`btn text-xs ${filterType === 'action' ? 'btn-primary' : 'btn-secondary'}`}
              >
                行动
              </button>
            </div>
          )}
        </div>

        {/* 记忆列表 */}
        <div className="flex-1 overflow-y-auto p-lg">
          {filteredMemories.length === 0 ? (
            <EmptyState hasSearch={!!searchQuery || !!filterType} />
          ) : (
            <div className="space-y-md">
              {filteredMemories.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 空状态组件
 */
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-text-secondary">没有找到匹配的记忆</p>
        <p className="text-sm text-text-tertiary mt-sm">试试其他关键词或筛选条件</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <p className="text-text-secondary">还没有记忆</p>
      <p className="text-sm text-text-tertiary mt-sm">和我聊聊天,我就会记住啦~</p>
    </div>
  )
}

/**
 * 记忆卡片组件
 */
function MemoryCard({ memory }: { memory: any }) {
  const [expanded, setExpanded] = useState(false)

  const typeLabels = {
    conversation: '对话',
    observation: '观察',
    action: '行动',
  }

  const typeColors = {
    conversation: 'text-primary',
    observation: 'text-success',
    action: 'text-warning',
  }

  return (
    <div className="card card-hover">
      {/* 时间戳 */}
      <div className="text-xs text-text-tertiary mb-xs">
        {new Date(memory.timestamp).toLocaleString('zh-CN')}
      </div>

      {/* 内容 */}
      <p className={`text-sm text-text leading-relaxed ${!expanded && 'line-clamp-3'}`}>
        {memory.content}
      </p>

      {/* 展开按钮 */}
      {memory.content.length > 100 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary mt-xs hover:underline"
        >
          {expanded ? '收起' : '展开'}
        </button>
      )}

      {/* 类型标签 */}
      <div className="mt-sm">
        <span className={`text-xs ${typeColors[memory.type as keyof typeof typeColors]}`}>
          类型: {typeLabels[memory.type as keyof typeof typeLabels]}
        </span>
      </div>
    </div>
  )
}
