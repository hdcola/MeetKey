# WebSocket 真实集成测试方案 (Real Integration Testing)

## 1. 背景与目标

目前 `packages/center` 的集成测试主要通过 Mock `WebSocket` 对象来验证前端逻辑。虽然这能覆盖 Store 的状态流转，但无法验证：

- **协议兼容性**：Rust 端的 `serde` 定义是否与前端 TypeScript 类型完全匹配。
- **广播逻辑**：服务器是否能正确地在多个客户端（Plugin, Extension, Center UI）之间转发消息。
- **全链路一致性**：验证整个 WebSocket 服务器的生命周期及其状态管理逻辑。

本方案通过 **Vitest + 真实 Rust Server** 实现端到端的协议验证。

## 2. 测试架构

- **Server 端**：直接运行 `packages/center` 的 Rust 后端（`src-tauri`）。
- **Client 端**：使用 Vitest 运行测试用例，通过原生的 `WebSocket` API（在 Node 环境中使用 `ws` 库模拟）连接到本地服务器。
- **通信协议**：遵循 `@meetkey/shared` 中定义的协议格式。

## 3. 测试环境配置与执行

由于 E2E 测试依赖于真实的服务器环境，我们采用了 **隔离运行** 策略：

### A. 脚本定义 (`packages/center/package.json`)

- `pnpm test`: 运行常规单元测试（排除 `*.e2e.test.ts`）。
- `pnpm test:e2e`: 专门运行依赖服务器的 E2E 测试。
- `pnpm test:all`: 顺序运行单元测试和 E2E 测试。

### B. Vitest 配置隔离 (`vitest.config.ts`)

为了防止 CI 环境（通常没有启动服务器）报错，我们在 Vitest 配置中排除了 E2E 测试文件：

```typescript
exclude: [...configDefaults.exclude, '**/*.e2e.test.ts'];
```

### C. 执行步骤

1. **手动启动服务器**（终端 1）：
   ```bash
   pnpm dev:center
   ```
2. **运行测试**（终端 2）：
   ```bash
   cd packages/center
   pnpm test:e2e
   ```

## 4. 关键测试场景

### 4.1 角色注册与确认 (Registration)

验证所有角色（包括 `center`）连接后的握手流程。

- **用例**：客户端发送 `type: "register", payload: { role: "plugin" | "center" | "browser-extension" }`。
- **预期**：服务器统一回传 `{role}-connected` 确认消息。

### 4.2 状态同步 (State Sync - 三端联动)

验证全链路状态同步。

- **用例**：
  1. 启动三个客户端：**Center UI**, **Extension**, **Plugin**。
  2. Extension 发送 `state-update`。
- **预期**：
  1. Server 更新内部状态。
  2. **Center UI** 和 **Plugin** 均接收到广播。

### 4.3 状态查询 (State Query)

验证客户端启动或重连时的初始化获取。

- **用例**：发送 `state-query`。
- **预期**：返回包含当前麦克风和摄像头真实状态的 `state-response`。

### 4.4 指令透传 (Action Forwarding)

验证指令通过 Center 转发到执行端。

- **用例**：Plugin 发送 `action: "toggle-microphone"`。
- **预期**：Extension 接收到该 action 消息。

## 5. 实现参考

测试文件位于 `packages/center/src/__tests__/websocket.e2e.test.ts`。

核心逻辑示例：

```typescript
async function createRegisteredClient(role: string): Promise<WebSocket> {
  const ws = new WebSocket('ws://127.0.0.1:8080');
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          id: `reg-${role}`,
          type: 'register',
          payload: { role },
        })
      );
    });
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === `${role}-connected`) resolve(ws);
    });
  });
}
```

## 6. 后续演进

- **CI 自动化**：集成 `start-server-and-test` 在 CI 流程中自动启动 Headless 模式的 Server。
- **鲁棒性测试**：模拟发送非法 JSON 格式，验证 Rust 后端的错误处理逻辑。
- **负载测试**：测试多个客户端高频切换状态时的广播时延。
