# MeetKey Center UI 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 MeetKey Center 的主窗口 UI，支持一键控制麦克风和摄像头，显示实时连接状态。

**Architecture:**

- **Tauri 窗口**：300x150 小窗口，可拖动、可最小化
- **Vue 3 组件**：主应用组件 + 两个按钮组件 + 连接状态组件
- **状态管理**：Pinia store 管理设备状态和连接状态，WebSocket 实时同步
- **交互**：按钮点击发送命令到 WebSocket，接收状态更新并实时反馈

**Tech Stack:** Tauri (v2) + Vue 3 + TypeScript + Pinia + Tailwind CSS + @tauri-apps/api

---

## 前置条件

- 项目已更名 `packages/service` → `packages/center` ✓（需要先做）
- 有基础的 Center WebSocket 服务器实现
- @meetkey/shared 中已定义消息类型

---

## Task 1: 重命名 service 为 center

**文件：**

- Rename: `packages/service/` → `packages/center/`
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json` (所有相对路径引用)
- Modify: `packages/center/package.json` (name 字段)
- Modify: `packages/center/tsconfig.json` (如有相对路径)

**Step 1: 重命名目录**

```bash
cd /Users/hd/work/prj/MeetKey
mv packages/service packages/center
```

**Step 2: 更新 pnpm-workspace.yaml**

找到 `packages/` 配置，确保包含 `center` 而不是 `service`

**Step 3: 更新根 package.json 中的 center 脚本引用**

找到所有 `packages/service` 改为 `packages/center`

**Step 4: 更新 packages/center/package.json**

修改 `"name": "@meetkey/service"` → `"name": "@meetkey/center"`

**Step 5: 更新所有包的依赖引用**

在 `packages/plugin` 和 `packages/browser-extension` 中，改：

```json
"@meetkey/service": "workspace:*"
```

为：

```json
"@meetkey/center": "workspace:*"
```

**Step 6: 验证并提交**

```bash
cd /Users/hd/work/prj/MeetKey
pnpm install  # 验证没有错误
git add -A
git commit -m "refactor: rename packages/service to packages/center"
```

---

## Task 2: 配置 Tauri 窗口大小和属性

**文件：**

- Modify: `packages/center/src-tauri/src/main.rs`

**Step 1: 阅读当前的 main.rs 窗口配置**

```bash
cat packages/center/src-tauri/src/main.rs | grep -A 20 "tauri::Builder"
```

**Step 2: 修改窗口配置**

找到窗口配置部分（通常在 `.run()` 之前），修改为：

```rust
.setup(|app| {
    let main_window = tauri::WindowBuilder::new(
        app,
        "main",
        tauri::WindowUrl::App("index.html".into()),
    )
    .title("MeetKey Center")
    .inner_size(300.0, 150.0)  // 窗口大小
    .resizable(false)           // 不可调整大小（保持小窗口）
    .decorations(true)          // 保留标题栏和窗口装饰
    .always_on_top(false)       // 不置顶
    .skip_taskbar(false)        // 显示在任务栏
    .build()?;

    Ok(())
})
```

**Step 3: 启用窗口拖动和最小化**

在 Tauri 配置中（通常在 `tauri.conf.json`），确保：

```json
{
  "tauri": {
    "windows": [
      {
        "title": "MeetKey Center",
        "width": 300,
        "height": 150,
        "resizable": false,
        "fullscreen": false,
        "decorations": true
      }
    ]
  }
}
```

**Step 4: 验证编译**

```bash
cd packages/center
pnpm build  # 验证没有编译错误
```

**Step 5: 提交**

```bash
git add packages/center/src-tauri/src/main.rs packages/center/tauri.conf.json
git commit -m "config: set Center window to 300x150 with drag and minimize support"
```

---

## Task 3: 创建 Center Pinia 状态存储

**文件：**

- Create: `packages/center/src/stores/centerStore.ts`

**Step 1: 分析需要管理的状态**

```
CenterStore 应该管理：
- deviceState: { microphone: "on"|"off", camera: "on"|"off" }
- connectionState: { plugin: "connected"|"disconnected"|"initializing", browser: "connected"|"disconnected"|"initializing" }
```

**Step 2: 创建 store 文件**

```typescript
// packages/center/src/stores/centerStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type ConnectionStatus = 'connected' | 'disconnected' | 'initializing';
export type DeviceState = 'on' | 'off' | 'unknown';

