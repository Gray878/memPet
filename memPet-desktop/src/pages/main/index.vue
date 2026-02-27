<script setup lang="ts">
import { convertFileSrc } from '@tauri-apps/api/core'
import { PhysicalSize } from '@tauri-apps/api/dpi'
import { Menu } from '@tauri-apps/api/menu'
import { sep } from '@tauri-apps/api/path'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { exists, readDir } from '@tauri-apps/plugin-fs'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { round } from 'es-toolkit'
import { nth } from 'es-toolkit/compat'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import SpeechBubble from '@/components/speech-bubble/index.vue'
import { useDevice } from '@/composables/useDevice'
import { useGamepad } from '@/composables/useGamepad'
import { useModel } from '@/composables/useModel'
import { useSharedMenu } from '@/composables/useSharedMenu'
import { useWindowPosition } from '@/composables/useWindowPosition'
import {
  hideWindow,
  setAlwaysOnTop,
  setTaskbarVisibility,
  showWindow,
} from '@/plugins/window'
import { useBackendStore } from '@/stores/backend'
import { useCatStore } from '@/stores/cat'
import { useChatStore } from '@/stores/chat'
import { useGeneralStore } from '@/stores/general.ts'
import { useModelStore } from '@/stores/model'
import { useObservationQueueStore } from '@/stores/observationQueue'
import { useProactiveStore } from '@/stores/proactive'
import { isImage } from '@/utils/is'
import { join } from '@/utils/path'
import { clearObject } from '@/utils/shared'

const { startListening } = useDevice()
const appWindow = getCurrentWebviewWindow()
const { modelSize, handleLoad, handleDestroy, handleResize, handleKeyChange } = useModel()
const catStore = useCatStore()
const { getSharedMenu } = useSharedMenu()
const modelStore = useModelStore()
const generalStore = useGeneralStore()
const resizing = ref(false)
const backgroundImagePath = ref<string>()
const { stickActive } = useGamepad()
const { isMounted, setWindowPosition } = useWindowPosition()

const backendStore = useBackendStore()
const chatStore = useChatStore()
const proactiveStore = useProactiveStore()
const observationQueueStore = useObservationQueueStore()

// Bubble message: show latest assistant reply or proactive message
const bubbleMessage = computed(() => {
  // Proactive quick message takes priority
  if (proactiveStore.quickMessage) {
    return proactiveStore.quickMessage
  }
  // Otherwise show latest assistant reply summary
  const lastMsg = chatStore.messages[chatStore.messages.length - 1]
  if (lastMsg?.role === 'assistant' && !lastMsg.isStreaming && !lastMsg.isError) {
    return lastMsg.content
  }
  return null
})

onMounted(async () => {
  startListening()
  await observationQueueStore.start()
  proactiveStore.updateContext(observationQueueStore.getContextSnapshot())
  backendStore.startWatchdog()

  await backendStore.refreshStatus().catch(() => undefined)
  await backendStore.refreshHealth().catch(() => undefined)
})

onUnmounted(() => {
  handleDestroy()
  backendStore.stopWatchdog()
  void observationQueueStore.stop()
})

const debouncedResize = useDebounceFn(async () => {
  await handleResize()
  await setWindowPosition()
  resizing.value = false
}, 100)

useEventListener('resize', () => {
  resizing.value = true
  debouncedResize()
})

watch(() => observationQueueStore.context, (nextContext) => {
  proactiveStore.updateContext(nextContext)
}, { deep: true })

watch(() => modelStore.currentModel, async (model) => {
  if (!model) return

  await handleLoad()

  const path = join(model.path, 'resources', 'background.png')

  const existed = await exists(path)

  backgroundImagePath.value = existed ? convertFileSrc(path) : void 0

  clearObject([modelStore.supportKeys, modelStore.pressedKeys])

  const resourcePath = join(model.path, 'resources')
  const groups = ['left-keys', 'right-keys']

  for await (const groupName of groups) {
    const groupDir = join(resourcePath, groupName)
    const files = await readDir(groupDir).catch(() => [])
    const imageFiles = files.filter(file => isImage(file.name))

    for (const file of imageFiles) {
      const fileName = file.name.split('.')[0]

      modelStore.supportKeys[fileName] = join(groupDir, file.name)
    }
  }

  setWindowPosition()
}, { deep: true, immediate: true })

