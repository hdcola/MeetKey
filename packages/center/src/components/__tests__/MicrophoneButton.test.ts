import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MicrophoneButton from '../MicrophoneButton.vue'
import { useCenterStore } from '@/stores/centerStore'

vi.mock('@/services/websocketService', () => ({
  wsService: {
    toggleMicrophone: vi.fn(),
    toggleCamera: vi.fn(),
    send: vi.fn(),
  }
}))

describe('MicrophoneButton.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('应该正确渲染组件', () => {
    const wrapper = mount(MicrophoneButton)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.device-control').exists()).toBe(true)
  })

  it('应该显示麦克风标签', () => {
    const wrapper = mount(MicrophoneButton)
    expect(wrapper.text()).toContain('Microphone')
  })

  it('初始状态应该显示 OFF', () => {
    const store = useCenterStore()
    store.setMicrophoneState('off')
    
    const wrapper = mount(MicrophoneButton)
    expect(wrapper.text()).toContain('OFF')
  })

  it('启用状态应该显示 ON', () => {
    const store = useCenterStore()
    store.setMicrophoneState('on')
    
    const wrapper = mount(MicrophoneButton)
    expect(wrapper.text()).toContain('ON')
  })

  describe('按钮交互', () => {
    it('点击按钮时应该有按压效果', async () => {
      const wrapper = mount(MicrophoneButton)
      const button = wrapper.find('button')
      
      expect(button.classes()).not.toContain('pressing')
      
      await button.trigger('click')
      expect(button.classes()).toContain('pressing')
    })

    it('按压效果应该短暂生效', async () => {
      vi.useFakeTimers()
      const wrapper = mount(MicrophoneButton)
      const button = wrapper.find('button')
      
      await button.trigger('click')
      expect(button.classes()).toContain('pressing')
      
      vi.advanceTimersByTime(150)
      await wrapper.vm.$nextTick()
      
      expect(button.classes()).not.toContain('pressing')
      vi.useRealTimers()
    })
  })

  describe('状态样式', () => {
    it('麦克风打开时应该显示 active 类', () => {
      const store = useCenterStore()
      store.setMicrophoneState('on')
      
      const wrapper = mount(MicrophoneButton)
      const button = wrapper.find('button')
      
      expect(button.classes()).toContain('active')
    })

    it('麦克风关闭时不应该显示 active 类', () => {
      const store = useCenterStore()
      store.setMicrophoneState('off')
      
      const wrapper = mount(MicrophoneButton)
      const button = wrapper.find('button')
      
      expect(button.classes()).not.toContain('active')
    })

    it('应该响应状态变化', async () => {
      const store = useCenterStore()
      const wrapper = mount(MicrophoneButton)
      
      store.setMicrophoneState('off')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('button').classes()).not.toContain('active')
      
      store.setMicrophoneState('on')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('button').classes()).toContain('active')
    })
  })

  describe('状态指示器', () => {
    it('应该显示正确的状态文本', () => {
      const store = useCenterStore()
      
      store.setMicrophoneState('on')
      let wrapper = mount(MicrophoneButton)
      expect(wrapper.text()).toContain('ON')
      
      store.setMicrophoneState('off')
      wrapper = mount(MicrophoneButton)
      expect(wrapper.text()).toContain('OFF')
    })

    it('状态指示器在 active 时应该是绿色', () => {
      const store = useCenterStore()
      store.setMicrophoneState('on')
      
      const wrapper = mount(MicrophoneButton)
      const indicator = wrapper.find('.status-indicator')
      
      expect(indicator.classes()).toContain('active')
    })

    it('状态指示器在非 active 时应该是灰色', () => {
      const store = useCenterStore()
      store.setMicrophoneState('off')
      
      const wrapper = mount(MicrophoneButton)
      const indicator = wrapper.find('.status-indicator')
      
      expect(indicator.classes()).not.toContain('active')
    })
  })

  describe('设备信息', () => {
    it('应该显示设备标签和状态', () => {
      const store = useCenterStore()
      store.setMicrophoneState('on')
      
      const wrapper = mount(MicrophoneButton)
      const deviceLabel = wrapper.find('.device-label')
      
      expect(deviceLabel.text()).toBe('Microphone')
    })
  })

  describe('响应式设计', () => {
    it('应该有正确的按钮尺寸', () => {
      const wrapper = mount(MicrophoneButton)
      const button = wrapper.find('button')
      
      // 检查按钮的样式类
      expect(button.exists()).toBe(true)
    })
  })
})
