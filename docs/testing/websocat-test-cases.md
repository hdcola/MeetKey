# WebSocket Testing with websocat

这个文档描述如何使用 `websocat` 工具测试 MeetKey Service 的 WebSocket 消息路由功能。

## 环境准备

### 安装 websocat

**macOS (Homebrew):**

```bash
brew install websocat
```

**Linux (Cargo):**

```bash
cargo install websocat
```

**Windows (Cargo):**

```bash
cargo install websocat
```

### 启动 Center

在项目根目录运行：

```bash
cd packages/center
pnpm dev
```

WebSocket 服务器将在 `ws://127.0.0.1:8080` 上监听。Center UI 会自动注册为 `'center'` 身份。

---

## 客户端角色说明

MeetKey Center 支持三种客户端角色：

| 角色          | 描述                             | 用途                       |
| ------------- | -------------------------------- | -------------------------- |
| **center**    | MeetKey Center UI（自动注册）    | 中心控制面板，接收所有事件 |
| **plugin**    | Stream Deck 硬件插件             | 接收状态更新，发送命令     |
| **extension** | Browser Extension（Google Meet） | 执行控制，发送状态更新     |

**消息流：**

- Plugin 发送 `command` → 转发给所有 Extension
- Extension 发送 `state-update` → 广播给所有 Plugin 和 Center
- Center 始终接收所有广播消息

---

## 测试用例

### 场景 0：基础连接测试

**目标：** 确认 WebSocket 服务器启动正常并可以接收连接。

**步骤：**

打开一个终端连接到服务器：

```bash
websocat ws://127.0.0.1:8080
```

**预期：**

- 连接成功建立
- 看到日志输出：`New connection from: 127.0.0.1:xxxxx`

**清理：** 按 `Ctrl+C` 关闭连接

---

### 场景 1：Plugin 角色注册

**目标：** Plugin 客户端成功注册自己的角色。

**步骤：**

在终端中发送注册消息：

```bash
websocat ws://127.0.0.1:8080
{"id":"test-1","type":"register","timestamp":1234567890,"payload":{"role":"plugin"}}
```

**预期：**

- 消息成功发送
- Service 日志输出：`Client {id} registered as: plugin`

**清理：** 按 `Ctrl+C` 关闭连接

---

### 场景 2：Extension 角色注册

**目标：** Extension 客户端成功注册自己的角色。

**步骤：**

在新终端中发送注册消息：

```bash
websocat ws://127.0.0.1:8080
{"id":"test-2","type":"register","timestamp":1234567890,"payload":{"role":"browser-extension"}}
```

**预期：**

- 消息成功发送
- Service 日志输出：`Client {id} registered as: extension`

**清理：** 按 `Ctrl+C` 关闭连接

---

### 场景 2.5：Center 身份注册（新增）

**目标：** Center UI 客户端成功注册自己的身份。

**步骤：**

在新终端中模拟 Center UI 的注册：

```bash
websocat ws://127.0.0.1:8080
{"id":"center-1","type":"register","timestamp":1234567890,"payload":{"role":"center"}}
```

**预期：**

- 消息成功发送
- Center UI 在后端日志中显示：`Client registered as: center`
- Center UI 在后端日志中显示：`🎛️ Center UI connected`
- 注意：Center 不会收到确认消息，但会接收后续的所有广播

**清理：** 按 `Ctrl+C` 关闭连接

---

### 场景 3：命令转发测试（Plugin → Extension）

**目标：** Plugin 发送的 command 消息正确转发给所有 Extension 客户端。

**步骤：**

**终端 1 - Extension 客户端：**

```bash
websocat ws://127.0.0.1:8080
{"id":"ext-1","type":"register","timestamp":1234567890,"payload":{"role":"browser-extension"}}
```

等待后续消息...

**终端 2 - Plugin 客户端：**

```bash
websocat ws://127.0.0.1:8080
{"id":"plugin-1","type":"register","timestamp":1234567890,"payload":{"role":"plugin"}}
{"id":"cmd-1","type":"command","timestamp":1234567891,"payload":{"device":"microphone","action":"toggle"}}
```

**预期：**

