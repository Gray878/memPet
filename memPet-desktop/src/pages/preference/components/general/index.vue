<script setup lang="ts">
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { Button, Collapse, CollapsePanel, Select, Switch, Tag } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'

import MacosPermissions from './components/macos-permissions/index.vue'
import ThemeMode from './components/theme-mode/index.vue'

import ProList from '@/components/pro-list/index.vue'
import ProListItem from '@/components/pro-list-item/index.vue'
import { useBackendStore } from '@/stores/backend'
import { useGeneralStore } from '@/stores/general'
import { useObservationQueueStore } from '@/stores/observationQueue'

const generalStore = useGeneralStore()
const backendStore = useBackendStore()
const observationQueueStore = useObservationQueueStore()
const showLogs = ref<string[]>([])

onMounted(async () => {
  await backendStore.refreshStatus().catch(() => undefined)
  await backendStore.refreshHealth().catch(() => undefined)
})

watch(() => generalStore.app.autostart, async (value) => {
  const enabled = await isEnabled()

  if (value && !enabled) {
    return enable()
  }

  if (!value && enabled) {
    disable()
  }
}, { immediate: true })

async function handleBackendRestart() {
  await backendStore.restart().catch(() => undefined)
}

async function handleRefreshLogs() {
  await backendStore.refreshLogs(120).catch(() => undefined)
  showLogs.value = ['logs']
}
</script>

<template>
  <MacosPermissions />

  <ProList :title="$t('pages.preference.general.labels.appSettings')">
    <ProListItem :title="$t('pages.preference.general.labels.launchOnStartup')">
      <Switch v-model:checked="generalStore.app.autostart" />
    </ProListItem>

    <ProListItem
      :description="$t('pages.preference.general.hints.showTaskbarIcon')"
      :title="$t('pages.preference.general.labels.showTaskbarIcon')"
    >
      <Switch v-model:checked="generalStore.app.taskbarVisible" />
    </ProListItem>
  </ProList>

  <ProList :title="$t('pages.preference.general.labels.appearanceSettings')">
    <ThemeMode />

    <ProListItem :title="$t('pages.preference.general.labels.language')">
      <Select v-model:value="generalStore.appearance.language">
        <Select.Option value="zh-CN">
          简体中文
        </Select.Option>
        <Select.Option value="en-US">
          English
        </Select.Option>
        <Select.Option value="vi-VN">
          Tiếng Việt
        </Select.Option>
        <Select.Option value="pt-BR">
          Português
        </Select.Option>
      </Select>
    </ProListItem>
  </ProList>

  <ProList :title="$t('pages.preference.general.labels.updateSettings')">
    <ProListItem :title="$t('pages.preference.general.labels.autoCheckUpdate')">
      <Switch v-model:checked="generalStore.update.autoCheck" />
    </ProListItem>
  </ProList>

  <!-- Backend Service Status -->
  <ProList :title="$t('pages.preference.general.labels.serviceStatus')">
    <ProListItem :title="$t('pages.preference.general.labels.backendStatus')">
      <div class="flex items-center gap-2">
        <Tag
          class="!m-0"
          :color="backendStore.status.running ? 'green' : 'red'"
        >
          {{ backendStore.status.running
            ? $t('pages.preference.general.status.running')
            : $t('pages.preference.general.status.stopped') }}
        </Tag>
        <Button
          v-if="!backendStore.status.running"
          :loading="backendStore.loading"
          size="small"
          type="primary"
          @click="handleBackendRestart"
        >
          {{ $t('pages.preference.general.buttons.restart') }}
        </Button>
      </div>
    </ProListItem>

    <ProListItem :title="$t('pages.preference.general.labels.observationQueue')">
      <span class="text-xs text-color-2">
        {{ $t('pages.preference.general.labels.queueSize') }}: {{ observationQueueStore.queueSize }}
      </span>
    </ProListItem>

    <div
      v-if="backendStore.lastError"
      class="mx-4 mb-3 border border-red-200 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:(border-red-800 bg-red-950/50 text-red-300)"
    >
      {{ backendStore.lastError }}
    </div>

    <Collapse
      v-model:active-key="showLogs"
      class="mx-2"
      ghost
    >
      <CollapsePanel
        key="logs"
        :header="$t('pages.preference.general.labels.serverLogs')"
      >
        <template #extra>
          <Button
            size="small"
            @click.stop="handleRefreshLogs"
          >
            {{ $t('pages.preference.general.buttons.refreshLogs') }}
          </Button>
        </template>
        <pre class="max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] text-color-2">{{ backendStore.logs.join('\n') || $t('pages.preference.general.hints.noLogs') }}</pre>
      </CollapsePanel>
    </Collapse>
  </ProList>
</template>
