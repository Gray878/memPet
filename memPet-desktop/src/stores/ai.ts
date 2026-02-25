import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAiStore = defineStore('ai', () => {
  // LLM configuration
  const provider = ref<'openai' | 'dashscope' | 'siliconflow'>('openai')
  const apiKey = ref('')
  const baseUrl = ref('')
  const model = ref('')
  const temperature = ref(0.7)
  const maxTokens = ref(1024)

  // Personality
  const personality = ref<'friendly' | 'energetic' | 'professional' | 'tsundere'>('friendly')

  // Proactive reasoning
  const proactiveEnabled = ref(true)
  const proactiveInterval = ref(300)
  const proactiveMemoryLimit = ref(3)
  const proactiveCooldown = ref(60)

  // Memory enhancement
  const memoryEnabled = ref(true)
  const memoryRetrieveLimit = ref(5)

  return {
    provider,
    apiKey,
    baseUrl,
    model,
    temperature,
    maxTokens,
    personality,
    proactiveEnabled,
    proactiveInterval,
    proactiveMemoryLimit,
    proactiveCooldown,
    memoryEnabled,
    memoryRetrieveLimit,
  }
})
