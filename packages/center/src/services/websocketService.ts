import { useCenterStore } from '@/stores/centerStore'

export class WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(url: string = 'ws://127.0.0.1:8080') {
    this.url = url
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url)
      
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
    }
  }

  private handleOpen() {
    console.log('WebSocket connected')
    this.reconnectAttempts = 0
    const store = useCenterStore()
    store.setBrowserConnection('connected')
    // Send initial handshake with proper structure
    this.send({
      id: `init-${Date.now()}`,
      type: 'init',
      timestamp: Date.now(),
      payload: { client: 'center' }
    })
  }

  private handleMessage(event: MessageEvent) {
    const store = useCenterStore()
    
    try {
      const message = JSON.parse(event.data)
      console.log('Received message:', message)

      // Handle both 'type' (from frontend) and 'msg_type' (from backend)
      const messageType = message.type || message.msg_type

      switch (messageType) {
        case 'state-update':
          if (message.payload) {
            const { microphone, camera } = message.payload
            if (microphone !== undefined) {
              store.setMicrophoneState(microphone === 'on' ? 'on' : 'off')
            }
            if (camera !== undefined) {
              store.setCameraState(camera === 'on' ? 'on' : 'off')
            }
          }
          break

        case 'state-response':
          if (message.payload) {
            const { microphone, camera } = message.payload
            if (microphone !== undefined) {
              store.setMicrophoneState(microphone === 'on' ? 'on' : 'off')
            }
            if (camera !== undefined) {
              store.setCameraState(camera === 'on' ? 'on' : 'off')
            }
          }
          break

        case 'plugin-connected':
          store.setPluginConnection('connected')
          break

        case 'plugin-disconnected':
          store.setPluginConnection('disconnected')
          break

        case 'browser-connected':
          store.setBrowserConnection('connected')
          break

        case 'browser-disconnected':
          store.setBrowserConnection('disconnected')
          break
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', event.data, error)
    }
  }

  private handleError(error: Event) {
    console.error('WebSocket error:', error)
  }

  private handleClose() {
    console.log('WebSocket closed, attempting to reconnect...')
    const store = useCenterStore()
    store.setBrowserConnection('disconnected')
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts)
    } else {
      // Continue retrying with exponential backoff (max 30s interval)
      const backoffMs = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts - this.maxReconnectAttempts))
      console.warn(`Max reconnection attempts reached. Retrying in ${backoffMs}ms`)
      this.reconnectAttempts++
      setTimeout(() => this.connect(), backoffMs)
    }
  }

  send(message: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, message not sent:', message)
    }
  }

  toggleMicrophone() {
    this.send({
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'action',
      timestamp: Date.now(),
      payload: { action: 'toggle-microphone' }
    })
  }

  toggleCamera() {
    this.send({
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'action',
      timestamp: Date.now(),
      payload: { action: 'toggle-camera' }
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export const wsService = new WebSocketService()
