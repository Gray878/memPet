import type { RouteRecordRaw } from 'vue-router'

import { createRouter, createWebHashHistory } from 'vue-router'

import Main from '../pages/main/index.vue'
import Preference from '../pages/preference/index.vue'

const Chat = () => import('../pages/chat/index.vue')

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/',
    component: Main,
  },
  {
    path: '/chat',
    component: Chat,
  },
  {
    path: '/preference',
    component: Preference,
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
