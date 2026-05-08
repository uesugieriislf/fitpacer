// plan/CardioModal.test.ts — CardioModal 组件测试
import { describe, it, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import CardioModal from './CardioModal'

describe('CardioModal', () => {
  it('不渲染当 show=false', () => {
    const wrapper = mount(CardioModal, { props: { show: false, date: '2026-05-08' } })
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('渲染当 show=true', () => {
    const wrapper = mount(CardioModal, { props: { show: true, date: '2026-05-08' } })
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.text()).toContain('2026-05-08')
  })

  it('取消按钮触发 close', async () => {
    const wrapper = mount(CardioModal, { props: { show: true, date: '2026-05-08' } })
    await wrapper.find('.form-actions .btn-ghost').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('提交按钮触发 submit 并带正确载荷', async () => {
    const wrapper = mount(CardioModal, { props: { show: true, date: '2026-05-08' } })
    // 调整时长到 40
    await wrapper.findAll('.chip-sm').filter(w => w.text() === '40分钟')[0].trigger('click')
    // 点保存
    await wrapper.find('.btn-primary').trigger('click')
    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    const payload = emitted![0][0] as any
    expect(payload.date).toBe('2026-05-08')
    expect(payload.record.durationMinutes).toBe(40)
    expect(payload.record.action).toBe('慢跑')
  })
})