export const useCenterStore = defineStore('center', () => {
  // 设备状态
  const microphone = ref<DeviceState>('unknown');
  const camera = ref<DeviceState>('unknown');

  // 连接状态
  const pluginConnection = ref<ConnectionStatus>('initializing');
  const browserConnection = ref<ConnectionStatus>('initializing');

  // 计算属性
  const isMicrophoneOn = computed(() => microphone.value === 'on');
  const isCameraOn = computed(() => camera.value === 'on');

  // 方法
  function setMicrophoneState(state: DeviceState) {
    microphone.value = state;
  }

  function setCameraState(state: DeviceState) {
    camera.value = state;
  }

  function setPluginConnection(status: ConnectionStatus) {
    pluginConnection.value = status;
  }

  function setBrowserConnection(status: ConnectionStatus) {
    browserConnection.value = status;
  }

  function toggleMicrophone() {
    // 发送命令到服务器，不直接修改状态
    // 状态由 WebSocket 消息更新
    return microphone.value === 'on' ? 'off' : 'on';
  }

  function toggleCamera() {
    return camera.value === 'on' ? 'off' : 'on';
  }

  return {
    microphone,
    camera,
    pluginConnection,
    browserConnection,
    isMicrophoneOn,
    isCameraOn,
    setMicrophoneState,
    setCameraState,
    setPluginConnection,
    setBrowserConnection,
    toggleMicrophone,
    toggleCamera,
  };
});
```

**Step 3: 验证导入路径**

确保 Pinia 已在 `packages/center/src/main.ts` 中配置

**Step 4: 提交**

```bash
git add packages/center/src/stores/centerStore.ts
git commit -m "feat: create centerStore for device and connection state management"
```

---

## Task 4: 创建按钮组件（MicrophoneButton）

**文件：**

- Create: `packages/center/src/components/MicrophoneButton.vue`

**Step 1: 设计按钮逻辑**

```
点击按钮：
1. 获取当前状态
2. 发送 toggle 命令到 WebSocket
3. 触发视觉反馈（按压效果）
4. 等待状态更新
```

**Step 2: 实现组件**

```vue
<!-- packages/center/src/components/MicrophoneButton.vue -->
<template>
  <button
    class="microphone-button"
    :class="{ active: isMicrophoneOn, pressed: isPressing }"
    @click="handleClick"
  >
    <span class="icon">{{ isMicrophoneOn ? '🔊' : '🔇' }}</span>
  </button>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useCenterStore } from '@/stores/centerStore';

  const store = useCenterStore();
  const isPressing = ref(false);

  const isMicrophoneOn = computed(() => store.isMicrophoneOn);

  async function handleClick() {
    // 视觉反馈：按压效果
    isPressing.value = true;
    setTimeout(() => {
      isPressing.value = false;
    }, 100);

    // 发送命令到 WebSocket
    const command = store.toggleMicrophone();

    // TODO: 发送到 WebSocket（在 Task 6 实现）
    console.log(`Toggle microphone to: ${command}`);
  }
</script>

<style scoped>
  .microphone-button {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    border: 2px solid #e5e7eb;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    transition: all 0.2s ease;
  }

  .microphone-button:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .microphone-button.pressed {
    background: #f3f4f6;
    transform: scale(0.95);
  }

  .microphone-button.active {
    background: #dbeafe;
    border-color: #3b82f6;
  }

  .icon {
    display: inline-block;
  }
</style>
```

**Step 3: 提交**

```bash
git add packages/center/src/components/MicrophoneButton.vue
git commit -m "feat: create MicrophoneButton component with toggle state and visual feedback"
```

---

## Task 5: 创建按钮组件（CameraButton）

**文件：**

- Create: `packages/center/src/components/CameraButton.vue`

**Step 1: 复制并修改 MicrophoneButton**

```vue
<!-- packages/center/src/components/CameraButton.vue -->
<template>
  <button
    class="camera-button"
    :class="{ active: isCameraOn, pressed: isPressing }"
    @click="handleClick"
  >
    <span class="icon">{{ isCameraOn ? '📹' : '📵' }}</span>
  </button>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useCenterStore } from '@/stores/centerStore';

  const store = useCenterStore();
  const isPressing = ref(false);

  const isCameraOn = computed(() => store.isCameraOn);

  async function handleClick() {
    isPressing.value = true;
    setTimeout(() => {
      isPressing.value = false;
    }, 100);

    const command = store.toggleCamera();
    console.log(`Toggle camera to: ${command}`);
  }
</script>

