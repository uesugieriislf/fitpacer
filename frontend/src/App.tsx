import { ref, computed, defineComponent, h } from 'vue'
import { navItems, type NavKey } from './shared/icons'
import PlanView from './plan/PlanView'
import RecordView from './record/RecordView'
import DashboardView from './dashboard/DashboardView'
import SettingsView from './settings/SettingsView'
import './App.css'

export default defineComponent({
  setup() {
    const activeTab = ref<NavKey>('plan')
    const transitioning = ref(false)
    const slideDir = ref<'left' | 'right'>('right')
    const tabOrder = computed(() => navItems.map(i => i.key))

    const viewMap: Record<NavKey, any> = {
      plan: PlanView,
      record: RecordView,
      dashboard: DashboardView,
      settings: SettingsView,
    }

    function switchTab(key: NavKey) {
      if (key === activeTab.value || transitioning.value) return
      slideDir.value = tabOrder.value.indexOf(key) > tabOrder.value.indexOf(activeTab.value) ? 'right' : 'left'
      transitioning.value = true
      activeTab.value = key
      setTimeout(() => { transitioning.value = false }, 380)
    }

    return () => (
      <div class="app-shell">
        <main class="main-content">
          <div key={activeTab.value}
            class={['tab-panel', slideDir.value === 'right' ? 'slide-in-right' : 'slide-in-left'].join(' ')}>
            {viewMap[activeTab.value] && h(viewMap[activeTab.value])}
          </div>
        </main>

        <nav class="bottom-nav">
          {navItems.map(item => (
            <button key={item.key}
              class={['nav-item', activeTab.value === item.key && 'active'].filter(Boolean).join(' ')}
              onClick={() => switchTab(item.key)}
            >
              <span class="nav-icon">{item.icon}</span>
              <span class="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    )
  },
})
