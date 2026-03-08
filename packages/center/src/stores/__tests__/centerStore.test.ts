import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCenterStore } from '../centerStore'

describe('CenterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初始状态', () => {
    it('应该初始化麦克风和摄像头为 unknown', () => {
      const store = useCenterStore()
      expect(store.microphone).toBe('unknown')
      expect(store.camera).toBe('unknown')
    })

    it('应该初始化连接状态为 disconnected', () => {
      const store = useCenterStore()
      expect(store.pluginConnection).toBe('disconnected')
      expect(store.browserConnection).toBe('disconnected')
    })
  })

  describe('设备状态', () => {
    it('应该更新麦克风状态', () => {
      const store = useCenterStore()
      store.setMicrophoneState('on')
      expect(store.microphone).toBe('on')
      expect(store.isMicrophoneOn).toBe(true)

      store.setMicrophoneState('off')
      expect(store.microphone).toBe('off')
      expect(store.isMicrophoneOn).toBe(false)
    })

    it('应该更新摄像头状态', () => {
      const store = useCenterStore()
      store.setCameraState('on')
      expect(store.camera).toBe('on')
      expect(store.isCameraOn).toBe(true)

      store.setCameraState('off')
      expect(store.camera).toBe('off')
      expect(store.isCameraOn).toBe(false)
    })

    it('应该正确计算 isMicrophoneOn', () => {
      const store = useCenterStore()
      
      store.setMicrophoneState('on')
      expect(store.isMicrophoneOn).toBe(true)
      
      store.setMicrophoneState('off')
      expect(store.isMicrophoneOn).toBe(false)
      
      store.setMicrophoneState('unknown')
      expect(store.isMicrophoneOn).toBe(false)
    })

    it('应该正确计算 isCameraOn', () => {
      const store = useCenterStore()
      
      store.setCameraState('on')
      expect(store.isCameraOn).toBe(true)
      
      store.setCameraState('off')
      expect(store.isCameraOn).toBe(false)
      
      store.setCameraState('unknown')
      expect(store.isCameraOn).toBe(false)
    })
  })

  describe('连接状态', () => {
    it('应该更新 Plugin 连接状态', () => {
      const store = useCenterStore()
      
      store.setPluginConnection('connected')
      expect(store.pluginConnection).toBe('connected')
      
      store.setPluginConnection('disconnected')
      expect(store.pluginConnection).toBe('disconnected')
      
      store.setPluginConnection('initializing')
      expect(store.pluginConnection).toBe('initializing')
    })

    it('应该更新 Browser 连接状态', () => {
      const store = useCenterStore()
      
      store.setBrowserConnection('connected')
      expect(store.browserConnection).toBe('connected')
      
      store.setBrowserConnection('disconnected')
      expect(store.browserConnection).toBe('disconnected')
      
      store.setBrowserConnection('initializing')
      expect(store.browserConnection).toBe('initializing')
    })
  })

  describe('状态组合', () => {
    it('应该独立管理所有状态', () => {
      const store = useCenterStore()
      
      // 设置所有状态
      store.setMicrophoneState('on')
      store.setCameraState('off')
      store.setPluginConnection('connected')
      store.setBrowserConnection('disconnected')
      
      // 验证所有状态
      expect(store.microphone).toBe('on')
      expect(store.camera).toBe('off')
      expect(store.pluginConnection).toBe('connected')
      expect(store.browserConnection).toBe('disconnected')
      
      // 验证计算属性
      expect(store.isMicrophoneOn).toBe(true)
      expect(store.isCameraOn).toBe(false)
    })

    it('应该支持多个 store 实例的独立状态', () => {
      const store1 = useCenterStore()
      const store2 = useCenterStore()
      
      store1.setMicrophoneState('on')
      expect(store1.microphone).toBe('on')
      expect(store2.microphone).toBe('on') // 同一个 Pinia 实例
    })
  })

  describe('边界情况', () => {
    it('应该处理状态更新后的计算属性', () => {
      const store = useCenterStore()
      
      // 初始状态
      expect(store.isMicrophoneOn).toBe(false)
      
      // 更新状态
      store.setMicrophoneState('on')
      expect(store.isMicrophoneOn).toBe(true)
      
      // 重置状态
      store.setMicrophoneState('unknown')
      expect(store.isMicrophoneOn).toBe(false)
    })
  })
})
