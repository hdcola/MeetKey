import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';

// 在 Node 环境中模拟浏览器的 WebSocket
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

const WS_URL = 'ws://127.0.0.1:8080';
const DEFAULT_TIMEOUT = 5000;

/**
 * 助手函数：带超时的等待消息
 */
async function waitForMessage(
  ws: WebSocket,
  condition: (msg: any) => boolean,
  timeoutMs = DEFAULT_TIMEOUT
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error(`等待消息超时 (${timeoutMs}ms)`));
    }, timeoutMs);

    function onMessage(data: any) {
      try {
        const msg = JSON.parse(data.toString());
        if (condition(msg)) {
          clearTimeout(timeout);
          ws.off('message', onMessage);
          resolve(msg);
        }
      } catch (e) {
        // 忽略非 JSON 消息
      }
    }

    ws.on('message', onMessage);
  });
}

/**
 * 助手函数：创建一个已注册的 WebSocket 客户端
 */
async function createRegisteredClient(role: string): Promise<WebSocket> {
  const ws = new WebSocket(WS_URL);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`连接 ${role} 超时`));
    }, DEFAULT_TIMEOUT);

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

    ws.on('message', function onMessage(data) {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === `${role}-connected`) {
          clearTimeout(timeout);
          ws.off('message', onMessage);
          resolve(ws);
        }
      } catch (e) {
        // 忽略
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

    const responsePromise = waitForMessage(center, (msg) => msg.type === 'state-response');

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
    const center = await createRegisteredClient('center');

    const pluginReceivedPromise = waitForMessage(
      plugin,
      (msg) => msg.type === 'state-update' && msg.id === 'update-from-ext'
    );

    const centerReceivedPromise = waitForMessage(
      center,
      (msg) => msg.type === 'state-update' && msg.id === 'update-from-ext'
    );

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

    const [pluginMsg, centerMsg] = await Promise.all([
      pluginReceivedPromise,
      centerReceivedPromise,
    ]);

    expect(pluginMsg.payload.microphone).toBe('on');
    expect(centerMsg.payload.microphone).toBe('on');

    extension.close();
    plugin.close();
    center.close();
  });

  it('应该透传 Action 指令 (action)', async () => {
    const plugin = await createRegisteredClient('plugin');
    const center = await createRegisteredClient('center');
    const extension = await createRegisteredClient('browser-extension');

    // 测试 Plugin 发送指令 -> Extension 接收
    const pluginActionPromise = waitForMessage(
      extension,
      (msg) => msg.type === 'action' && msg.id === 'action-from-plugin'
    );

    plugin.send(
      JSON.stringify({
        id: 'action-from-plugin',
        type: 'action',
        timestamp: Date.now(),
        payload: { action: 'toggle-microphone' },
      })
    );

    const receivedFromPlugin = await pluginActionPromise;
    expect(receivedFromPlugin.payload.action).toBe('toggle-microphone');

    // 测试 Center 发送指令 -> Extension 接收
    const centerActionPromise = waitForMessage(
      extension,
      (msg) => msg.type === 'action' && msg.id === 'action-from-center'
    );

    center.send(
      JSON.stringify({
        id: 'action-from-center',
        type: 'action',
        timestamp: Date.now(),
        payload: { action: 'toggle-camera' },
      })
    );

    const receivedFromCenter = await centerActionPromise;
    expect(receivedFromCenter.payload.action).toBe('toggle-camera');

    plugin.close();
    center.close();
    extension.close();
  });

  it('当 plugin 连接时，center 应该收到 plugin-connected 消息', async () => {
    const center = await createRegisteredClient('center');

    const connectedPromise = waitForMessage(center, (msg) => msg.type === 'plugin-connected');

    const plugin = await createRegisteredClient('plugin');
    const msg = await connectedPromise;

    expect(msg.type).toBe('plugin-connected');

    plugin.close();
    center.close();
  });

  it('当 browser-extension 连接时，center 应该收到 browser-extension-connected 消息', async () => {
    const center = await createRegisteredClient('center');

    const connectedPromise = waitForMessage(
      center,
      (msg) => msg.type === 'browser-extension-connected'
    );

    const extension = await createRegisteredClient('browser-extension');
    const msg = await connectedPromise;

    expect(msg.type).toBe('browser-extension-connected');

    extension.close();
    center.close();
  });

  it('当 plugin 断开连接时，center 应该收到 plugin-disconnected 消息', async () => {
    const center = await createRegisteredClient('center');
    const plugin = await createRegisteredClient('plugin');

    const disconnectedPromise = waitForMessage(center, (msg) => msg.type === 'plugin-disconnected');

    plugin.close();
    const msg = await disconnectedPromise;

    expect(msg.type).toBe('plugin-disconnected');
    center.close();
  });

  it('当 browser-extension 断开连接时，center 应该收到 browser-extension-disconnected 消息', async () => {
    const center = await createRegisteredClient('center');
    const extension = await createRegisteredClient('browser-extension');

    const disconnectedPromise = waitForMessage(
      center,
      (msg) => msg.type === 'browser-extension-disconnected'
    );

    extension.close();
    const msg = await disconnectedPromise;

    expect(msg.type).toBe('browser-extension-disconnected');
    center.close();
  });
});
