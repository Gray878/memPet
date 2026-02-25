<script setup lang="ts">
import type { ChatMessage } from '@/types/memPetDomain'

import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { Button, Input, Switch, Tooltip, message } from 'ant-design-vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import VueMarkdown from 'vue-markdown-render'

import { closeChat } from '@/plugins/window'
import { useBackendStore } from '@/stores/backend'
import { useChatStore } from '@/stores/chat'

const appWindow = getCurrentWebviewWindow()
const chatStore = useChatStore()
const backendStore = useBackendStore()
const { t } = useI18n()

const messagesContainer = ref<HTMLDivElement>()

const statusLabel = computed(() => {
  return backendStore.status.running
    ? t('pages.chat.status.online')
    : t('pages.chat.status.offline')
})

onMounted(async () => {
  await backendStore.refreshStatus().catch(() => undefined)
  await nextTick()
  scrollToBottom()
})

watch(
  () => chatStore.messages.length,
  async () => {
    await nextTick()
    scrollToBottom()
  },
)

watch(
  () => {
    const last = chatStore.messages[chatStore.messages.length - 1]
    return last?.isStreaming ? last.content : null
  },
  async () => {
    await nextTick()
    scrollToBottom()
  },
)

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function handleSend() {
  await chatStore.sendMessage(chatStore.input)
}

function handlePressEnter(event: KeyboardEvent) {
  if (event.shiftKey) {
    return
  }

  event.preventDefault()
  void handleSend()
}

function handleClose() {
  closeChat()
}

function handleMinimize() {
  appWindow.minimize()
}

function handleClearMessages() {
  if (!chatStore.messages.length) {
    return
  }

  const confirmed = window.confirm(t('pages.chat.hints.clearConfirm'))
  if (!confirmed) {
    return
  }

  chatStore.clearMessages()
  chatStore.clearLastError()
}

async function copyMessage(content: string) {
  if (!content.trim()) {
    return
  }

  try {
    await writeText(content)
    message.success(t('pages.chat.hints.copySuccess'))
  } catch {
    message.error(t('pages.chat.hints.copyFailed'))
  }
}

