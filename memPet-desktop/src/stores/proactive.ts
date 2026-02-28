import type { ProactiveSuggestion, SystemContext } from '@/types/memPetDomain'

import { defineStore } from 'pinia'
import { ref } from 'vue'

import { memPetApi } from '@/services/memPetApi'

const defaultContext: SystemContext = {
  working_duration: 0,
  active_app: 'Unknown',
  fatigue_level: 'Fresh',
  is_late_night: false,
  idle_time: 0,
  is_work_hours: false,
  focus_level: 'Idle',
}

export const useProactiveStore = defineStore('proactive', () => {
  const context = ref<SystemContext>({ ...defaultContext })
  const loading = ref(false)
  const lastError = ref('')
  const suggestions = ref<ProactiveSuggestion[]>([])
  const quickSuggestion = ref<ProactiveSuggestion | null>(null)
  const quickMessage = ref<string | null>(null)
  const generatedMessage = ref('')
  const generatedPrompt = ref('')
  const cooldowns = ref<Record<string, unknown>>({})
  const memories = ref<Array<Record<string, unknown>>>([])

  function updateContext(nextContext: Partial<SystemContext>) {
    context.value = {
      ...context.value,
      ...nextContext,
    }
  }

  async function runQuick(personality = 'friendly', limit = 3, skipCooldown = false) {
    loading.value = true
    lastError.value = ''
    try {
      const response = await memPetApi.proactiveQuick({
        context: context.value as Record<string, unknown>,
        personality,
        limit,
        skip_cooldown: skipCooldown,
      })

      const data = response.data
      if (!data) {
        throw new Error('后端返回空数据')
      }
      
      quickMessage.value = data.message || null
      quickSuggestion.value = (data.suggestion || null) as ProactiveSuggestion | null
      memories.value = data.memories || []
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '主动推理失败'
    } finally {
      loading.value = false
    }
  }

  async function analyze(skipCooldown = false) {
    loading.value = true
    lastError.value = ''
    try {
      const response = await memPetApi.proactiveAnalyze({
        context: context.value as Record<string, unknown>,
        skip_cooldown: skipCooldown,
      })
      const data = response.data
      if (!data) {
        throw new Error('后端返回空数据')
      }
      suggestions.value = (data.suggestions || []) as ProactiveSuggestion[]
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '分析上下文失败'
    } finally {
      loading.value = false
    }
  }

  async function generate(suggestion: ProactiveSuggestion, personality = 'friendly', limit = 3) {
    loading.value = true
    lastError.value = ''
    try {
      const response = await memPetApi.proactiveGenerate({
        suggestion: suggestion as Record<string, unknown>,
        context: context.value as Record<string, unknown>,
        personality,
        limit,
      })
      const data = response.data
      if (!data) {
        throw new Error('后端返回空数据')
      }
      generatedMessage.value = data.message
      generatedPrompt.value = data.prompt
      memories.value = data.memories || []
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '生成主动消息失败'
    } finally {
      loading.value = false
    }
  }

  async function refreshCooldown() {
    try {
      const response = await memPetApi.getCooldownStatus()
      cooldowns.value = response.data?.cooldowns || {}
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '冷却状态获取失败'
    }
  }

  async function resetCooldown(type?: string) {
    try {
      const response = await memPetApi.resetCooldown(type ? { type } : {})
      cooldowns.value = response.data?.cooldowns || {}
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '冷却重置失败'
    }
  }

  return {
    context,
    loading,
    lastError,
    suggestions,
    quickSuggestion,
    quickMessage,
    generatedMessage,
    generatedPrompt,
    cooldowns,
    memories,
    updateContext,
    runQuick,
    analyze,
    generate,
    refreshCooldown,
    resetCooldown,
  }
})
