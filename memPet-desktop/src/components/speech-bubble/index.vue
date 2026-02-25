<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { openChat } from '@/plugins/window'

const props = withDefaults(defineProps<{
  message?: string | null
  duration?: number
  position?: 'top' | 'top-right'
}>(), {
  message: null,
  duration: 6000,
  position: 'top',
})

const visible = ref(false)
const displayText = ref('')
let hideTimer: ReturnType<typeof setTimeout> | null = null

const maxLength = 60

const truncatedMessage = computed(() => {
  if (!displayText.value) return ''
  return displayText.value.length > maxLength
    ? `${displayText.value.slice(0, maxLength)}…`
    : displayText.value
})

watch(
  () => props.message,
  (newMessage) => {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }

    if (!newMessage) {
      visible.value = false
      return
    }

    displayText.value = newMessage
    visible.value = true

    hideTimer = setTimeout(() => {
      visible.value = false
    }, props.duration)
  },
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
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-1"
  >
    <div
      v-if="visible && truncatedMessage"
      class="absolute left-1/2 top-3 z-40 cursor-pointer -translate-x-1/2"
      :class="position === 'top-right' ? 'left-auto right-3 translate-x-0' : ''"
      data-no-drag
      @click="handleClick"
    >
      <div class="flex items-center gap-3 rounded-lg bg-[#343541] px-4 py-3 shadow-lg">
        <div class="h-6 w-6 flex items-center justify-center rounded-full bg-green-500 text-xs text-white font-bold">
          M
        </div>
        <span class="text-sm text-gray-200">
          {{ truncatedMessage }}
        </span>
        <button
          class="h-5 w-5 flex items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
          @click="handleDismiss"
        >
          <svg
            class="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            viewBox="0 0 24 24"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>