watch([() => catStore.window.scale, modelSize], async ([scale, size]) => {
  if (!size) return

  const { width, height } = size
  
  // 为气泡预留顶部空间（70px）
  const bubbleSpace = 70

  appWindow.setSize(
    new PhysicalSize({
      width: Math.round(width * (scale / 100)),
      height: Math.round((height + bubbleSpace) * (scale / 100)),
    }),
  )
}, { immediate: true })

watch([modelStore.pressedKeys, stickActive], ([keys, nextStickActive]) => {
  const dirs = Object.values(keys).map((path) => {
    return nth(path.split(sep()), -2)!
  })

  const hasLeft = dirs.some(dir => dir.startsWith('left'))
  const hasRight = dirs.some(dir => dir.startsWith('right'))

  handleKeyChange(true, nextStickActive.left || hasLeft)
  handleKeyChange(false, nextStickActive.right || hasRight)
}, { deep: true })

watch(() => catStore.window.visible, async (value) => {
  value ? showWindow() : hideWindow()
})

watch(() => catStore.window.passThrough, (value) => {
  appWindow.setIgnoreCursorEvents(value)
}, { immediate: true })

watch(() => catStore.window.alwaysOnTop, setAlwaysOnTop, { immediate: true })

watch(() => generalStore.app.taskbarVisible, setTaskbarVisibility, { immediate: true })

function markActivity() {
  observationQueueStore.markUserActivity()
}

function handleMouseDown(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('[data-no-drag]')) {
    return
  }
  markActivity()
  appWindow.startDragging()
}

async function handleContextmenu(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('[data-no-drag]')) {
    return
  }

  event.preventDefault()

  if (event.shiftKey) return

  const menu = await Menu.new({
    items: await getSharedMenu(),
  })

  menu.popup()
}

function handleMouseMove(event: MouseEvent) {
  markActivity()

  const target = event.target as HTMLElement
  if (target.closest('[data-no-drag]')) {
    return
  }

  const { buttons, shiftKey, movementX, movementY } = event

  if (buttons !== 2 || !shiftKey) return

  const delta = (movementX + movementY) * 0.5
  const nextScale = Math.max(10, Math.min(catStore.window.scale + delta, 500))

  catStore.window.scale = round(nextScale)
}
</script>

<template>
  <div
    v-show="isMounted"
    class="relative size-screen"
    :class="{ '-scale-x-100': catStore.model.mirror }"
    :style="{
      opacity: catStore.window.opacity / 100,
      borderRadius: `${catStore.window.radius}%`,
    }"
    @contextmenu="handleContextmenu"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
  >
    <!-- 气泡容器 - 固定在顶部 70px 区域 -->
    <div class="absolute left-0 right-0 top-0 z-50 h-[70px] flex items-center justify-center pointer-events-none">
      <SpeechBubble
        :duration="8000"
        :message="bubbleMessage"
        :suggestion="proactiveStore.quickSuggestion"
        :show-details="true"
        :always-visible="true"
        position="top"
      />
    </div>

    <!-- 宠物内容区域 - 从 70px 开始向下 -->
    <div class="absolute left-0 right-0 bottom-0" style="top: 70px">
      <img
        v-if="backgroundImagePath"
        class="absolute inset-0 size-full object-cover"
        :src="backgroundImagePath"
      >

      <canvas
        id="live2dCanvas"
        class="absolute inset-0 size-full"
      />

      <img
        v-for="path in modelStore.pressedKeys"
        :key="path"
        class="absolute inset-0 size-full object-cover"
        :src="convertFileSrc(path)"
      >

      <div
        v-show="resizing"
        class="absolute inset-0 z-50 flex items-center justify-center bg-black"
      >
        <span class="text-center text-[10vw] text-white">
          {{ $t('pages.main.hints.redrawing') }}
        </span>
      </div>
    </div>
  </div>
</template>
