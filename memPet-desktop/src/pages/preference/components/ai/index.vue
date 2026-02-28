<script setup lang="ts">
import {
  Button,
  Card,
  Divider,
  Input,
  InputNumber,
  InputPassword,
  Select,
  Slider,
  Switch,
} from 'ant-design-vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { memPetApi } from '@/services/memPetApi'
import { useAiStore } from '@/stores/ai'
import { useProactiveStore } from '@/stores/proactive'

const { t } = useI18n()
const aiStore = useAiStore()
const proactiveStore = useProactiveStore()

const testingConnection = ref(false)
const testResult = ref<'success' | 'error' | null>(null)
const testMessage = ref('')
const triggeringProactive = ref(false)
const proactiveTestResult = ref<'success' | 'error' | null>(null)
const proactiveTestMessage = ref('')

const providerOptions = [
  { label: 'OpenAI', value: 'openai' },
  { label: '通义千问 (DashScope)', value: 'dashscope' },
  { label: '硅基流动 (SiliconFlow)', value: 'siliconflow' },
]

const personalityOptions = [
  {
    value: 'friendly',
    label: t('pages.preference.ai.personalities.friendly'),
    description: t('pages.preference.ai.personalityDesc.friendly'),
    emoji: '😊',
  },
  {
    value: 'energetic',
    label: t('pages.preference.ai.personalities.energetic'),
    description: t('pages.preference.ai.personalityDesc.energetic'),
    emoji: '⚡',
  },
  {
    value: 'professional',
    label: t('pages.preference.ai.personalities.professional'),
    description: t('pages.preference.ai.personalityDesc.professional'),
    emoji: '💼',
  },
  {
    value: 'tsundere',
    label: t('pages.preference.ai.personalities.tsundere'),
    description: t('pages.preference.ai.personalityDesc.tsundere'),
    emoji: '😤',
  },
]

async function handleTestConnection() {
  testingConnection.value = true
  testResult.value = null
  testMessage.value = ''
  try {
    const response = await memPetApi.health()
    if (response.data) {
      testResult.value = 'success'
      testMessage.value = t('pages.preference.ai.hints.connectionSuccess')
    }
  } catch (error) {
    testResult.value = 'error'
    testMessage.value = error instanceof Error ? error.message : t('pages.preference.ai.hints.connectionFailed')
  } finally {
    testingConnection.value = false
  }
}

