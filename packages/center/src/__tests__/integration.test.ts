import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCenterStore } from '@/stores/centerStore'

describe('集成测试：消息流和状态同步', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('完整的连接流程', () => {
    it('应该正确处理 Plugin 连接流程', () => {
      const store = useCenterStore()
      
      // 初始状态
      expect(store.pluginConnection).toBe('disconnected')
      expect(store.isMicrophoneOn).toBe(false)
      expect(store.isCameraOn).toBe(false)
      
      // 模拟 Plugin 注册
      store.setPluginConnection('connected')
      expect(store.pluginConnection).toBe('connected')
      
      // 模拟接收状态更新
      store.setMicrophoneState('on')
      store.setCameraState('on')
      expect(store.isMicrophoneOn).toBe(true)
      expect(store.isCameraOn).toBe(true)
    })

    it('应该正确处理 Extension 连接流程', () => {
      const store = useCenterStore()
      
      // 初始状态
      expect(store.browserConnection).toBe('disconnected')
      
      // 模拟 Extension 注册
      store.setBrowserConnection('connected')
      expect(store.browserConnection).toBe('connected')
      
      // 模拟发送状态更新
      store.setMicrophoneState('off')
      store.setCameraState('on')
      expect(store.isMicrophoneOn).toBe(false)
      expect(store.isCameraOn).toBe(true)
    })
  })

  describe('多个客户端同时连接', () => {
    it('应该独立管理 Plugin 和 Extension 的连接状态', () => {
      const store = useCenterStore()
      
      // Plugin 连接
      store.setPluginConnection('connected')
      expect(store.pluginConnection).toBe('connected')
      expect(store.browserConnection).toBe('disconnected')
      
      // Extension 连接
      store.setBrowserConnection('connected')
      expect(store.pluginConnection).toBe('connected')
      expect(store.browserConnection).toBe('connected')
      
      // Plugin 断开
      store.setPluginConnection('disconnected')
      expect(store.pluginConnection).toBe('disconnected')
      expect(store.browserConnection).toBe('connected')
    })
  })

  describe('设备状态与连接状态的关系', () => {
    it('应该独立管理连接状态和设备状态', () => {
      const store = useCenterStore()
      
      // 设备可以改变状态，不论连接状态如何
      store.setMicrophoneState('on')
      expect(store.isMicrophoneOn).toBe(true)
      
      // 连接断开不应该影响已有的设备状态
      store.setPluginConnection('disconnected')
      expect(store.isMicrophoneOn).toBe(true)
      
      // 重新连接时状态仍然保留
      store.setPluginConnection('connected')
      expect(store.isMicrophoneOn).toBe(true)
    })
  })

  describe('状态同步场景', () => {
    it('应该正确处理从 OFF 到 ON 的状态变化', () => {
      const store = useCenterStore()
      
      // 初始状态
      store.setMicrophoneState('off')
      expect(store.isMicrophoneOn).toBe(false)
      
      // 通过 state-update 消息更新
      store.setMicrophoneState('on')
      expect(store.isMicrophoneOn).toBe(true)
      expect(store.microphone).toBe('on')
    })

    it('应该正确处理摄像头的独立状态变化', () => {
      const store = useCenterStore()
      
      // 设置摄像头为 ON，麦克风为 OFF
      store.setMicrophoneState('off')
      store.setCameraState('on')
      
      expect(store.isMicrophoneOn).toBe(false)
      expect(store.isCameraOn).toBe(true)
      
      // 更新麦克风状态
      store.setMicrophoneState('on')
      
      // 摄像头状态应该不受影响
      expect(store.isCameraOn).toBe(true)
      expect(store.isMicrophoneOn).toBe(true)
    })
  })

  describe('边界条件', () => {
    it('应该处理未知的设备状态', () => {
      const store = useCenterStore()
      
      store.setMicrophoneState('unknown')
      expect(store.microphone).toBe('unknown')
      expect(store.isMicrophoneOn).toBe(false)
    })

    it('应该处理多次连接/断开循环', () => {
      const store = useCenterStore()
      
      for (let i = 0; i < 5; i++) {
        store.setPluginConnection('connected')
        expect(store.pluginConnection).toBe('connected')
        
        store.setPluginConnection('disconnected')
        expect(store.pluginConnection).toBe('disconnected')
      }
    })

    it('应该处理状态快速变化', () => {
      const store = useCenterStore()
      
      // 快速切换状态
      store.setMicrophoneState('on')
      store.setMicrophoneState('off')
      store.setMicrophoneState('on')
      store.setMicrophoneState('off')
      
      expect(store.microphone).toBe('off')
      expect(store.isMicrophoneOn).toBe(false)
    })
  })

  describe('真实场景模拟', () => {
    it('模拟用户按下麦克风按钮的完整流程', () => {
      const store = useCenterStore()
      
      // 1. 初始状态：Plugin 连接，麦克风关闭
      store.setPluginConnection('connected')
      store.setMicrophoneState('off')
      expect(store.isMicrophoneOn).toBe(false)
      
      // 2. 用户点击按钮，发送 toggle 命令
      // （在真实应用中，这会通过 WebSocket 发送）
      
      // 3. Extension 处理命令并发送状态更新
      store.setMicrophoneState('on')
      expect(store.isMicrophoneOn).toBe(true)
      
      // 4. UI 应该显示麦克风已打开
      expect(store.isMicrophoneOn).toBe(true)
    })

    it('模拟用户在 Google Meet 中手动开启摄像头的流程', () => {
      const store = useCenterStore()
      
      // 1. 初始状态：Extension 连接，摄像头关闭
      store.setBrowserConnection('connected')
      store.setCameraState('off')
      expect(store.isCameraOn).toBe(false)
      
      // 2. 用户在 Google Meet 中手动打开摄像头
      // Extension 检测到状态变化
      
      // 3. Extension 发送 state-update
      store.setCameraState('on')
      expect(store.isCameraOn).toBe(true)
      
      // 4. Plugin 接收广播消息，更新自己的状态显示
      // 5. Center UI 也接收广播，更新状态
      expect(store.isCameraOn).toBe(true)
    })

    it('模拟网络断开重连的流程', () => {
      const store = useCenterStore()
      
      // 1. 正常工作
      store.setPluginConnection('connected')
      store.setMicrophoneState('on')
      expect(store.pluginConnection).toBe('connected')
      expect(store.isMicrophoneOn).toBe(true)
      
      // 2. 网络断开
      store.setPluginConnection('disconnected')
      expect(store.pluginConnection).toBe('disconnected')
      // 状态仍然保存
      expect(store.isMicrophoneOn).toBe(true)
      
      // 3. 重新连接
      store.setPluginConnection('connected')
      expect(store.pluginConnection).toBe('connected')
      expect(store.isMicrophoneOn).toBe(true)
    })
  })
})
