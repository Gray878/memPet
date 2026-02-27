import { defineStore } from 'pinia'
import { ref } from 'vue'

import { memPetApi } from '@/services/memPetApi'

export interface MemoryItem {
  id: string
  type: string
  content: string
  summary?: string | null
  created_at: string
  metadata?: Record<string, unknown>
}

export interface MemoriesStats {
  total_memories: number
  conversations: number
  observations: number
  today_count: number
  storage_size: string
}

export const useMemoryLogStore = defineStore('memoryLog', () => {
  const items = ref<MemoryItem[]>([])
  const stats = ref<MemoriesStats>({
    total_memories: 0,
    conversations: 0,
    observations: 0,
    today_count: 0,
    storage_size: '0 B',
  })
  const loading = ref(false)
  const statsLoading = ref(false)
  const error = ref('')
  
  const currentType = ref<string>('')
  const currentPage = ref(1)
  const pageSize = ref(20)
  const total = ref(0)

  async function fetchMemories() {
    loading.value = true
    error.value = ''
    try {
      console.log('[memoryLog] 开始获取记忆列表', {
        type: currentType.value,
        limit: pageSize.value,
        offset: (currentPage.value - 1) * pageSize.value,
      })
      const response = await memPetApi.listMemories({
        type: currentType.value || undefined,
        limit: pageSize.value,
        offset: (currentPage.value - 1) * pageSize.value,
      })
      console.log('[memoryLog] 获取记忆列表成功', response)
      if (response.data) {
        items.value = response.data.items || []
        total.value = response.data.total || 0
      }
    } catch (err) {
      console.error('[memoryLog] 获取记忆列表失败', err)
      error.value = err instanceof Error ? err.message : '获取记忆列表失败'
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    statsLoading.value = true
    try {
      console.log('[memoryLog] 开始获取统计信息')
      const response = await memPetApi.getMemoriesStats()
      console.log('[memoryLog] 获取统计信息成功', response)
      if (response.data) {
        stats.value = response.data
      }
    } catch (err) {
      console.error('[memoryLog] 获取统计信息失败', err)
    } finally {
      statsLoading.value = false
    }
  }

  function setType(type: string) {
    currentType.value = type
    currentPage.value = 1
    fetchMemories()
  }

  function setPage(page: number) {
    currentPage.value = page
    fetchMemories()
  }

  return {
    items,
    stats,
    loading,
    statsLoading,
    error,
    currentType,
    currentPage,
    pageSize,
    total,
    fetchMemories,
    fetchStats,
    setType,
    setPage,
  }
})
