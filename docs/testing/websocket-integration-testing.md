# WebSocket 真实集成测试方案 (Real Integration Testing)

## 1. 背景与目标

目前 `packages/center` 的集成测试主要通过 Mock `WebSocket` 对象来验证前端逻辑。虽然这能覆盖 Store 的状态流转，但无法验证：

- **协议兼容性**：Rust 端的 `serde` 定义是否与前端 TypeScript 类型完全匹配。
- **广播逻辑**：服务器是否能正确地在多个客户端（Plugin, Extension, UI）之间转发消息。
- **并发处理**：多个连接同时存在时的稳定性。

本方案旨在通过 **Vitest + 真实 Rust Server** 实现端到端的协议验证。

## 2. 测试架构

- **Server 端**：直接运行 `packages/center` 的 Rust 后端（`src-tauri`）。
- **Client 端**：使用 Vitest 运行测试用例，通过原生的 `WebSocket` API 连接到本地服务器。
- **通信协议**：遵循 `@meetkey/shared` 中定义的 `WebSocketMessage` 格式。

## 3. 测试环境配置

### A. 手动测试模式 (开发调试)

1. 启动服务器：
   ```bash
   pnpm dev:center
   ```
2. 在另一个终端运行特定测试：
   ```bash
   pnpm test:e2e
   ```

### B. 自动化测试模式 (CI/CD)

使用 `start-server-and-test` 工具或 Vitest 的 `globalSetup`：

1. 编译并启动 Headless 模式的 Center。
2. 等待 8080 端口就绪。
3. 执行测试。
4. 测试完成后自动杀掉进程。

## 4. 关键测试用例定义

### 4.1 角色注册 (Registration)

验证不同角色连接后的握手流程。

- **用例**：客户端发送 `type: "register", payload: { role: "plugin" }` 或 `role: "center"`。
- **预期**：
  - 若为 `plugin` 或 `browser-extension`：服务器返回确认消息并广播其连接状态。
  - 若为 `center`：服务器在日志中记录连接（Center UI 通常作为主控制台，其连接状态由前端连接状态直接驱动）。

### 4.2 状态同步 (State Sync - 三端联动)

验证全链路状态同步。

- **用例**：
  1. 启动三个客户端：**Center UI**, **Extension**, **Plugin**。
  2. Extension 检测到 Google Meet 状态变化，发送 `state-update` (microphone: "on")。
- **预期**：
  1. Server 更新内部状态。
  2. **Center UI** 收到消息，界面图标变为“麦克风开启”。
  3. **Plugin** 收到消息，物理按钮灯光/图标变为“麦克风开启”。

### 4.3 状态查询 (State Query)

验证 Center UI 启动或重连时的初始化。

- **用例**：Center UI 连接后发送 `state-query`。
- **预期**：服务器返回包含当前麦克风和摄像头真实状态的 `state-response`。

### 4.4 消息透传 (Action Forwarding)

验证指令通过 Center 转发到执行端。

- **用例**：Plugin 发送 `action: "toggle-microphone"`。
- **预期**：Extension 接收到该 action 消息。

## 5. 实现示例 (Vitest)

```typescript
// packages/center/src/__tests__/websocket.e2e.test.ts
import { describe, it, expect } from 'vitest';

const WS_URL = 'ws://127.0.0.1:8080';

async function createClient(role: string) {
  const ws = new WebSocket(WS_URL);
  await new Promise((resolve) => (ws.onopen = resolve));

  ws.send(
    JSON.stringify({
      id: `reg-${role}-${Date.now()}`,
      type: 'register',
      timestamp: Date.now(),
      payload: { role },
    })
  );

  return ws;
}

describe('WebSocket E2E', () => {
  it('应该支持多客户端注册与消息广播', async () => {
    const plugin = await createClient('plugin');
    const extension = await createClient('browser-extension');

    const broadcastPromise = new Promise((resolve) => {
      extension.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state-update') resolve(msg);
      };
    });

    plugin.send(
      JSON.stringify({
        id: 'update-1',
        type: 'state-update',
        timestamp: Date.now(),
        payload: { microphone: 'on', camera: 'off', last_updated: Date.now() },
      })
    );

    const received = await broadcastPromise;
    expect(received.payload.microphone).toBe('on');
  });
});
```

## 6. 后续演进

- **性能测试**：模拟大量客户端连接。
- **错误注入**：发送畸形 JSON，验证 Rust 后端的健壮性（不崩溃且返回错误或忽略）。
- **协议自动对齐**：通过从 `shared` 包提取 JSON Schema，自动生成测试用例。
