import type { SystemContext } from '@/types/memPetDomain'

import { defineStore } from 'pinia'
import { ref } from 'vue'

import { memPetApi } from '@/services/memPetApi'

export type RetrieveScenario = 'conversation' | 'proactive'

export const useMemoryStore = defineStore('memory', () => {
  const scenario = ref<RetrieveScenario>('conversation')
  const query = ref('')
  const limit = ref(20)
  const loading = ref(false)
  const lastError = ref('')
  const items = ref<Array<Record<string, unknown>>>([])
  const resultSummary = ref({
    categories: 0,
    resources: 0,
  })

  async function retrieve(context: {
    scenario?: RetrieveScenario
    query?: string
    context?: SystemContext
    limit?: number
  } = {}) {
    loading.value = true
    lastError.value = ''

    const nextScenario = context.scenario || scenario.value
    const nextLimit = context.limit || limit.value

    try {
      const response = nextScenario === 'proactive'
        ? await memPetApi.retrieveProactive({
            scenario: 'proactive',
            context: (context.context || {}) as Record<string, unknown>,
            limit: nextLimit,
          })
        : await memPetApi.retrieveConversation({
            scenario: 'conversation',
            query: context.query || query.value,
            limit: nextLimit,
          })

      const data = response.data
      if (!data) {
        throw new Error('后端返回空数据')
      }
      items.value = data.items || []
      resultSummary.value = {
        categories: data.result?.categories?.length || 0,
        resources: data.result?.resources?.length || 0,
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '检索记忆失败'
    } finally {
      loading.value = false
    }
  }

  async function recordObservation(payload: {
    type: string
    app?: string
    duration?: number
    timestamp?: string
    [key: string]: unknown
  }) {
    return memPetApi.memorizeObservation({
      type: 'system_observation',
      observation: payload,
    })
  }

  return {
    scenario,
    query,
    limit,
    loading,
    lastError,
    items,
    resultSummary,
    retrieve,
    recordObservation,
  }
})
