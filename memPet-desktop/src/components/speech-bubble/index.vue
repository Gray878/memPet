<script setup lang="ts">
import type { ProactiveSuggestion } from '@/types/memPetDomain'

import { computed, ref, watch } from 'vue'

import { openChat } from '@/plugins/window'

const props = withDefaults(defineProps<{
  message?: string | null
  duration?: number
  position?: 'top' | 'top-right'
  suggestion?: ProactiveSuggestion | null
  showDetails?: boolean
  alwaysVisible?: boolean
}>(), {
  message: null,
  duration: 6000,
  position: 'top',
  suggestion: null,
  showDetails: false,
  alwaysVisible: false,
})

const visible = ref(false)
const displayText = ref('')
const currentSuggestion = ref<ProactiveSuggestion | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | null = null

const maxLength = 50

const truncatedMessage = computed(() => {
  if (!displayText.value) return ''
  return displayText.value.length > maxLength
    ? `${displayText.value.slice(0, maxLength)}…`
    : displayText.value
})

watch(
  () => [props.message, props.suggestion, props.alwaysVisible] as const,
  ([newMessage, newSuggestion, alwaysVisible]) => {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }

    // 测试模式：永久显示
    if (alwaysVisible) {
      displayText.value = newMessage || '主人休息一下吧'
      currentSuggestion.value = newSuggestion || null
      visible.value = true
      return
    }

    if (!newMessage) {
      visible.value = false
      return
    }

    displayText.value = newMessage
    currentSuggestion.value = newSuggestion || null
    visible.value = true

    hideTimer = setTimeout(() => {
      visible.value = false
    }, props.duration)
  },
  { immediate: true }
)

function handleClick() {
  openChat()
  visible.value = false
}

function handleDismiss(event: Event) {
  event.stopPropagation()
  visible.value = false
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-1 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 -translate-y-1 scale-95"
  >
    <div
      v-if="visible && truncatedMessage"
      class="relative pointer-events-auto"
      data-no-drag
    >
      <!-- 气泡容器 -->
      <div class="relative max-w-[200px]">
        <!-- 气泡主体 -->
        <div 
          class="relative cursor-pointer rounded-2xl bg-white px-3 py-1 shadow-lg transition-transform hover:scale-105"
          @click="handleClick"
        >
          <!-- 文字内容 -->
          <p class="text-xs leading-relaxed text-gray-800">
            {{ truncatedMessage }}
          </p>
          
          <!-- 关闭按钮 -->
          <button
            class="absolute -right-1 -top-1 h-4 w-4 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 opacity-0 transition-all hover:bg-gray-300 hover:opacity-100 group-hover:opacity-100"
            @click="handleDismiss"
          >
            <svg
              class="h-2.5 w-2.5"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              viewBox="0 0 24 24"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- 气泡尾巴（指向宠物） -->
        <div class="absolute left-1/2 top-full -translate-x-1/2">
          <svg width="16" height="8" viewBox="0 0 16 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 8C8 8 4 4 0 0H16C12 4 8 8 8 8Z" fill="white" />
          </svg>
        </div>
      </div>
    </div>
  </Transition>
</template>
