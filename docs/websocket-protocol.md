# MeetKey WebSocket 协议文档

本文档详细说明了 MeetKey 系统中各组件（Center, Browser Extension, Stream Dock Plugin）之间通过 WebSocket 进行通信的工作方式、原理及支持的所有消息协议。

## 1. 工作原理 (Working Principle)

MeetKey 采用 **中心化广播架构**。`@meetkey/center` 作为 WebSocket 服务器（运行在 `127.0.0.1:端口`），所有其他组件作为客户端连接到该服务器。

### 核心机制

1.  **状态持有**: Center 服务器维护一个全局的会议设备状态（麦克风、摄像头）。
2.  **双向通信**:
    - 客户端通过发送 `command` 来触发操作。
    - 浏览器扩展执行操作后发送 `state-update` 同步状态。
3.  **消息广播**: 服务器收到任何非注册类消息后，默认会将其广播给所有连接的客户端，确保 UI 状态在所有设备上实时同步。
4.  **角色识别**: 客户端连接后需通过 `register` 消息声明自己的角色（`plugin`, `browser-extension` 或 `center`）。

---

## 2. 基础消息格式 (Base Message Format)

所有消息均采用 JSON 格式，包含以下标准字段：

| 字段        | 类型     | 说明                               |
| :---------- | :------- | :--------------------------------- |
| `id`        | `string` | 唯一消息 ID (UUID)                 |
| `type`      | `string` | 消息类型（定义了如何处理该消息）   |
| `timestamp` | `number` | 发送消息时的 Unix 时间戳（毫秒）   |
| `payload`   | `object` | 可选。与消息类型相关的具体数据负载 |

---

## 3. 支持的方法与消息类型 (Supported Methods)

### 3.1 客户端注册 (Client Registration)

客户端连接后必须首先发送此消息以标识身份。

- **类型**: `register`
- **Payload**:
  ```json
  {
    "role": "plugin" | "browser-extension" | "center"
  }
  ```
- **服务端响应**:
  - 发送 `{role}-connected` 消息给当前客户端作为确认。
  - 广播 `{role}-connected` 给其他所有客户端（`center` 角色除外）。

### 3.2 控制命令 (Command)

用于触发设备操作，通常由 `plugin` 或 `center` 发送，由 `browser-extension` 接收并执行。

- **类型**: `command`
- **Payload**:
  ```json
  {
    "device": "microphone" | "camera",
    "action": "turn-on" | "turn-off" | "toggle"
  }
  ```

### 3.3 状态更新 (State Update)

当 Google Meet 页面状态发生变化时，由 `browser-extension` 发送，用于同步所有端的 UI。

- **类型**: `state-update`
- **Payload** (`MeetDeviceStatus`):
  ```json
  {
    "microphone": "on" | "off" | "unknown",
    "camera": "on" | "off" | "unknown",
    "last_updated": 1741584000000
  }
  ```
- **服务端处理**: 更新服务器内存中的最新状态，并广播该消息。

### 3.4 状态查询 (State Query)

客户端启动或重连时，查询服务器当前持有的状态。

- **类型**: `state-query`
- **Payload**:
  ```json
  {
    "requestId": "string"
  }
  ```

### 3.5 状态响应 (State Response)

服务端对 `state-query` 的回复。

- **类型**: `state-response`
- **Payload**:
  ```json
  {
    "requestId": "string",
    "state": {
      "microphone": "on",
      "camera": "off",
      "last_updated": 1741584000000
    }
  }
  ```

### 3.6 错误报告 (Error)

用于通知通信或执行中的异常。

- **类型**: `error`
- **Payload**:
  ```json
  {
    "code": "string",
    "message": "string"
  }
  ```

---

## 4. 连接生命周期 (Connection Lifecycle)

1.  **建立连接**: 客户端连接到 `ws://127.0.0.1:PORT`。
2.  **注册**: 客户端发送 `register` 消息。
3.  **初始状态同步**: 客户端发送 `state-query` 获取当前会议状态。
4.  **实时监听**: 客户端通过监听 `state-update` 或 `{role}-connected/disconnected` 消息更新本地 UI。
5.  **断开连接**: 当客户端主动或被动断开时，服务器会向其他客户端广播 `{role}-disconnected`。

---

## 5. 开发建议 (Development Notes)

- **ID 追踪**: 在处理 `state-query` 和 `state-response` 时，务必通过 `requestId` 匹配请求与响应。
- **消息幂等性**: 处理 `command` 时应考虑幂等性，避免重复触发。
- **协议位置**: 核心类型定义位于 `packages/shared/src/types/index.ts`，消息构建逻辑位于 `packages/shared/src/protocol/index.ts`。