function roleBadgeText(role: ChatMessage['role']) {
  return role === 'user' ? 'U' : 'M'
}
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-white dark:bg-[#343541]">
    <header
      class="h-12 flex shrink-0 items-center justify-between border-b border-gray-200/70 px-4 dark:border-gray-700/70"
      data-tauri-drag-region
    >
      <div
        class="flex items-center gap-3"
        data-tauri-drag-region
      >
        <span class="text-sm text-gray-900 font-semibold tracking-wide dark:text-gray-100">
          memPet Chat
        </span>
        <span class="flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-700/70 dark:text-gray-300">
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="backendStore.status.running ? 'bg-green-500' : 'bg-red-500'"
          />
          {{ statusLabel }}
        </span>
      </div>

      <div class="no-drag flex items-center gap-1.5">
        <span
          v-if="chatStore.memoryUsed"
          class="hidden text-[11px] text-gray-500 sm:inline dark:text-gray-400"
        >
          {{ chatStore.memoriesUsed }} {{ t('pages.chat.labels.memoriesUsed') }}
        </span>

        <Tooltip :title="t('pages.chat.hints.streamMode')">
          <div class="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700/70">
            <span class="text-[11px] text-gray-500 dark:text-gray-400">
              {{ t('pages.chat.labels.stream') }}
            </span>
            <Switch
              v-model:checked="chatStore.useStream"
              size="small"
            />
          </div>
        </Tooltip>

        <Tooltip :title="t('pages.chat.buttons.clearHistory')">
          <button
            class="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/70 dark:hover:text-gray-200"
            @click="handleClearMessages"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </Tooltip>

        <button
          class="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/70"
          @click="handleMinimize"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="M5 12h14" />
          </svg>
        </button>

        <button
          class="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-gray-400 dark:hover:bg-red-900/30"
          @click="handleClose"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>

    <div class="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref="messagesContainer"
        class="chat-scroll h-full overflow-y-auto"
      >
        <div
          v-if="chatStore.messages.length === 0"
          class="h-full flex flex-col items-center justify-center px-6 text-center"
        >
          <div class="h-12 w-12 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700/70">
            <svg
              class="h-6 w-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              viewBox="0 0 24 24"
            >
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {{ t('pages.chat.hints.emptyState') }}
          </p>
        </div>

        <div
          v-else
          class="flex flex-col"
        >
          <div
            v-for="message in chatStore.messages"
            :key="message.id"
            class="w-full"
            :class="message.role === 'user' ? 'bg-slate-50/80 dark:bg-[#2f3039]' : 'bg-white/95 dark:bg-[#343541]'"
          >
            <div class="mx-auto flex w-full max-w-3xl gap-3 px-4 py-5 md:px-6">
              <div class="mt-0.5 h-7 w-7 flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                   :class="message.role === 'user'
                     ? 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                     : 'bg-emerald-500 text-white'">
                {{ roleBadgeText(message.role) }}
              </div>

              <div class="min-w-0 flex-1">
                <div class="mb-1.5 flex items-start justify-end">
                  <Tooltip
                    v-if="message.role !== 'user' && message.content"
                    :title="t('pages.chat.buttons.copy')"
                  >
                    <button
                      class="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"
                      @click="copyMessage(message.content)"
                    >
                      <svg
                        class="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2" />
                        <rect
                          x="8"
                          y="8"
                          width="12"
                          height="12"
                          rx="2"
                          ry="2"
                        />
                      </svg>
                    </button>
                  </Tooltip>
                </div>

                <div
                  v-if="message.isError"
                  class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/25 dark:text-red-300"
                >
                  {{ message.content }}
                </div>

                <div v-else>
                  <VueMarkdown
                    class="chat-markdown text-[15px] text-gray-800 leading-7 dark:text-gray-100"
                    :source="message.content || ''"
                  />

                  <span
                    v-if="message.isStreaming"
                    class="mt-1 inline-flex gap-1"
                  >
                    <span
                      class="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                      style="animation-delay: 0ms"
                    />
                    <span
                      class="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                      style="animation-delay: 150ms"
                    />
                    <span
                      class="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                      style="animation-delay: 300ms"
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-[#343541] dark:via-[#343541]/90" />
    </div>

    <div
      v-if="chatStore.lastError"
      class="mx-4 mb-2 flex items-center gap-2 border border-red-200 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
    >
      <svg
        class="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
      <span class="truncate">{{ chatStore.lastError }}</span>
      <button
        class="ml-auto shrink-0 p-0.5 text-red-400 hover:text-red-600"
        @click="chatStore.clearLastError"
      >
        <svg
          class="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="shrink-0 bg-white/95 px-4 pb-4 pt-3 dark:bg-[#343541]/95">
      <div class="mx-auto max-w-3xl">
        <div class="no-drag rounded-2xl border border-gray-200/90 bg-white px-3 py-2 shadow-[0_6px_24px_rgba(15,23,42,0.08)] dark:border-gray-600/80 dark:bg-[#40414F] dark:shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          <Input.TextArea
            v-model:value="chatStore.input"
            :auto-size="{ minRows: 1, maxRows: 6 }"
            class="!border-0 !bg-transparent !px-1 !text-[15px] !text-gray-800 !leading-7 !shadow-none dark:!text-gray-100 focus:!ring-0"
            :placeholder="t('pages.chat.hints.inputPlaceholder')"
            @press-enter="handlePressEnter"
          />

          <div class="mt-2 flex items-center justify-between gap-3 px-1 pb-0.5">
            <span class="text-[11px] text-gray-400 dark:text-gray-500">
              {{ chatStore.sending ? t('pages.chat.buttons.sending') : t('pages.chat.hints.composerHint') }}
            </span>

            <Button
              class="!h-8 !w-8 !flex !items-center !justify-center !rounded-lg !border-0 !text-white disabled:!opacity-50"
              :class="chatStore.canSend
                ? '!bg-emerald-500 hover:!bg-emerald-600'
                : '!bg-gray-300 dark:!bg-gray-600'"
              :disabled="!chatStore.canSend"
              :loading="chatStore.sending"
              type="text"
              @click="handleSend"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </Button>
          </div>
        </div>

        <div class="mt-2 flex items-center justify-between px-1 text-[11px] text-gray-400 dark:text-gray-500">
          <span>{{ chatStore.messages.length }} {{ t('pages.chat.labels.messageCount') }}</span>
          <span>
            {{ t('pages.chat.hints.enterHint') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.no-drag {
  -webkit-app-region: no-drag;
}

.chat-scroll {
  scroll-behavior: smooth;
}

:deep(.chat-markdown) {
  word-break: break-word;
}

:deep(.chat-markdown p) {
  margin: 0 0 0.75rem;
}

:deep(.chat-markdown p:last-child) {
  margin-bottom: 0;
}

:deep(.chat-markdown ul),
:deep(.chat-markdown ol) {
  margin: 0.4rem 0 0.75rem 1.2rem;
  padding: 0;
}

:deep(.chat-markdown li + li) {
  margin-top: 0.25rem;
}

:deep(.chat-markdown a) {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 2px;
}

:global(html.dark) :deep(.chat-markdown a) {
  color: #93c5fd;
}

:deep(.chat-markdown blockquote) {
  margin: 0.8rem 0;
  border-left: 3px solid #d1d5db;
  padding: 0.25rem 0 0.25rem 0.75rem;
  color: #4b5563;
}

:global(html.dark) :deep(.chat-markdown blockquote) {
  border-left-color: #4b5563;
  color: #d1d5db;
}

:deep(.chat-markdown pre) {
  margin: 0.8rem 0;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #f3f4f6;
  padding: 0.75rem 0.9rem;
}

:global(html.dark) :deep(.chat-markdown pre) {
  border-color: #4b5563;
  background: #2f3039;
}

:deep(.chat-markdown code) {
  border-radius: 0.35rem;
  background: #eef2f7;
  padding: 0.1rem 0.35rem;
  font-size: 0.85em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

:global(html.dark) :deep(.chat-markdown code) {
  background: #2f3039;
}

:deep(.chat-markdown pre code) {
  background: transparent;
  padding: 0;
}
</style>
