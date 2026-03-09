/**
 * WebSocket 通信协议 - 消息构建器和验证
 */

import type {
  WebSocketMessage,
  RegisterMessage,
  CommandMessage,
  StateUpdateMessage,
  StateQueryMessage,
  StateResponseMessage,
  ErrorMessage,
  ClientRole,
  MeetDeviceType,
  MeetCommandAction,
  MeetDeviceStatus,
} from '../types/index.js';

import { v4 as uuidv4 } from 'uuid';

/**
 * 消息构建器 - 创建规范的 WebSocket 消息
 */
export class MessageBuilder {
  /**
   * 注册客户端角色
   * @param role 客户端角色 ('plugin' | 'browser-extension')
   */
  static createRegisterMessage(role: ClientRole): RegisterMessage {
    return {
      id: uuidv4(),
      type: 'register',
      timestamp: Date.now(),
      payload: {
        role,
      },
    };
  }

  /**
   * 创建设备控制命令
   * @param device 设备类型 ('microphone' | 'camera')
   * @param action 操作 ('turn-on' | 'turn-off' | 'toggle')
   */
  static createCommandMessage(device: MeetDeviceType, action: MeetCommandAction): CommandMessage {
    return {
      id: uuidv4(),
      type: 'command',
      timestamp: Date.now(),
      payload: {
        device,
        action,
      },
    };
  }

  /**
   * 报告设备状态变化
   */
  static createStateUpdateMessage(status: MeetDeviceStatus): StateUpdateMessage {
    return {
      id: uuidv4(),
      type: 'state-update',
      timestamp: Date.now(),
      payload: status,
    };
  }

  /**
   * 查询当前设备状态
   */
  static createStateQueryMessage(): StateQueryMessage {
    const requestId = uuidv4();
    return {
      id: uuidv4(),
      type: 'state-query',
      timestamp: Date.now(),
      payload: {
        requestId,
      },
    };
  }

  /**
   * 回复设备状态查询
   */
  static createStateResponseMessage(
    requestId: string,
    state: MeetDeviceStatus
  ): StateResponseMessage {
    return {
      id: uuidv4(),
      type: 'state-response',
      timestamp: Date.now(),
      payload: {
        requestId,
        state,
      },
    };
  }

  /**
   * 创建错误消息
   */
  static createErrorMessage(code: string, message: string): ErrorMessage {
    return {
      id: uuidv4(),
      type: 'error',
      timestamp: Date.now(),
      payload: {
        code,
        message,
      },
    };
  }
}

/**
 * 消息验证器
 */
export function isValidMessage(data: unknown): data is WebSocketMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return (
    typeof msg.id === 'string' && typeof msg.type === 'string' && typeof msg.timestamp === 'number'
  );
}

export function isCommandMessage(msg: WebSocketMessage): msg is CommandMessage {
  return msg.type === 'command' && !!msg.payload && typeof msg.payload === 'object';
}

export function isStateUpdateMessage(msg: WebSocketMessage): msg is StateUpdateMessage {
  return msg.type === 'state-update' && !!msg.payload && typeof msg.payload === 'object';
}

export function isStateQueryMessage(msg: WebSocketMessage): msg is StateQueryMessage {
  return msg.type === 'state-query' && !!msg.payload && typeof msg.payload === 'object';
}

export function isStateResponseMessage(msg: WebSocketMessage): msg is StateResponseMessage {
  return msg.type === 'state-response' && !!msg.payload && typeof msg.payload === 'object';
}

export function isErrorMessage(msg: WebSocketMessage): msg is ErrorMessage {
  return msg.type === 'error' && !!msg.payload && typeof msg.payload === 'object';
}

export function isRegisterMessage(msg: WebSocketMessage): msg is RegisterMessage {
  return msg.type === 'register' && !!msg.payload && typeof msg.payload === 'object';
}
