<script setup lang="ts">
import { Button, Card, Empty, Pagination, Select, Spin, Statistic, Tag } from 'ant-design-vue'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { useMemoryLogStore } from '@/stores/memoryLog'

const { t } = useI18n()
const memoryLogStore = useMemoryLogStore()

onMounted(() => {
  memoryLogStore.fetchStats()
  memoryLogStore.fetchMemories()
})

const typeOptions = computed(() => {
  const options = [{ label: t('pages.preference.memoryLog.options.allTypes'), value: '' }]
  if (memoryLogStore.stats.conversations > 0) {
    options.push({ label: 'conversation', value: 'conversation' })
  }
  if (memoryLogStore.stats.observations > 0) {
    options.push({ label: 'system_observation', value: 'system_observation' })
  }
  return options
})

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString('zh-CN')
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    conversation: 'blue',
    system_observation: 'green',
    proactive: 'purple',
  }
  return colors[type] || 'default'
}
</script>

<template>
  <div class="space-y-4">
    <!-- 统计信息 -->
    <section>
      <h3 class="mb-3 text-sm dark:text-color-2 text-color-1 font-semibold">
        <span class="i-solar:chart-2-bold mr-1.5 inline-block size-4 align-text-bottom text-primary" />
        {{ t('pages.preference.memoryLog.labels.statistics') }}
      </h3>

      <div class="grid grid-cols-2 gap-3">
        <Card size="small">
          <Statistic
            :title="t('pages.preference.memoryLog.labels.totalMemories')"
            :value="memoryLogStore.stats.total_memories"
            :loading="memoryLogStore.statsLoading"
          />
        </Card>
        <Card size="small">
          <Statistic
            :title="t('pages.preference.memoryLog.labels.conversations')"
            :value="memoryLogStore.stats.conversations"
            :loading="memoryLogStore.statsLoading"
          />
        </Card>
        <Card size="small">
          <Statistic
            :title="t('pages.preference.memoryLog.labels.observations')"
            :value="memoryLogStore.stats.observations"
            :loading="memoryLogStore.statsLoading"
          />
        </Card>
        <Card size="small">
          <Statistic
            :title="t('pages.preference.memoryLog.labels.todayCount')"
            :value="memoryLogStore.stats.today_count"
            :loading="memoryLogStore.statsLoading"
          />
        </Card>
      </div>
    </section>

    <!-- 筛选和列表 -->
    <section>
      <h3 class="mb-3 text-sm dark:text-color-2 text-color-1 font-semibold">
        <span class="i-solar:list-bold mr-1.5 inline-block size-4 align-text-bottom text-primary" />
        {{ t('pages.preference.memoryLog.labels.memoryList') }}
      </h3>

      <div class="bg-color-9/50 border-color-4/50 dark:bg-color-2/50 dark:border-color-6/50 border rounded-lg p-4 space-y-3">
        <!-- 筛选栏 -->
        <div class="flex items-center gap-3">
          <span class="text-xs text-color-2">{{ t('pages.preference.memoryLog.labels.filterByType') }}</span>
          <Select
            :value="memoryLogStore.currentType"
            :options="typeOptions"
            size="small"
            class="w-40"
            @change="memoryLogStore.setType"
          />
          <Button
            size="small"
            :loading="memoryLogStore.loading"
            @click="memoryLogStore.fetchMemories"
          >
            {{ t('pages.preference.memoryLog.buttons.refresh') }}
          </Button>
        </div>

        <!-- 记忆列表 -->
        <Spin :spinning="memoryLogStore.loading">
          <div
            v-if="memoryLogStore.items.length > 0"
            class="space-y-2 max-h-96 overflow-y-auto"
          >
            <Card
              v-for="item in memoryLogStore.items"
              :key="item.id"
              size="small"
              class="hover:border-primary/50 transition-colors"
            >
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Tag :color="getTypeColor(item.type)">
                    {{ item.type }}
                  </Tag>
                  <span class="text-xs text-color-2">{{ formatTimestamp(item.created_at) }}</span>
                </div>
                <p class="text-xs text-color-1 line-clamp-2">
                  {{ item.content }}
                </p>
                <p
                  v-if="item.summary"
                  class="text-xs text-color-2 line-clamp-1"
                >
                  {{ item.summary }}
                </p>
              </div>
            </Card>
          </div>
          <Empty
            v-else
            :description="t('pages.preference.memoryLog.hints.noMemories')"
            class="py-8"
          />
        </Spin>

        <!-- 分页 -->
        <div
          v-if="memoryLogStore.total > 0"
          class="flex justify-center pt-2"
        >
          <Pagination
            v-model:current="memoryLogStore.currentPage"
            :total="memoryLogStore.total"
            :page-size="memoryLogStore.pageSize"
            size="small"
            show-size-changer
            @change="memoryLogStore.setPage"
          />
        </div>
      </div>
    </section>
  </div>
</template>
