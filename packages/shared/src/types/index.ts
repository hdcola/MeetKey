/**
 * WebSocket 消息类型定义
 */

// 客户端角色
export type ClientRole = 'plugin' | 'browser-extension' | 'center';

// 基础消息类型
export type MessageType =
  | 'register'
  | 'command'
  | 'action'
  | 'state-update'
  | 'state-query'
  | 'state-response'
  | 'error'
  | 'ping'
  | 'pong';

export interface WebSocketMessage {
  id: string;
  type: MessageType;
  timestamp: number;
  payload?: unknown;
}

// Register Message - 客户端声明自己的角色
export interface RegisterMessage extends WebSocketMessage {
  type: 'register';
  payload: {
    role: ClientRole;
  };
}

// Action Message - 客户端发送通用动作
export interface ActionMessage extends WebSocketMessage {
  type: 'action';
  payload: {
    action: string;
    params?: Record<string, unknown>;
  };
}

// MeetKey 特定类型
export type MeetDeviceType = 'microphone' | 'camera';
export type MeetDeviceState = 'on' | 'off' | 'unknown';
export type MeetCommandAction = 'turn-on' | 'turn-off' | 'toggle';

export interface MeetDeviceStatus {
  microphone: MeetDeviceState;
  camera: MeetDeviceState;
  last_updated: number;
}

// Command Message - Plugin 或 Service 向 Extension 发送命令
export interface CommandMessage extends WebSocketMessage {
  type: 'command';
  payload: {
    device: MeetDeviceType;
    action: MeetCommandAction;
  };
}

// State Update Message - Extension 向 Service 报告状态变化
export interface StateUpdateMessage extends WebSocketMessage {
  type: 'state-update';
  payload: MeetDeviceStatus;
}

// State Query Message - Plugin 或其他客户端查询当前状态
export interface StateQueryMessage extends WebSocketMessage {
  type: 'state-query';
  payload: {
    requestId: string;
  };
}

// State Response Message - Service 回复当前状态
export interface StateResponseMessage extends WebSocketMessage {
  type: 'state-response';
  payload: {
    requestId: string;
    state: MeetDeviceStatus;
  };
}

// Error Message
export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}
