// plan/CardioModal.test.ts — CardioModal 组件测试
import { describe, it, expect, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import CardioModal from './CardioModal'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('CardioModal', () => {
  it('不渲染当 show=false', () => {
    mount(CardioModal, { props: { show: false, date: '2026-05-08' } })
    expect(document.body.querySelector('.modal-overlay')).toBeNull()
  })

  it('渲染当 show=true', () => {
    mount(CardioModal, { props: { show: true, date: '2026-05-08' } })
    const overlay = document.body.querySelector('.modal-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.textContent).toContain('2026-05-08')
  })

  it('取消按钮触发 close', async () => {
    const wrapper = mount(CardioModal, { props: { show: true, date: '2026-05-08' } })
    const cancelBtn = document.body.querySelector('.form-actions .btn-ghost') as HTMLElement
    expect(cancelBtn).not.toBeNull()
    cancelBtn.click()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('提交按钮触发 submit 并带正确载荷', async () => {
    const wrapper = mount(CardioModal, { props: { show: true, date: '2026-05-08' } })
    // 调整时长到 40
    const chips = document.body.querySelectorAll('.chip-sm')
    const chip40 = Array.from(chips).find(el => el.textContent === '40分钟') as HTMLElement
    chip40.click()
    // 点保存
    const submitBtn = document.body.querySelector('.btn-primary') as HTMLElement
    submitBtn.click()
    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    const payload = emitted![0][0] as any
    expect(payload.date).toBe('2026-05-08')
    expect(payload.record.durationMinutes).toBe(40)
    expect(payload.record.action).toBe('慢跑')
  })
})