- Plugin 的 command 消息被发送
- **终端 1** 收到 command 消息：
  ```json
  {
    "id": "cmd-1",
    "type": "command",
    "timestamp": 1234567891,
    "payload": { "device": "microphone", "action": "toggle" }
  }
  ```

**清理：** 按 `Ctrl+C` 关闭所有连接

---

### 场景 4：状态更新广播测试（Extension → Plugin）

**目标：** Extension 发送的 state-update 消息正确广播给所有 Plugin 客户端。

**步骤：**

**终端 1 - Plugin 客户端 1：**

```bash
websocat ws://127.0.0.1:8080
{"id":"plugin-1","type":"register","timestamp":1234567890,"payload":{"role":"plugin"}}
```

等待状态更新...

**终端 2 - Plugin 客户端 2：**

```bash
websocat ws://127.0.0.1:8080
{"id":"plugin-2","type":"register","timestamp":1234567890,"payload":{"role":"plugin"}}
```

等待状态更新...

**终端 3 - Extension 客户端：**

```bash
websocat ws://127.0.0.1:8080
{"id":"ext-1","type":"register","timestamp":1234567890,"payload":{"role":"browser-extension"}}
{"id":"update-1","type":"state-update","timestamp":1234567891,"payload":{"microphone":"on","camera":"off","last_updated":1234567891}}
```

**预期：**

- Extension 的 state-update 消息被发送
- **终端 1 和终端 2** 都收到相同的 state-update 消息：
  ```json
  {
    "id": "update-1",
    "type": "state-update",
    "timestamp": 1234567891,
    "payload": { "microphone": "on", "camera": "off", "last_updated": 1234567891 }
  }
  ```

**清理：** 按 `Ctrl+C` 关闭所有连接

---

### 场景 5：状态查询测试（State Query/Response）

**目标：** 任何客户端可以查询当前状态，Service 正确回复。

**步骤：**

**终端 1 - Extension 客户端（先更新状态）：**

```bash
websocat ws://127.0.0.1:8080
{"id":"ext-1","type":"register","timestamp":1234567890,"payload":{"role":"browser-extension"}}
{"id":"init-state","type":"state-update","timestamp":1234567891,"payload":{"microphone":"on","camera":"on","last_updated":1234567891}}
```

**终端 2 - Plugin 客户端（查询状态）：**

```bash
websocat ws://127.0.0.1:8080
{"id":"plugin-1","type":"register","timestamp":1234567890,"payload":{"role":"plugin"}}
{"id":"query-1","type":"state-query","timestamp":1234567892,"payload":{"requestId":"req-123"}}
```

**预期：**

- Plugin 客户端收到 state-response 回复：
  ```json
  {"id":"query-1","type":"state-response","timestamp":..., "payload":{"requestId":"req-123","state":{"microphone":"on","camera":"on","last_updated":1234567891}}}
  ```

**清理：** 按 `Ctrl+C` 关闭所有连接

---

### 场景 6：心跳测试（Ping/Pong）

**目标：** 客户端可以发送 ping，Service 正确回复 pong。

**步骤：**

```bash
websocat ws://127.0.0.1:8080
{"id":"ping-1","type":"register","timestamp":1234567890,"payload":{"role":"plugin"}}
{"id":"hb-1","type":"ping","timestamp":1234567891}
```

**预期：**

- 收到 pong 回复：
  ```json
  {"id":"hb-1","type":"pong","timestamp":...}
  ```

**清理：** 按 `Ctrl+C` 关闭连接

---

## 完整端到端测试脚本

下面是一个完整的多终端测试流程。建议打开 4 个终端窗口分别运行以下命令。

### 终端 1 - Center 启动

```bash
cd packages/center
pnpm dev
```

Center UI 会自动连接并注册为 `'center'` 身份。

### 终端 2 - Extension 客户端

```bash
websocat ws://127.0.0.1:8080

# 发送以下消息序列：
# 1. 注册
{"id":"ext-1","type":"register","timestamp":1234567890,"payload":{"role":"browser-extension"}}

# 2. 等待一秒后，发送状态更新
{"id":"update-1","type":"state-update","timestamp":1234567891,"payload":{"microphone":"on","camera":"on","last_updated":1234567891}}

# 3. 继续监听接收到的命令和其他消息
```

