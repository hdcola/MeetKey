import { useCenterStore } from '@/stores/centerStore';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isExplicitDisconnect = false;

  constructor(url: string = 'ws://127.0.0.1:8080') {
    this.url = url;
  }

  connect() {
    try {
      this.isExplicitDisconnect = false;
      this.ws = new WebSocket(this.url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }

  private handleOpen() {
    console.log('✅ WebSocket connected to Center server');
    this.reconnectAttempts = 0;
    // Register Center UI as a client
    this.send({
      id: `register-${Date.now()}`,
      type: 'register',
      timestamp: Date.now(),
      payload: { role: 'center' },
    });
    console.log('📝 Center UI registered with server');
  }

  private handleMessage(event: MessageEvent) {
    const store = useCenterStore();

    try {
      const message = JSON.parse(event.data);
      const messageType = message.type || message.msg_type;

      // Log with more details
      if (message.payload?.role) {
        console.log(`📨 Received: ${messageType} (role: ${message.payload.role})`, message);
      } else {
        console.log(`📨 Received: ${messageType}`, message);
      }

      console.log(`🔍 Switch checking: "${messageType}"`);

      switch (messageType) {
        case 'init':
          // Ignore init messages (handshake)
          break;

        case 'state-update':
          if (message.payload) {
            const { microphone, camera } = message.payload;
            if (microphone !== undefined) {
              store.setMicrophoneState(microphone === 'on' ? 'on' : 'off');
            }
            if (camera !== undefined) {
              store.setCameraState(camera === 'on' ? 'on' : 'off');
            }
          }
          break;

        case 'state-response':
          if (message.payload) {
            const { microphone, camera } = message.payload;
            if (microphone !== undefined) {
              store.setMicrophoneState(microphone === 'on' ? 'on' : 'off');
            }
            if (camera !== undefined) {
              store.setCameraState(camera === 'on' ? 'on' : 'off');
            }
          }
          break;

        case 'extension-connected':
          console.log('✅ Extension confirmed as registered');
          store.setBrowserConnection('connected');
          break;

        case 'plugin-connected':
          console.log('✅ Plugin confirmed as registered');
          store.setPluginConnection('connected');
          break;

        case 'browser-connected':
          store.setBrowserConnection('connected');
          break;

        case 'browser-disconnected':
          store.setBrowserConnection('disconnected');
          break;

        case 'plugin-disconnected':
          store.setPluginConnection('disconnected');
          break;

        default:
          console.log(`⚠️ Unknown message type: ${messageType}`, message);
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', event.data, error);
    }
  }

  private handleError(error: Event) {
    console.error('WebSocket error:', error);
  }

  private handleClose() {
    if (this.isExplicitDisconnect) {
      console.log('WebSocket connection closed explicitly');
      return;
    }

    console.log('WebSocket closed, attempting to reconnect...');
    const store = useCenterStore();
    store.setBrowserConnection('disconnected');
    store.setPluginConnection('disconnected');

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    } else {
      // Continue retrying with exponential backoff (max 30s interval)
      const backoffMs = Math.min(
        30000,
        1000 * Math.pow(2, this.reconnectAttempts - this.maxReconnectAttempts)
      );
      console.warn(`Max reconnection attempts reached. Retrying in ${backoffMs}ms`);
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), backoffMs);
    }
  }

  send(message: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  toggleMicrophone() {
    this.send({
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'action',
      timestamp: Date.now(),
      payload: { action: 'toggle-microphone' },
    });
  }

  toggleCamera() {
    this.send({
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'action',
      timestamp: Date.now(),
      payload: { action: 'toggle-camera' },
    });
  }

  disconnect() {
    if (this.ws) {
      this.isExplicitDisconnect = true;
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new WebSocketService();
