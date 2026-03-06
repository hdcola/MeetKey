/**
 * WebSocket 消息类型定义
 */

export type MessageType =
  | 'ping'
  | 'pong'
  | 'action'
  | 'event'
  | 'error'
  | 'ack';

export interface WebSocketMessage {
  id: string;
  type: MessageType;
  timestamp: number;
  payload?: unknown;
}

export interface ActionMessage extends WebSocketMessage {
  type: 'action';
  payload: {
    actionId: string;
    params?: Record<string, unknown>;
  };
}

export interface EventMessage extends WebSocketMessage {
  type: 'event';
  payload: {
    eventType: string;
    data?: Record<string, unknown>;
  };
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}

// Google Meet 相关类型
export interface MeetAction {
  id: string;
  name: string;
  description: string;
  category: 'audio' | 'video' | 'chat' | 'screen' | 'other';
}

export interface DeviceInfo {
  id: string;
  name: string;
  platform: 'macos' | 'windows';
}