### 终端 3 - Plugin 客户端 1

```bash
websocat ws://127.0.0.1:8080

# 发送以下消息序列：
# 1. 注册
{"id":"plugin-1","type":"register","timestamp":1234567890,"payload":{"role":"plugin"}}

# 2. 等待接收状态更新（来自 Extension）

# 3. 发送状态查询
{"id":"query-1","type":"state-query","timestamp":1234567892,"payload":{"requestId":"req-plugin-1"}}

# 4. 期望接收 state-response
```

### 终端 4 - Plugin 客户端 2 / 或发送命令

```bash
websocat ws://127.0.0.1:8080

# 发送以下消息序列：
# 1. 注册为 plugin
{"id":"plugin-2","type":"register","timestamp":1234567890,"payload":{"role":"plugin"}}

# 2. 发送命令（会转发给 Extension）
{"id":"cmd-1","type":"command","timestamp":1234567893,"payload":{"device":"microphone","action":"toggle"}}

# 3. 继续监听接收到的状态更新
```

### 预期的消息流

```
Center UI 连接后：
  📨 Received message type: register (role: center)
  ✅ Client registered as: center
  🎛️ Center UI connected

Extension 终端：
  发送: register (as extension)
  接收: extension-connected (确认)
  发送: state-update {microphone: "on", camera: "on"}

Plugin 1 终端：
  发送: register (as plugin)
  接收: plugin-connected (确认)
  接收: state-update {microphone: "on", camera: "on"}
  发送: state-query
  接收: state-response {microphone: "on", camera: "on"}

Plugin 2 终端：
  发送: register (as plugin)
  接收: plugin-connected (确认)
  发送: command {device: "microphone", action: "toggle"}
  接收: state-update {microphone: "on", camera: "on"}

Server 日志：
  WebSocket server listening on: 127.0.0.1:8080
  New connection from: 127.0.0.1:xxxxx (Center UI)
  📨 Received message type: register (role: center)
  ✅ Client registered as: center
  🎛️ Center UI connected

  New connection from: 127.0.0.1:xxxxx (Extension)
  📨 Received message type: register (role: extension)
  ✅ Client registered as: extension
  📤 Sending confirmation: extension-connected
  📢 Broadcasting: extension-connected

  New connection from: 127.0.0.1:xxxxx (Plugin 1)
  📨 Received message type: register (role: plugin)
  ✅ Client registered as: plugin
  📤 Sending confirmation: plugin-connected
  📢 Broadcasting: plugin-connected
  ...
```

Center UI 会实时显示连接状态：

- Extension 注册后，"Browser" 指示灯 🟢 变绿
- Plugin 注册后，"Plugin" 指示灯 🟢 变绿

---

## 调试提示

1. **消息格式验证：** 确保所有消息都是有效的 JSON 格式
2. **时间戳：** `timestamp` 应该是毫秒级别的 Unix 时间戳
3. **UUID：** `id` 和 `payload.requestId` 应该是有效的 UUID 或唯一标识符
4. **字段命名：** 确保使用 snake_case（如 `last_updated`，不是 `lastUpdated`）
5. **Service 日志：** 检查 Service 输出的日志以理解消息是否被正确处理

---

## 故障排除

### 连接失败

**问题：** `websocat` 无法连接到 WebSocket 服务器

**解决方案：**

1. 检查 Service 是否正在运行：`cd packages/service && pnpm dev`
2. 确认地址和端口正确：`ws://127.0.0.1:8080`
3. 检查防火墙设置

### 消息未被转发

**问题：** 发送的消息没有被转发给其他客户端

**解决方案：**

1. 检查消息的 `type` 字段是否正确（command / state-update）
2. 确认客户端已正确注册角色
3. 检查 Service 日志中是否有错误消息

### 收不到预期消息

**问题：** 连接已建立，但没有收到预期的消息

**解决方案：**

1. 验证消息格式是否正确
2. 确认消息被正确发送到服务器（检查发送方终端）
3. 查看 Service 日志，确认消息被接收和处理
