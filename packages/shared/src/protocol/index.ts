/**
 * WebSocket 通信协议
 */

import type {
  WebSocketMessage,
  ActionMessage,
  EventMessage,
  ErrorMessage,
} from '../types/index.js';

export class MessageBuilder {
  static createActionMessage(
    id: string,
    actionId: string,
    params?: Record<string, unknown>
  ): ActionMessage {
    return {
      id,
      type: 'action',
      timestamp: Date.now(),
      payload: {
        actionId,
        params,
      },
    };
  }

  static createEventMessage(
    id: string,
    eventType: string,
    data?: Record<string, unknown>
  ): EventMessage {
    return {
      id,
      type: 'event',
      timestamp: Date.now(),
      payload: {
        eventType,
        data,
      },
    };
  }

  static createErrorMessage(
    id: string,
    code: string,
    message: string
  ): ErrorMessage {
    return {
      id,
      type: 'error',
      timestamp: Date.now(),
      payload: {
        code,
        message,
      },
    };
  }
}

export function isValidMessage(data: unknown): data is WebSocketMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return (
    typeof msg.id === 'string' &&
    typeof msg.type === 'string' &&
    typeof msg.timestamp === 'number'
  );
}
