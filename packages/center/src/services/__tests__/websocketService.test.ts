import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { WebSocketService } from '../websocketService'
import { useCenterStore } from '@/stores/centerStore'

// Store last created WebSocket instance
let lastMockWs: MockWebSocket | null = null

// Mock WebSocket
class MockWebSocket {
  url: string
  readyState = WebSocket.CLOSED
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    lastMockWs = this
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // Helpers for tests
  simulateOpen() {
    this.readyState = WebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  simulateMessage(data: any) {
    const event = new MessageEvent('message', {
      data: JSON.stringify(data)
    })
    this.onmessage?.(event)
  }

  simulateError() {
    this.onerror?.(new Event('error'))
  }

  simulateClose() {
    this.readyState = WebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }
}

// Replace global WebSocket
const OriginalWebSocket = global.WebSocket
global.WebSocket = MockWebSocket as any

describe('WebSocketService', () => {
  let service: WebSocketService
  let mockWs: MockWebSocket

  beforeEach(() => {
    // 关键：每个测试前都创建新的 Pinia 实例
    setActivePinia(createPinia())
    lastMockWs = null
    
    service = new WebSocketService('ws://127.0.0.1:8080')
    // WebSocket is created when connect() is called, not in constructor
  })

  afterEach(() => {
    lastMockWs = null
    service.disconnect()
    vi.clearAllMocks()
  })

  describe('连接和初始化', () => {
    it('应该创建 WebSocket 连接', () => {
      service.connect()
      expect(service['ws']).toBeDefined()
    })

    it('连接后应该重置重连次数', () => {
      service['reconnectAttempts'] = 5
      service.connect()
      mockWs = lastMockWs!
      mockWs.simulateOpen()
      expect(service['reconnectAttempts']).toBe(0)
    })

    it('连接打开时应该注册为 center', () => {
      const sendSpy = vi.spyOn(service, 'send')
      service.connect()
      mockWs = lastMockWs!
      mockWs.simulateOpen()
      
      expect(sendSpy).toHaveBeenCalled()
      const callArg = sendSpy.mock.calls[0][0]
      expect(callArg.type).toBe('register')
      expect(callArg.payload.role).toBe('center')
    })
  })

  describe('消息处理', () => {
    beforeEach(() => {
      service.connect()
      mockWs = lastMockWs!
      mockWs.simulateOpen()
    })

    it('应该处理 init 消息', () => {
      const consoleLogSpy = vi.spyOn(console, 'log')
      mockWs.simulateMessage({
        type: 'init',
        payload: { status: 'initialized' }
      })
      
      // init 应该被静默处理
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Unknown message type'))
    })

    it('应该处理 plugin-connected 消息', () => {
      const store = useCenterStore()
      mockWs.simulateMessage({
        type: 'plugin-connected',
        payload: { status: 'registered' }
      })
      
      expect(store.pluginConnection).toBe('connected')
    })

    it('应该处理 extension-connected 消息', () => {
      const store = useCenterStore()
      mockWs.simulateMessage({
        type: 'extension-connected',
        payload: { status: 'registered' }
      })
      
      expect(store.browserConnection).toBe('connected')
    })

    it('应该处理 state-update 消息', () => {
      const store = useCenterStore()
      mockWs.simulateMessage({
        type: 'state-update',
        payload: {
          microphone: 'on',
          camera: 'off'
        }
      })
      
      expect(store.isMicrophoneOn).toBe(true)
      expect(store.isCameraOn).toBe(false)
    })

    it('应该处理 state-response 消息', () => {
      const store = useCenterStore()
      mockWs.simulateMessage({
        type: 'state-response',
        payload: {
          microphone: 'off',
          camera: 'on'
        }
      })
      
      expect(store.isMicrophoneOn).toBe(false)
      expect(store.isCameraOn).toBe(true)
    })

    it('应该处理断开连接消息', () => {
      const store = useCenterStore()
      store.setBrowserConnection('connected')
      
      mockWs.simulateMessage({
        type: 'browser-disconnected',
        payload: {}
      })
      
      expect(store.browserConnection).toBe('disconnected')
    })

    it('应该处理未知消息类型', () => {
      const consoleLogSpy = vi.spyOn(console, 'log')
      mockWs.simulateMessage({
        type: 'unknown-type',
        payload: {}
      })
      
      // 应该有警告日志，检查任一调用的第一个参数
      const calls = consoleLogSpy.mock.calls
      const hasUnknownMessage = calls.some(call => 
        call[0] && call[0].includes('Unknown message type')
      )
      expect(hasUnknownMessage).toBe(true)
    })
  })

  describe('消息发送', () => {
    beforeEach(() => {
      service.connect()
      mockWs = lastMockWs!
      mockWs.simulateOpen()
    })

    it('应该发送 toggleMicrophone 命令', () => {
      const sendSpy = vi.spyOn(service, 'send')
      service.toggleMicrophone()
      
      expect(sendSpy).toHaveBeenCalled()
      const callArg = sendSpy.mock.calls[0][0]
      expect(callArg.type).toBe('action')
      expect(callArg.payload.action).toBe('toggle-microphone')
    })

    it('应该发送 toggleCamera 命令', () => {
      const sendSpy = vi.spyOn(service, 'send')
      service.toggleCamera()
      
      expect(sendSpy).toHaveBeenCalled()
      const callArg = sendSpy.mock.calls[0][0]
      expect(callArg.type).toBe('action')
      expect(callArg.payload.action).toBe('toggle-camera')
    })

    it('未连接时不应该发送消息', () => {
      service.disconnect()
      const consoleWarnSpy = vi.spyOn(console, 'warn')
      
      service.send({ type: 'test' })
      
      // Check that warn was called with message containing 'WebSocket not connected'
      expect(consoleWarnSpy).toHaveBeenCalled()
      const warnCall = consoleWarnSpy.mock.calls[0]
      expect(warnCall[0]).toContain('WebSocket not connected')
    })
  })

  describe('断开连接', () => {
    it('应该断开 WebSocket 连接', () => {
      service.connect()
      mockWs = lastMockWs!
      mockWs.simulateOpen()
      
      service.disconnect()
      
      expect(service['ws']).toBeNull()
    })
  })

  describe('自动重连', () => {
    it('连接关闭时应该尝试重连', () => {
      vi.useFakeTimers()
      service.connect()
      mockWs = lastMockWs!
      mockWs.simulateOpen()
      
      mockWs.simulateClose()
      
      expect(service['reconnectAttempts']).toBe(1)
      
      vi.useRealTimers()
    })

    it('重连次数达到上限后应该继续重试', () => {
      service['reconnectAttempts'] = 5
      service['maxReconnectAttempts'] = 5
      
      const store = useCenterStore()
      store.setBrowserConnection('connected')
      
      service.connect()
      mockWs = lastMockWs!
      mockWs.simulateClose()
      
      expect(store.browserConnection).toBe('disconnected')
    })
  })
})
