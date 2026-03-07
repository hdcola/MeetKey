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
    // Send initial handshake
    this.send({ type: 'init', client: 'center' })
  }

  private handleMessage(event: MessageEvent) {
    const store = useCenterStore()
    const message = JSON.parse(event.data)

    console.log('Received message:', message)

    switch (message.type) {
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
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, message not sent:', message)
    }
  }

  toggleMicrophone() {
    this.send({
      type: 'action',
      action: 'toggle-microphone',
    })
  }

  toggleCamera() {
    this.send({
      type: 'action',
      action: 'toggle-camera',
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
