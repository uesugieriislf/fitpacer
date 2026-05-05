<script setup lang="ts">
import { ref, computed } from 'vue'
import { navItems, type NavKey } from './shared/icons'
import PlanView from './plan/PlanView.vue'
import RecordView from './record/RecordView.vue'
import DashboardView from './dashboard/DashboardView.vue'
import SettingsView from './settings/SettingsView.vue'

const activeTab = ref<NavKey>('plan')
const transitioning = ref(false)
const slideDir = ref<'left' | 'right'>('right')
const tabOrder = computed(() => navItems.map(i => i.key))

const viewMap: Record<NavKey, any> = {
  plan: PlanView,
  record: RecordView,
  dashboard: DashboardView,
  settings: SettingsView
}

function switchTab(key: NavKey) {
  if (key === activeTab.value || transitioning.value) return
  slideDir.value = tabOrder.value.indexOf(key) > tabOrder.value.indexOf(activeTab.value) ? 'right' : 'left'
  transitioning.value = true
  activeTab.value = key
  setTimeout(() => { transitioning.value = false }, 380)
}
</script>

<template>
  <div class="app-shell">
    <main class="main-content">
      <div :key="activeTab" :class="['tab-panel', slideDir === 'right' ? 'slide-in-right' : 'slide-in-left']">
        <component :is="viewMap[activeTab]" />
      </div>
    </main>

    <nav class="bottom-nav">
      <button
        v-for="item in navItems" :key="item.key"
        :class="['nav-item', { active: activeTab === item.key }]"
        @click="switchTab(item.key)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app-shell { height: 100vh; height: 100dvh; display: flex; flex-direction: column; background: var(--color-bg); }

.main-content {
  flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative;
}

.tab-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.slide-in-right { animation: slideInRight 0.28s var(--ease-out); }
.slide-in-left { animation: slideInLeft 0.28s var(--ease-out); }

/* 底部导航 — Keep 风格 */
.bottom-nav {
  display: flex;
  background: var(--color-surface);
  border-top: 0.5px solid var(--color-border);
  padding: 6px 8px calc(6px + var(--safe-bottom));
  gap: 0;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  gap: 3px;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.nav-item:active { transform: scale(0.92); }

.nav-item.active {
  color: var(--color-primary);
}

.nav-icon { font-size: 24px; line-height: 1; transition: transform var(--duration-fast) var(--ease-bounce); }
.nav-item.active .nav-icon { transform: scale(1.1); }

.nav-label { font-size: 11px; font-weight: 590; letter-spacing: -0.1px; }
</style>