<style scoped>
  /* 与 MicrophoneButton 相同的样式 */
  .camera-button {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    border: 2px solid #e5e7eb;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    transition: all 0.2s ease;
  }

  .camera-button:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .camera-button.pressed {
    background: #f3f4f6;
    transform: scale(0.95);
  }

  .camera-button.active {
    background: #dbeafe;
    border-color: #3b82f6;
  }

  .icon {
    display: inline-block;
  }
</style>
```

**Step 2: 提交**

```bash
git add packages/center/src/components/CameraButton.vue
git commit -m "feat: create CameraButton component with toggle state and visual feedback"
```

---

## Task 6: 创建连接状态指示组件

**文件：**

- Create: `packages/center/src/components/ConnectionStatus.vue`

**Step 1: 实现组件**

```vue
<!-- packages/center/src/components/ConnectionStatus.vue -->
<template>
  <div class="connection-status">
    <!-- Browser Extension -->
    <div class="status-item">
      <span class="icon">🌐</span>
      <span class="dot" :class="browserStatusClass"></span>
    </div>

    <!-- Stream Deck Plugin -->
    <div class="status-item">
      <span class="icon">🎮</span>
      <span class="dot" :class="pluginStatusClass"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { useCenterStore } from '@/stores/centerStore';

  const store = useCenterStore();

  const browserStatusClass = computed(() => {
    switch (store.browserConnection) {
      case 'connected':
        return 'connected';
      case 'disconnected':
        return 'disconnected';
      case 'initializing':
        return 'initializing';
      default:
        return 'initializing';
    }
  });

  const pluginStatusClass = computed(() => {
    switch (store.pluginConnection) {
      case 'connected':
        return 'connected';
      case 'disconnected':
        return 'disconnected';
      case 'initializing':
        return 'initializing';
      default:
        return 'initializing';
    }
  });
</script>

<style scoped>
  .connection-status {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .icon {
    font-size: 16px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: background-color 0.2s ease;
  }

  .dot.connected {
    background-color: #10b981; /* green */
  }

  .dot.disconnected {
    background-color: #ef4444; /* red */
  }

  .dot.initializing {
    background-color: #9ca3af; /* gray */
  }
</style>
```

**Step 2: 提交**

```bash
git add packages/center/src/components/ConnectionStatus.vue
git commit -m "feat: create ConnectionStatus component with browser and plugin indicators"
```

---

## Task 7: 创建主应用容器组件

**文件：**

- Modify: `packages/center/src/App.vue`

**Step 1: 实现主应用布局**

```vue
<!-- packages/center/src/App.vue -->
<template>
  <div class="center-app">
    <!-- 标题 -->
    <div class="header">
      <h1>MeetKey Center</h1>
    </div>

    <!-- 按钮容器 -->
    <div class="buttons-container">
      <MicrophoneButton />
      <CameraButton />
    </div>

    <!-- 连接状态 -->
    <ConnectionStatus />
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue';
  import MicrophoneButton from '@/components/MicrophoneButton.vue';
  import CameraButton from '@/components/CameraButton.vue';
  import ConnectionStatus from '@/components/ConnectionStatus.vue';
  import { useCenterStore } from '@/stores/centerStore';

  const store = useCenterStore();

  // 初始化时设置连接状态为 initializing
  onMounted(() => {
    // TODO: WebSocket 连接逻辑在 Task 8 实现
    console.log('Center app mounted');
  });
</script>

<style scoped>
  .center-app {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 12px;
    background: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    margin: 0;
    padding: 0 0 8px 0;
  }

  .header h1 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
  }

  .buttons-container {
    display: flex;
    gap: 12px;
    justify-content: center;
    padding: 12px 0;
    flex: 1;
    align-items: center;
  }

  /* 使用 Tailwind 的话 */
  :global {
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  }
</style>
```

**Step 2: 验证组件导入**

确保 `packages/center/src/main.ts` 中有 Pinia 配置：

```typescript
import { createPinia } from 'pinia';

