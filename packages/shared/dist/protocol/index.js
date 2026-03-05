/**
 * WebSocket 通信协议
 */
export class MessageBuilder {
    static createActionMessage(id, actionId, params) {
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
    static createEventMessage(id, eventType, data) {
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
    static createErrorMessage(id, code, message) {
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
export function isValidMessage(data) {
    if (!data || typeof data !== 'object')
        return false;
    const msg = data;
    return (typeof msg.id === 'string' &&
        typeof msg.type === 'string' &&
        typeof msg.timestamp === 'number');
}
//# sourceMappingURL=index.js.map