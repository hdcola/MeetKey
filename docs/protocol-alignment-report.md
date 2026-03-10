# 协议一致性报告 (Protocol Alignment Report)

本文档记录了 `docs/websocket-protocol.md` 中定义的标准协议与 `packages/center` 实际 E2E 测试及 Rust 后端实现之间的差异。

## 1. 核心差异摘要

| 功能项           | 标准协议 (Specification) | 当前实现 (E2E / Rust)      | 状态        |
| :--------------- | :----------------------- | :------------------------- | :---------- |
| **控制指令类型** | `type: "command"`        | `type: "action"`           | 🚩 不一致   |
| **指令负载结构** | `{ device, action }`     | `{ action: "toggle-xxx" }` | 🚩 不一致   |
| **状态查询负载** | 包含 `requestId`         | `payload: null`            | ⚠️ 简化实现 |
| **连接事件**     | 包含角色前缀的事件       | 已实现并验证               | ✅ 一致     |
| **广播机制**     | 排除发送者的全量广播     | 包含发送者的全量广播       | ℹ️ 行为差异 |

---

## 2. 详细说明

### 2.1 指令消息 (Command vs Action)

- **标准 (Shared Library)**:
  使用 `type: "command"`，将设备（`microphone`/`camera`）与动作（`turn-on`/`turn-off`/`toggle`）解耦。
  ```json
  { "type": "command", "payload": { "device": "microphone", "action": "toggle" } }
  ```
- **当前 E2E 实现**:
  使用 `type: "action"`，动作采用复合字符串。
  ```json
  { "type": "action", "payload": { "action": "toggle-microphone" } }
  ```
- **原因**: 历史遗留实现。由于 Rust 后端对未知类型默认执行广播透传，因此 `action` 类型目前能正常工作，但未遵循 `shared` 定义。

### 2.2 状态查询 (State Query)

- **标准**:
  `state-query` 的 payload 包含 `requestId`。`state-response` 的 payload 包含 `requestId` 和 `state`。
- **当前实现**:
  `state-query` 的 payload 为 `null`。`state-response` 直接将 `MeetDeviceStatus` 作为整个 payload 返回。
- **风险**: 在高并发请求场景下，客户端无法准确匹配哪个响应对应哪个请求。

### 2.3 广播行为 (Broadcast Scope)

- **现状**:
  Rust 后端的 `broadcast_tx` 会将消息发送给所有订阅者，包括触发该消息的客户端。
- **建议**:
  客户端（如 Browser Extension）在收到 `state-update` 时，应检查 `id` 或来源，避免处理自己刚刚发出的更新，防止死循环或 UI 闪烁。

---

## 3. 待办事项 (Action Items)

1.  **[ ] 重构 E2E 测试**: 将 `type: "action"` 替换为标准协议中的 `type: "command"`。
2.  **[ ] 完善 Rust 后端解析**: 在 `websocket.rs` 中显式处理 `command` 类型，而不仅仅是依赖默认广播。
3.  **[ ] 引入 requestId**: 在 `state-query` 流程中实现 `requestId` 的透传，确保请求-响应链条的完整性。
4.  **[ ] 统一类型定义**: 确保 `packages/center/src/types` 与 `packages/shared/src/types` 完全同步。
