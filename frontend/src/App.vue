<script setup lang="ts">
import { ref } from 'vue'
import { navItems, type NavKey } from './shared/icons'
import PlanView from './plan/PlanView.vue'
import RecordView from './record/RecordView.vue'
import DashboardView from './dashboard/DashboardView.vue'
import SettingsView from './settings/SettingsView.vue'

const activeTab = ref<NavKey>('plan')

const viewMap: Record<NavKey, any> = {
  plan: PlanView,
  record: RecordView,
  dashboard: DashboardView,
  settings: SettingsView
}
</script>

<template>
  <div class="app-shell">
    <!-- 主内容区 -->
    <main class="main-content">
      <component :is="viewMap[activeTab]" :key="activeTab" />
    </main>

    <!-- 底部导航 -->
    <nav class="bottom-nav">
      <button
        v-for="item in navItems"
        :key="item.key"
        :class="['nav-item', { 'nav-active': activeTab === item.key }]"
        @click="activeTab = item.key"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.bottom-nav {
  display: flex;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: 4px 0;
  padding-bottom: var(--safe-bottom);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
  gap: 2px;
}

.nav-active {
  color: var(--color-primary);
}

.nav-icon {
  font-size: 22px;
  line-height: 1;
}

.nav-label {
  font-size: 11px;
  font-weight: 600;
}
</style>
