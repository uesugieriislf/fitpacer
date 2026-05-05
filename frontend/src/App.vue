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
  const idx = tabOrder.value.indexOf(key)
  const curIdx = tabOrder.value.indexOf(activeTab.value)
  slideDir.value = idx > curIdx ? 'right' : 'left'
  transitioning.value = true
  activeTab.value = key
  setTimeout(() => { transitioning.value = false }, 350)
}
</script>

<template>
  <div class="app-shell">
    <main class="main-content">
      <div
        :key="activeTab"
        :class="['tab-panel', slideDir === 'right' ? 'slide-in-right' : 'slide-in-left']"
      >
        <component :is="viewMap[activeTab]" />
      </div>
    </main>

    <nav class="bottom-nav">
      <button
        v-for="item in navItems"
        :key="item.key"
        :class="['nav-item', { 'nav-active': activeTab === item.key }]"
        @click="switchTab(item.key)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
        <span class="nav-indicator" v-if="activeTab === item.key"></span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 底部导航 */
.bottom-nav {
  display: flex;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: 6px 0;
  padding-bottom: calc(4px + var(--safe-bottom));
  position: relative;
  z-index: 10;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 0 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
  gap: 1px;
  position: relative;
}

.nav-item:active {
  transform: scale(0.92);
}

.nav-active {
  color: var(--color-primary);
}

.nav-icon {
  font-size: 22px;
  line-height: 1.2;
  transition: transform var(--duration-fast) var(--ease-out);
}

.nav-active .nav-icon {
  transform: scale(1.1);
}

.nav-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.nav-indicator {
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  border-radius: 0 0 3px 3px;
  background: var(--color-primary-gradient);
  animation: scaleInBounce 0.3s var(--ease-bounce);
  box-shadow: 0 0 6px rgba(46, 125, 81, 0.4);
}

.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.slide-in-right {
  animation: slideInRight 0.3s var(--ease-out);
}

.slide-in-left {
  animation: slideInLeft 0.3s var(--ease-out);
}

/* 底部导航项点击弹跳 */
.nav-item:active .nav-icon {
  animation: bounce 0.3s var(--ease-bounce);
}
</style>
