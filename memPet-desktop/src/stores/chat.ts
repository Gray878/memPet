import type { ChatMessage } from '@/types/memPetDomain'

import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { memPetApi } from '@/services/memPetApi'

interface ChatSendOptions {
  personality?: string
  retrieveMemories?: boolean
}

function nowIsoString(): string {
  return new Date().toISOString()
}

function normalizeHistory(messages: ChatMessage[]) {
  return messages
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .slice(-20)
    .map(message => ({
      role: message.role,
      content: message.content,
    }))
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const input = ref('')
  const useStream = ref(false)
  const sending = ref(false)
  const lastError = ref('')
  const memoriesUsed = ref(0)
  const memoryUsed = ref(false)

  const canSend = computed(() => !sending.value && input.value.trim().length > 0)

  function clearLastError() {
    lastError.value = ''
  }

  function clearMessages() {
    messages.value = []
  }

  async function memorizeLastConversation(userMessage: string, assistantMessage: string) {
    await memPetApi.memorizeConversation({
      type: 'conversation',
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage },
      ],
    })
  }

  async function sendMessage(rawMessage: string, options: ChatSendOptions = {}) {
    const message = rawMessage.trim()
    if (!message || sending.value) {
      return
    }

    sending.value = true
    clearLastError()

    const history = normalizeHistory(messages.value)
    const userMessage: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: message,
      timestamp: nowIsoString(),
    }
    messages.value.push(userMessage)
    input.value = ''

    const payload = {
      message,
      history,
      personality: options.personality || 'friendly',
      temperature: 0.7,
      max_tokens: 2000,
      retrieve_memories: options.retrieveMemories ?? true,
    }

    try {
      if (useStream.value) {
        const assistantMessage: ChatMessage = {
          id: nanoid(),
          role: 'assistant',
          content: '',
          timestamp: nowIsoString(),
          isStreaming: true,
        }
        messages.value.push(assistantMessage)

        await memPetApi.streamChat(payload, {
          onMetadata: (metadata) => {
            memoriesUsed.value = Number(metadata.memories_used || 0)
            memoryUsed.value = Boolean(metadata.memory_used)
          },
          onChunk: (chunk) => {
            assistantMessage.content += chunk
          },
          onComplete: () => {
            assistantMessage.isStreaming = false
          },
          onError: (errorPayload) => {
            const reason = String(errorPayload.error || '流式对话失败')
            throw new Error(reason)
          },
        })

        await memorizeLastConversation(message, assistantMessage.content)
        return
      }

      const response = await memPetApi.chat(payload)
      const chatData = response.data
      if (!chatData) {
        throw new Error('后端返回空数据')
      }
      memoriesUsed.value = Number(chatData.memories_used || 0)
      memoryUsed.value = Boolean(chatData.memory_used)

      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: chatData.response || '',
        timestamp: nowIsoString(),
      }
      messages.value.push(assistantMessage)

      await memorizeLastConversation(message, assistantMessage.content)
    } catch (error) {
      const reason = error instanceof Error ? error.message : '发送消息失败'
      lastError.value = reason
      messages.value.push({
        id: nanoid(),
        role: 'assistant',
        content: `抱歉，我遇到一个问题：${reason}`,
        timestamp: nowIsoString(),
        isError: true,
      })
    } finally {
      sending.value = false
    }
  }

  return {
    messages,
    input,
    useStream,
    sending,
    canSend,
    memoriesUsed,
    memoryUsed,
    lastError,
    clearLastError,
    clearMessages,
    sendMessage,
  }
})
