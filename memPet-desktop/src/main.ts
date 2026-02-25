import { createPlugin } from '@tauri-store/pinia'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { i18n } from './locales'
import router from './router'
import { useBackendStore } from './stores/backend'

import 'virtual:uno.css'
import 'ant-design-vue/dist/reset.css'
import './assets/css/global.scss'

const pinia = createPinia()
pinia.use(createPlugin({ saveOnChange: true }))

createApp(App).use(router).use(pinia).use(i18n).mount('#app')

async function bootstrapBackend(): Promise<void> {
  if (import.meta.env.VITE_MEMPET_AUTO_START_BACKEND === 'false') {
    return
  }

  try {
    const backendStore = useBackendStore(pinia)
    await backendStore.ensureReady()
    backendStore.startWatchdog()
  } catch (error) {
    console.error('[memPet-desktop] 自动拉起后端失败:', error)
  }
}

void bootstrapBackend()
