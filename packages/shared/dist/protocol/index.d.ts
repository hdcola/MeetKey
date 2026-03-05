/**
 * WebSocket 通信协议
 */
import type { WebSocketMessage, ActionMessage, EventMessage, ErrorMessage } from '../types/index.js';
export declare class MessageBuilder {
    static createActionMessage(id: string, actionId: string, params?: Record<string, unknown>): ActionMessage;
    static createEventMessage(id: string, eventType: string, data?: Record<string, unknown>): EventMessage;
    static createErrorMessage(id: string, code: string, message: string): ErrorMessage;
}
export declare function isValidMessage(data: unknown): data is WebSocketMessage;
//# sourceMappingURL=index.d.ts.map