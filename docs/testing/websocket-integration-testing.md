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

由于 E2E 测试依赖于真实的服务器环境，我们采用了 **自动生命周期管理** 策略：

### A. 脚本定义 (`packages/center/package.json`)

- `pnpm test`: 运行常规单元测试（排除 `*.e2e.test.ts`）。
- `pnpm test:e2e`: 专门运行依赖服务器的 E2E 测试。
- `pnpm test:all`: 顺序运行单元测试和 E2E 测试。

### B. 执行步骤

你只需在 `packages/center` 目录下运行：

```bash
pnpm test:e2e
```

测试框架会自动执行以下逻辑：

1. **端口检测**：检查 8080 端口是否已有服务器运行。
2. **自动启动**：如果端口空闲，则自动尝试启动编译好的 Rust 二进制或通过 `cargo run` 启动。
3. **等待就绪**：最多等待 30s 确保服务器响应。
4. **清理**：测试完成后，如果是自动启动的进程会被自动关闭。

## 4. 关键测试场景

### 4.1 角色注册与确认 (Registration)

验证所有角色（包括 `center`, `browser-extension`, `plugin`）连接后的握手流程。

- **用例**：客户端发送 `type: "register", payload: { role: ClientRole }`。
- **预期**：服务器统一回传 `{role}-connected` 确认消息。

### 4.2 状态同步 (State Sync)

验证全链路状态同步。

- **用例**：
  1. 启动多个角色。
  2. 其中一个发送 `state-update`。
- **预期**：
  1. Server 更新内部状态。
  2. 其他所有注册客户端均接收到广播。

### 4.3 状态查询 (State Query)

验证客户端启动或重连时的初始化获取。

- **用例**：发送 `state-query`。
- **预期**：返回包含当前麦克风和摄像头真实状态的 `state-response`。

### 4.4 指令透传 (Action Forwarding)

验证指令通过 Center 转发到执行端。

- **用例**：发送 `type: "action", payload: { action: string }`。
- **预期**：Extension 等相关方接收到该消息。

## 5. 实现参考

测试文件位于 `packages/center/src/__tests__/websocket.e2e.test.ts`。
测试 setup 逻辑位于 `packages/center/src/__tests__/setup-e2e.ts`。