app.use(createPinia());
```

**Step 3: 提交**

```bash
git add packages/center/src/App.vue
git commit -m "feat: create Center app main layout with buttons and connection status"
```

---

## Task 8: 实现 WebSocket 连接和消息处理

**文件：**

- Create: `packages/center/src/services/websocketService.ts`

**Step 1: 创建 WebSocket 服务**

```typescript
// packages/center/src/services/websocketService.ts
import { useCenterStore } from '@/stores/centerStore';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(url: string = 'ws://127.0.0.1:8080') {
    this.url = url;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }

  private handleOpen() {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    // 发送初始化消息
    this.send({ type: 'init', client: 'center' });
  }

  private handleMessage(event: MessageEvent) {
    const store = useCenterStore();
    const message = JSON.parse(event.data);

    console.log('Received message:', message);

    switch (message.type) {
      case 'state-update':
        if (message.state.microphone !== undefined) {
          store.setMicrophoneState(message.state.microphone === 'on' ? 'on' : 'off');
        }
        if (message.state.camera !== undefined) {
          store.setCameraState(message.state.camera === 'on' ? 'on' : 'off');
        }
        break;

      case 'plugin-connected':
        store.setPluginConnection('connected');
        break;

      case 'plugin-disconnected':
        store.setPluginConnection('disconnected');
        break;

      case 'browser-connected':
        store.setBrowserConnection('connected');
        break;

      case 'browser-disconnected':
        store.setBrowserConnection('disconnected');
        break;
    }
  }

  private handleError(error: Event) {
    console.error('WebSocket error:', error);
  }

  private handleClose() {
    console.log('WebSocket closed, attempting to reconnect...');
    const store = useCenterStore();

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    } else {
      store.setBrowserConnection('disconnected');
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  toggleMicrophone() {
    this.send({
      type: 'action',
      action: 'toggle-microphone',
    });
  }

  toggleCamera() {
    this.send({
      type: 'action',
      action: 'toggle-camera',
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new WebSocketService();
```

**Step 2: 在 main.ts 中初始化连接**

修改 `packages/center/src/main.ts`：

```typescript
import { wsService } from '@/services/websocketService';

// ... 其他代码 ...

app.mount('#app');

// 连接 WebSocket
wsService.connect();
```

**Step 3: 提交**

```bash
git add packages/center/src/services/websocketService.ts packages/center/src/main.ts
git commit -m "feat: implement WebSocket service for state sync and action commands"
```

---

## Task 9: 连接按钮到 WebSocket 命令

**文件：**

- Modify: `packages/center/src/components/MicrophoneButton.vue`
- Modify: `packages/center/src/components/CameraButton.vue`

**Step 1: 更新 MicrophoneButton**

```vue
<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useCenterStore } from '@/stores/centerStore';
  import { wsService } from '@/services/websocketService';

  const store = useCenterStore();
  const isPressing = ref(false);

  const isMicrophoneOn = computed(() => store.isMicrophoneOn);

  async function handleClick() {
    isPressing.value = true;
    setTimeout(() => {
      isPressing.value = false;
    }, 100);

    // 发送命令到 WebSocket
    wsService.toggleMicrophone();
  }
</script>
```

**Step 2: 更新 CameraButton**

```vue
<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useCenterStore } from '@/stores/centerStore';
  import { wsService } from '@/services/websocketService';

  const store = useCenterStore();
  const isPressing = ref(false);

  const isCameraOn = computed(() => store.isCameraOn);

  async function handleClick() {
    isPressing.value = true;
    setTimeout(() => {
      isPressing.value = false;
    }, 100);

    // 发送命令到 WebSocket
    wsService.toggleCamera();
  }
</script>
```

**Step 3: 提交**

```bash
git add packages/center/src/components/MicrophoneButton.vue packages/center/src/components/CameraButton.vue
git commit -m "feat: connect buttons to WebSocket service for sending toggle commands"
```

---

## Task 10: 改进样式和响应式设计

**文件：**

- Modify: `packages/center/src/App.vue`
- Modify: `packages/center/src/components/MicrophoneButton.vue`
- Modify: `packages/center/src/components/CameraButton.vue`
- Modify: `packages/center/src/components/ConnectionStatus.vue`

**Step 1: 优化 App.vue 样式**

```vue
<style scoped>
  .center-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    padding: 10px;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
    box-shadow: inset 0 0 0 1px #e5e7eb;
  }

  .header {
    flex-shrink: 0;
    padding: 0 0 4px 0;
    user-select: none;
    -webkit-user-select: none;
  }

  .header h1 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .buttons-container {
    display: flex;
    gap: 10px;
    justify-content: center;
    align-items: center;
    flex: 1;
    min-height: 0;
  }
</style>
```

**Step 2: 完善按钮样式**

确保两个按钮组件的样式一致，添加更多视觉反馈：

```vue
<style scoped>
  .microphone-button,
  .camera-button {
    width: 55px;
    height: 55px;
    border-radius: 10px;
    border: 2px solid #e5e7eb;
    background: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    outline: none;
    -webkit-app-region: no-drag; /* 允许点击 */
  }

  .microphone-button:hover,
  .camera-button:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .microphone-button.pressed,
  .camera-button.pressed {
    background: #eff6ff;
    border-color: #93c5fd;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    transform: scale(0.95);
  }

  .microphone-button.active,
  .camera-button.active {
    background: #dbeafe;
    border-color: #60a5fa;
    color: #1e40af;
  }

  .icon {
    display: inline-block;
    line-height: 1;
  }
</style>
```

**Step 3: 优化连接状态样式**

```vue
<style scoped>
  .connection-status {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding: 6px 0 0 0;
    border-top: 1px solid #e5e7eb;
    flex-shrink: 0;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .icon {
    font-size: 14px;
    opacity: 0.8;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    transition:
      background-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .dot.connected {
    background-color: #10b981;
    box-shadow: 0 0 4px rgba(16, 185, 129, 0.5);
  }

  .dot.disconnected {
    background-color: #ef4444;
  }

  .dot.initializing {
    background-color: #9ca3af;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
```

**Step 4: 全局样式微调**

修改 `packages/center/src/main.css` 或 `packages/center/src/App.vue` 的全局样式：

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #ffffff;
}

#app {
  width: 100vw;
  height: 100vh;
}
```

**Step 5: 提交**

```bash
git add packages/center/src/App.vue packages/center/src/components/*.vue packages/center/src/main.css
git commit -m "style: polish Center UI with improved button feedback and responsive layout"
```

---

## Task 11: 测试 UI 功能（手动测试检查清单）

**文件：**

- Test: 手动验证

**验收清单：**

- [ ] 窗口大小为 300x150，不可调整
- [ ] 窗口标题栏可拖动
- [ ] 窗口可最小化到任务栏
- [ ] 窗口关闭按钮能正确关闭应用
- [ ] 麦克风按钮显示正确图标（🔊 或 🔇）
- [ ] 摄像头按钮显示正确图标（📹 或 📵）
- [ ] 按钮点击时有按压视觉反馈（缩放和颜色变化）
- [ ] 按钮点击时发送 WebSocket 消息（查看浏览器控制台）
- [ ] 连接状态点颜色正确：
  - [ ] 绿色 = 连接
  - [ ] 红色 = 断开
  - [ ] 灰色 = 未初始化
- [ ] 连接状态点初始化时为灰色
- [ ] WebSocket 消息接收后，按钮和状态指示器实时更新

**Step 1: 构建应用**

```bash
cd packages/center
pnpm build
```

**Step 2: 运行应用（开发模式）**

```bash
cd packages/center
pnpm dev
```

**Step 3: 手动测试**

1. 检查窗口大小和位置
2. 点击按钮，观察视觉反馈
3. 查看浏览器开发者工具控制台，确认消息被发送
4. 验证连接状态指示器颜色

**Step 4: 提交**

```bash
git add .
git commit -m "test: manual verification of Center UI functionality"
```

---

## Task 12: 集成 @meetkey/shared 消息类型（可选但推荐）

**文件：**

- Modify: `packages/center/src/services/websocketService.ts`

**Step 1: 验证 @meetkey/shared 中的消息类型**

检查 `packages/shared/src/types/index.ts`，确保有以下类型定义：

```typescript
export type ActionMessage = {
  type: 'action';
  action: string;
  [key: string]: any;
};

export type StateUpdateMessage = {
  type: 'state-update';
  state: {
    microphone?: 'on' | 'off';
    camera?: 'on' | 'off';
  };
};
```

**Step 2: 在 websocketService 中使用类型**

```typescript
import { ActionMessage, StateUpdateMessage } from '@meetkey/shared'

// ...

send(message: ActionMessage | StateUpdateMessage | any) {
  // ...
}

toggleMicrophone() {
  const message: ActionMessage = {
    type: 'action',
    action: 'toggle-microphone',
  }
  this.send(message)
}
```

**Step 3: 提交**

```bash
git add packages/center/src/services/websocketService.ts
git commit -m "feat: use @meetkey/shared types in WebSocket service"
```

---

## 总结

完成所有任务后，MeetKey Center UI 将具备：

✅ 300x150 小窗口，可拖动和最小化
✅ 两个大按钮（麦克风和摄像头）显示当前状态
✅ 按钮点击有视觉反馈（按压效果）
✅ 底部连接状态指示器（浏览器和 Stream Deck，彩色点）
✅ WebSocket 连接和状态实时同步
✅ 完整的 Pinia 状态管理
✅ 清晰的组件结构和样式

---

## 后续工作

- 实现 Rust 后端的 WebSocket 服务器消息处理逻辑
- 实现 Browser Extension 连接和状态推送
- 实现全局热键绑定（Task 13+）
- 添加配置面板（第二阶段）