// 手动触发主动推理（用于测试）
async function handleManualTrigger() {
  triggeringProactive.value = true
  proactiveTestResult.value = null
  proactiveTestMessage.value = ''
  
  try {
    // 使用模拟的上下文数据进行测试
    const testContext = {
      working_duration: 7200, // 2小时
      active_app: 'VSCode',
      fatigue_level: 'Tired',
      is_late_night: false,
      idle_time: 0,
      is_work_hours: true,
      focus_level: 'NormalFocus',
    }
    
    proactiveStore.updateContext(testContext)
    
    // 等待接口调用完成（跳过冷却时间，方便调试）
    await proactiveStore.runQuick(aiStore.personality, aiStore.proactiveMemoryLimit, true)
    
    // 检查是否有错误
    if (proactiveStore.lastError) {
      proactiveTestResult.value = 'error'
      proactiveTestMessage.value = proactiveStore.lastError
      return
    }
    
    // 检查是否生成了消息
    if (proactiveStore.quickMessage) {
      proactiveTestResult.value = 'success'
      proactiveTestMessage.value = '触发成功，请查看宠物气泡'
    } else {
      proactiveTestResult.value = 'error'
      proactiveTestMessage.value = '未生成消息（可能处于冷却期或当前状态无需提醒）'
    }
  } catch (error) {
    proactiveTestResult.value = 'error'
    proactiveTestMessage.value = error instanceof Error ? error.message : '触发失败'
  } finally {
    triggeringProactive.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- LLM Configuration -->
    <section>
      <h3 class="mb-3 text-sm dark:text-color-2 text-color-1 font-semibold">
        <span class="i-solar:magic-stick-3-bold mr-1.5 inline-block size-4 align-text-bottom text-primary" />
        {{ t('pages.preference.ai.labels.llmConfig') }}
      </h3>

      <div class="bg-color-9/50 border-color-4/50 dark:bg-color-2/50 dark:border-color-6/50 border rounded-lg p-4 space-y-3">
        <div class="grid grid-cols-[110px_1fr] items-center gap-3">
          <span class="text-xs text-color-2">{{ t('pages.preference.ai.labels.provider') }}</span>
          <Select
            v-model:value="aiStore.provider"
            :options="providerOptions"
            size="small"
          />
        </div>

        <div class="grid grid-cols-[110px_1fr] items-center gap-3">
          <span class="text-xs text-color-2">API Key</span>
          <InputPassword
            v-model:value="aiStore.apiKey"
            :placeholder="t('pages.preference.ai.hints.apiKeyPlaceholder')"
            size="small"
          />
        </div>

        <div class="grid grid-cols-[110px_1fr] items-center gap-3">
          <span class="text-xs text-color-2">Base URL</span>
          <Input
            v-model:value="aiStore.baseUrl"
            placeholder="https://api.openai.com/v1"
            size="small"
          />
        </div>

        <div class="grid grid-cols-[110px_1fr] items-center gap-3">
          <span class="text-xs text-color-2">{{ t('pages.preference.ai.labels.model') }}</span>
          <Input
            v-model:value="aiStore.model"
            placeholder="gpt-4o-mini"
            size="small"
          />
        </div>

        <div class="grid grid-cols-[110px_1fr] items-center gap-3">
          <span class="text-xs text-color-2">Temperature</span>
          <Slider
            v-model:value="aiStore.temperature"
            :max="2"
            :min="0"
            :step="0.1"
          />
        </div>

        <div class="grid grid-cols-[110px_1fr] items-center gap-3">
          <span class="text-xs text-color-2">Max Tokens</span>
          <InputNumber
            v-model:value="aiStore.maxTokens"
            class="w-full"
            :max="8192"
            :min="64"
            size="small"
            :step="128"
          />
        </div>

        <div class="flex items-center justify-end gap-2">
          <span
            v-if="testResult"
            class="text-xs"
            :class="testResult === 'success' ? 'text-green-500' : 'text-red-500'"
          >
            {{ testMessage }}
          </span>
          <Button
            :loading="testingConnection"
            size="small"
            @click="handleTestConnection"
          >
            {{ t('pages.preference.ai.buttons.testConnection') }}
          </Button>
        </div>
      </div>
    </section>

    <Divider class="!my-3" />

    <!-- Personality -->
    <section>
      <h3 class="mb-3 text-sm dark:text-color-2 text-color-1 font-semibold">
        <span class="i-solar:face-scan-circle-bold mr-1.5 inline-block size-4 align-text-bottom text-primary" />
        {{ t('pages.preference.ai.labels.personality') }}
      </h3>

      <div class="grid grid-cols-2 gap-2">
        <Card
          v-for="option in personalityOptions"
          :key="option.value"
          class="cursor-pointer transition-all"
          :class="aiStore.personality === option.value
            ? '!border-primary !shadow-sm !shadow-primary/10'
            : 'hover:border-color-3'"
          size="small"
          @click="aiStore.personality = option.value as typeof aiStore.personality"
        >
          <div class="flex items-start gap-2">
            <span class="text-lg">{{ option.emoji }}</span>
            <div>
              <p class="text-xs dark:text-color-2 text-color-1 font-medium">
                {{ option.label }}
              </p>
              <p class="text-color-2/70 mt-0.5 text-[10px]">
                {{ option.description }}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>

    <Divider class="!my-3" />

    <!-- Proactive Reasoning -->
    <section>
      <h3 class="mb-3 text-sm dark:text-color-2 text-color-1 font-semibold">
        <span class="i-solar:brain-bold mr-1.5 inline-block size-4 align-text-bottom text-primary" />
        {{ t('pages.preference.ai.labels.proactiveConfig') }}
      </h3>

      <div class="border-color-4/50 bg-color-9/50 dark:bg-color-2/50 dark:border-color-6/50 border rounded-lg p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs text-color-2">{{ t('pages.preference.ai.labels.proactiveEnabled') }}</span>
          <Switch
            v-model:checked="aiStore.proactiveEnabled"
            size="small"
          />
        </div>

        <div class="grid grid-cols-[110px_1fr] items-center gap-3">
          <span class="text-xs text-color-2">{{ t('pages.preference.ai.labels.checkInterval') }}</span>
          <InputNumber
            v-model:value="aiStore.proactiveInterval"
            addon-after="s"
            class="w-full"
            :disabled="!aiStore.proactiveEnabled"
            :max="3600"
            :min="60"
            size="small"
            :step="30"
          />
        </div>

        <div class="grid grid-cols-[110px_1fr] items-center gap-3">
          <span class="text-xs text-color-2">{{ t('pages.preference.ai.labels.memoryLimit') }}</span>
          <InputNumber
            v-model:value="aiStore.proactiveMemoryLimit"
            class="w-full"
            :disabled="!aiStore.proactiveEnabled"
            :max="10"
            :min="1"
            size="small"
          />
        </div>

        <div class="grid grid-cols-[110px_1fr] items-center gap-3">
          <span class="text-xs text-color-2">{{ t('pages.preference.ai.labels.cooldownTime') }}</span>
          <InputNumber
            v-model:value="aiStore.proactiveCooldown"
            addon-after="s"
            class="w-full"
            :disabled="!aiStore.proactiveEnabled"
            :max="600"
            :min="10"
            size="small"
            :step="10"
          />
        </div>

        <div class="flex items-center justify-end gap-2">
          <span
            v-if="proactiveTestResult"
            class="text-xs"
            :class="proactiveTestResult === 'success' ? 'text-green-500' : 'text-red-500'"
          >
            {{ proactiveTestMessage }}
          </span>
          <Button
            :disabled="!aiStore.proactiveEnabled"
            :loading="triggeringProactive"
            size="small"
            @click="handleManualTrigger"
          >
            手动触发
          </Button>
        </div>
      </div>
    </section>

    <Divider class="!my-3" />

    <!-- Memory Enhancement -->
    <section>
      <h3 class="mb-3 text-sm dark:text-color-2 text-color-1 font-semibold">
        <span class="i-solar:database-bold mr-1.5 inline-block size-4 align-text-bottom text-primary" />
        {{ t('pages.preference.ai.labels.memoryConfig') }}
      </h3>

      <div class="border-color-4/50 bg-color-9/50 dark:bg-color-2/50 dark:border-color-6/50 border rounded-lg p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs text-color-2">{{ t('pages.preference.ai.labels.memoryEnabled') }}</span>
          <Switch
            v-model:checked="aiStore.memoryEnabled"
            size="small"
          />
        </div>

        <div class="grid grid-cols-[110px_1fr] items-center gap-3">
          <span class="text-xs text-color-2">{{ t('pages.preference.ai.labels.retrieveLimit') }}</span>
          <InputNumber
            v-model:value="aiStore.memoryRetrieveLimit"
            class="w-full"
            :disabled="!aiStore.memoryEnabled"
            :max="20"
            :min="1"
            size="small"
          />
        </div>
      </div>
    </section>
  </div>
</template>
