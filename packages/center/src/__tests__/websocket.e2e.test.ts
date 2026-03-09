import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';

// 在 Node 环境中模拟浏览器的 WebSocket
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

const WS_URL = 'ws://127.0.0.1:8080';

/**
 * 助手函数：创建一个已注册的 WebSocket 客户端
 */
async function createRegisteredClient(role: string): Promise<WebSocket> {
  const ws = new WebSocket(WS_URL);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`连接 ${role} 超时`));
    }, 2000);

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          id: `reg-${role}-${Date.now()}`,
          type: 'register',
          timestamp: Date.now(),
          payload: { role },
        })
      );
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === `${role}-connected`) {
        clearTimeout(timeout);
        resolve(ws);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

describe('WebSocket E2E 集成测试 (需要服务器运行在 8080 端口)', () => {
  it('应该支持角色注册并返回确认消息', async () => {
    const plugin = await createRegisteredClient('plugin');
    expect(plugin.readyState).toBe(WebSocket.OPEN);
    plugin.close();
  });

  it('应该支持状态查询 (state-query)', async () => {
    const center = await createRegisteredClient('center');

    const responsePromise = new Promise<any>((resolve) => {
      center.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'state-response') {
          resolve(msg);
        }
      });
    });

    center.send(
      JSON.stringify({
        id: 'query-1',
        type: 'state-query',
        timestamp: Date.now(),
        payload: null,
      })
    );

    const response = await responsePromise;
    expect(response.type).toBe('state-response');
    expect(response.payload).toHaveProperty('microphone');
    expect(response.payload).toHaveProperty('camera');

    center.close();
  });

  it('应该在不同客户端之间广播状态更新 (state-update)', async () => {
    const extension = await createRegisteredClient('browser-extension');
    const plugin = await createRegisteredClient('plugin');

    const broadcastPromise = new Promise<any>((resolve) => {
      plugin.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        // 我们在寻找 extension 发出的那个更新
        if (msg.type === 'state-update' && msg.id === 'update-from-ext') {
          resolve(msg);
        }
      });
    });

    // Extension 发送状态更新
    const testState = {
      microphone: 'on',
      camera: 'off',
      last_updated: Date.now(),
    };

    extension.send(
      JSON.stringify({
        id: 'update-from-ext',
        type: 'state-update',
        timestamp: Date.now(),
        payload: testState,
      })
    );

    const receivedMsg = await broadcastPromise;
    expect(receivedMsg.payload.microphone).toBe('on');
    expect(receivedMsg.payload.camera).toBe('off');

    extension.close();
    plugin.close();
  });

  it('应该透传 Action 指令 (action)', async () => {
    const plugin = await createRegisteredClient('plugin');
    const extension = await createRegisteredClient('browser-extension');

    const actionPromise = new Promise<any>((resolve) => {
      extension.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'action' && msg.payload.action === 'toggle-microphone') {
          resolve(msg);
        }
      });
    });

    // Plugin 发送指令
    plugin.send(
      JSON.stringify({
        id: 'action-1',
        type: 'action',
        timestamp: Date.now(),
        payload: { action: 'toggle-microphone' },
      })
    );

    const receivedAction = await actionPromise;
    expect(receivedAction.payload.action).toBe('toggle-microphone');

    plugin.close();
    extension.close();
  });
});
