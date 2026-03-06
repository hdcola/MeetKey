# MeetKey MVP 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 MeetKey MVP —— 通过 Stream Dock 硬件按钮和系统工具栏快速控制 Google Meet（麦克风和摄像头开关）

**Architecture:** 
- @meetkey/shared 定义通信协议
- @meetkey/service (Tauri) 中心服务器，维护状态，实时推送给 Plugin 和 Extension
- @meetkey/browser-extension 注入脚本控制 Google Meet，报告状态给服务
- @meetkey/plugin Stream Deck 硬件按钮，接收命令并显示状态
- WebSocket 实时双向通信（方案 C - 推送模型）

**Tech Stack:** 
- TypeScript + Vue 3 + Tauri (Rust) + WXT + Vite
- WebSocket + JSON 通信协议
- 国际化：i18n (中文 + 英文)

---

## 第一阶段：基础通信协议 (@meetkey/shared)

### Task 1: 定义 WebSocket 消息类型

**文件：**
- Modify: `packages/shared/src/types/index.ts`

**Step 1: 更新 types/index.ts - 添加 MeetKey 特定类型**

打开 `packages/shared/src/types/index.ts`，替换内容为：

```typescript
/**
 * WebSocket 消息类型定义
 */

// 基础消息类型
export type MessageType = 
  | 'command'
  | 'state-update'
  | 'state-query'
  | 'state-response'
  | 'error'
  | 'ping'
  | 'pong';

export interface WebSocketMessage {
  id: string;
  type: MessageType;
  timestamp: number;
  payload?: unknown;
}

// MeetKey 特定类型
export type MeetDeviceType = 'microphone' | 'camera';
export type MeetDeviceState = 'on' | 'off' | 'unknown';
export type MeetCommandAction = 'turn-on' | 'turn-off' | 'toggle';

export interface MeetDeviceStatus {
  microphone: MeetDeviceState;
  camera: MeetDeviceState;
  lastUpdated: number;
}

// Command Message - Plugin 或 Service 向 Extension 发送命令
export interface CommandMessage extends WebSocketMessage {
  type: 'command';
  payload: {
    device: MeetDeviceType;
    action: MeetCommandAction;
  };
}

// State Update Message - Extension 向 Service 报告状态变化
export interface StateUpdateMessage extends WebSocketMessage {
  type: 'state-update';
  payload: MeetDeviceStatus;
}

// State Query Message - Plugin 或其他客户端查询当前状态
export interface StateQueryMessage extends WebSocketMessage {
  type: 'state-query';
  payload: {
    requestId: string;
  };
}

// State Response Message - Service 回复当前状态
export interface StateResponseMessage extends WebSocketMessage {
  type: 'state-response';
  payload: {
    requestId: string;
    state: MeetDeviceStatus;
  };
}

// Error Message
export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}
```

**Step 2: 验证文件**

```bash
cat packages/shared/src/types/index.ts | head -30
```

Expected: 输出 TypeScript 类型定义，第一行是 `/**`

**Step 3: 提交**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: add MeetKey WebSocket message types"
```

Expected: 提交成功

---

### Task 2: 创建消息构建器

**文件：**
- Modify: `packages/shared/src/protocol/index.ts`

**Step 1: 更新 protocol/index.ts - 创建消息构建器**

打开 `packages/shared/src/protocol/index.ts`，替换内容为：

```typescript
/**
 * WebSocket 通信协议 - 消息构建器和验证
 */

import type {
  WebSocketMessage,
  CommandMessage,
  StateUpdateMessage,
  StateQueryMessage,
  StateResponseMessage,
  ErrorMessage,
  MeetDeviceType,
  MeetCommandAction,
  MeetDeviceStatus,
} from '../types/index.js';

import { v4 as uuidv4 } from 'uuid';

/**
 * 消息构建器 - 创建规范的 WebSocket 消息
 */
export class MessageBuilder {
  /**
   * 创建设备控制命令
   * @param device 设备类型 ('microphone' | 'camera')
   * @param action 操作 ('turn-on' | 'turn-off' | 'toggle')
   */
  static createCommandMessage(
    device: MeetDeviceType,
    action: MeetCommandAction
  ): CommandMessage {
    return {
      id: uuidv4(),
      type: 'command',
      timestamp: Date.now(),
      payload: {
        device,
        action,
      },
    };
  }

  /**
   * 报告设备状态变化
   */
  static createStateUpdateMessage(status: MeetDeviceStatus): StateUpdateMessage {
    return {
      id: uuidv4(),
      type: 'state-update',
      timestamp: Date.now(),
      payload: status,
    };
  }

  /**
   * 查询当前设备状态
   */
  static createStateQueryMessage(): StateQueryMessage {
    const requestId = uuidv4();
    return {
      id: uuidv4(),
      type: 'state-query',
      timestamp: Date.now(),
      payload: {
        requestId,
      },
    };
  }

  /**
   * 回复设备状态查询
   */
  static createStateResponseMessage(
    requestId: string,
    state: MeetDeviceStatus
  ): StateResponseMessage {
    return {
      id: uuidv4(),
      type: 'state-response',
      timestamp: Date.now(),
      payload: {
        requestId,
        state,
      },
    };
  }

  /**
   * 创建错误消息
   */
  static createErrorMessage(code: string, message: string): ErrorMessage {
    return {
      id: uuidv4(),
      type: 'error',
      timestamp: Date.now(),
      payload: {
        code,
        message,
      },
    };
  }
}

/**
 * 消息验证器
 */
export function isValidMessage(data: unknown): data is WebSocketMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return (
    typeof msg.id === 'string' &&
    typeof msg.type === 'string' &&
    typeof msg.timestamp === 'number'
  );
}

export function isCommandMessage(msg: WebSocketMessage): msg is CommandMessage {
  return msg.type === 'command' && msg.payload && typeof msg.payload === 'object';
}

export function isStateUpdateMessage(msg: WebSocketMessage): msg is StateUpdateMessage {
  return msg.type === 'state-update' && msg.payload && typeof msg.payload === 'object';
}

export function isStateQueryMessage(msg: WebSocketMessage): msg is StateQueryMessage {
  return msg.type === 'state-query' && msg.payload && typeof msg.payload === 'object';
}

export function isStateResponseMessage(msg: WebSocketMessage): msg is StateResponseMessage {
  return msg.type === 'state-response' && msg.payload && typeof msg.payload === 'object';
}

export function isErrorMessage(msg: WebSocketMessage): msg is ErrorMessage {
  return msg.type === 'error' && msg.payload && typeof msg.payload === 'object';
}
```

**Step 2: 安装 uuid 依赖**

```bash
cd packages/shared
pnpm add uuid
pnpm add -D @types/uuid
```

Expected: 依赖安装成功

**Step 3: 验证文件**

```bash
cat packages/shared/src/protocol/index.ts | grep "export class"
```

Expected: 输出 `export class MessageBuilder`

**Step 4: 提交**

```bash
git add packages/shared/src/protocol/index.ts packages/shared/package.json
git commit -m "feat: add WebSocket message builder and validators"
```

Expected: 提交成功

---

### Task 3: 更新 shared 索引文件

**文件：**
- Modify: `packages/shared/src/index.ts`

**Step 1: 更新索引导出**

打开 `packages/shared/src/index.ts`，替换内容为：

```typescript
/**
 * @meetkey/shared - Shared types, protocols, and utilities
 */

// Type definitions
export * from './types/index.js';

// Protocol builders and validators
export * from './protocol/index.js';

// Re-export commonly used builders
export { MessageBuilder } from './protocol/index.js';
```

**Step 2: 验证文件**

```bash
cat packages/shared/src/index.ts
```

Expected: 显示导出语句

**Step 3: 提交**

```bash
git add packages/shared/src/index.ts
git commit -m "feat: update shared package exports"
```

Expected: 提交成功

---

## 第二阶段：Tauri Service - WebSocket 服务器

### Task 4: 创建 Rust WebSocket 服务器基础

**文件：**
- Create: `packages/service/src-tauri/src/websocket.rs`
- Modify: `packages/service/src-tauri/Cargo.toml`

**Step 1: 更新 Cargo.toml - 添加 WebSocket 依赖**

打开 `packages/service/src-tauri/Cargo.toml`，在 `[dependencies]` 部分添加：

```toml
[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
tokio-tungstenite = "0.20"
uuid = { version = "1", features = ["v4", "serde"] }
tracing = "0.1"
tracing-subscriber = "0.3"
```

**Step 2: 创建 WebSocket 服务器实现**

创建 `packages/service/src-tauri/src/websocket.rs`：

```rust
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::accept_async;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeetDeviceStatus {
    pub microphone: String, // "on", "off", "unknown"
    pub camera: String,
    pub last_updated: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketMessage {
    pub id: String,
    pub r#type: String, // "command", "state-update", etc.
    pub timestamp: u64,
    pub payload: Option<serde_json::Value>,
}

pub struct WebSocketServer {
    addr: String,
    current_state: Arc<Mutex<MeetDeviceStatus>>,
    broadcast_tx: broadcast::Sender<WebSocketMessage>,
}

impl WebSocketServer {
    pub fn new(port: u16) -> Self {
        let addr = format!("127.0.0.1:{}", port);
        let (broadcast_tx, _) = broadcast::channel(100);
        
        WebSocketServer {
            addr,
            current_state: Arc::new(Mutex::new(MeetDeviceStatus {
                microphone: "unknown".to_string(),
                camera: "unknown".to_string(),
                last_updated: 0,
            })),
            broadcast_tx,
        }
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(&self.addr).await?;
        println!("WebSocket server listening on: {}", self.addr);

        loop {
            let (stream, peer_addr) = listener.accept().await?;
            println!("New connection from: {}", peer_addr);

            let state = Arc::clone(&self.current_state);
            let broadcast_tx = self.broadcast_tx.clone();

            tokio::spawn(async move {
                if let Err(e) = handle_connection(stream, state, broadcast_tx).await {
                    eprintln!("Error handling connection: {}", e);
                }
            });
        }
    }

    pub fn update_state(&self, status: MeetDeviceStatus) {
        if let Ok(mut state) = self.current_state.lock() {
            *state = status.clone();
        }
    }

    pub fn get_state(&self) -> MeetDeviceStatus {
        self.current_state.lock().unwrap().clone()
    }
}

async fn handle_connection(
    stream: TcpStream,
    state: Arc<Mutex<MeetDeviceStatus>>,
    broadcast_tx: broadcast::Sender<WebSocketMessage>,
) -> Result<(), Box<dyn std::error::Error>> {
    let ws_stream = accept_async(stream).await?;
    let (write, mut read) = ws_stream.split();
    
    let mut broadcast_rx = broadcast_tx.subscribe();

    // Handle incoming messages
    loop {
        tokio::select! {
            msg = read.next() => {
                match msg {
                    Some(Ok(tungstenite::Message::Text(text))) => {
                        if let Ok(message) = serde_json::from_str::<WebSocketMessage>(&text) {
                            match message.r#type.as_str() {
                                "state-update" => {
                                    // Update server state
                                    if let Some(payload) = &message.payload {
                                        if let Ok(status) = serde_json::from_value::<MeetDeviceStatus>(payload.clone()) {
                                            if let Ok(mut s) = state.lock() {
                                                *s = status;
                                            }
                                        }
                                    }
                                    // Broadcast state update to all clients
                                    let _ = broadcast_tx.send(message);
                                }
                                _ => {
                                    // Echo other message types
                                    let _ = broadcast_tx.send(message);
                                }
                            }
                        }
                    }
                    Some(Ok(tungstenite::Message::Close(_))) => {
                        println!("Connection closed");
                        break;
                    }
                    Some(Err(e)) => {
                        eprintln!("WebSocket error: {}", e);
                        break;
                    }
                    None => break,
                }
            }
            _ = broadcast_rx.recv() => {
                // Forward broadcast messages to client
            }
        }
    }

    Ok(())
}
```

**Step 3: 验证 Cargo.toml 更新**

```bash
cat packages/service/src-tauri/Cargo.toml | grep tokio-tungstenite
```

Expected: 显示 `tokio-tungstenite = "0.20"`

**Step 4: 验证文件创建**

```bash
ls -la packages/service/src-tauri/src/websocket.rs
```

Expected: 文件存在

**Step 5: 提交**

```bash
git add packages/service/src-tauri/Cargo.toml packages/service/src-tauri/src/websocket.rs
git commit -m "feat: add Rust WebSocket server implementation"
```

Expected: 提交成功

---

### Task 5: 创建 Service 主程序 - 启动 WebSocket 服务

**文件：**
- Modify: `packages/service/src-tauri/src/main.rs`

**Step 1: 更新 main.rs - 启动 WebSocket 服务**

打开 `packages/service/src-tauri/src/main.rs`，替换内容为：

```rust
// Prevents additional console window on Windows in release builds.
#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod websocket;

use websocket::WebSocketServer;
use std::sync::Arc;

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    // Start WebSocket server in background
    let ws_server = Arc::new(WebSocketServer::new(8080));
    let ws_clone = Arc::clone(&ws_server);
    
    tokio::spawn(async move {
        if let Err(e) = ws_clone.start().await {
            eprintln!("WebSocket server error: {}", e);
        }
    });

    // Start Tauri application
    tauri::Builder::default()
        .setup(|_app| {
            println!("Tauri application started");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 2: 验证文件**

```bash
cat packages/service/src-tauri/src/main.rs | head -20
```

Expected: 显示 mod websocket 和 async main

**Step 3: 提交**

```bash
git add packages/service/src-tauri/src/main.rs
git commit -m "feat: integrate WebSocket server into Tauri main application"
```

Expected: 提交成功

---

## 第三阶段：Browser Extension - Google Meet 控制

### Task 6: 创建 Browser Extension 内容脚本

**文件：**
- Create: `packages/browser-extension/src/entrypoints/content.ts`
- Create: `packages/browser-extension/src/entrypoints/background.ts`

**Step 1: 创建 content.ts - 注入到 Google Meet 页面**

创建 `packages/browser-extension/src/entrypoints/content.ts`：

```typescript
/**
 * Content Script - 注入到 Google Meet 页面
 * 执行媒体控制命令并报告状态
 */

import { MessageBuilder } from '@meetkey/shared';

// WebSocket 连接到本地 Tauri 服务
let ws: WebSocket | null = null;

function initWebSocket(port: number = 8080) {
  try {
    ws = new WebSocket(`ws://127.0.0.1:${port}`);
    
    ws.onopen = () => {
      console.log('[MeetKey] Connected to local service');
      // 连接时报告当前状态
      reportCurrentState();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (e) {
        console.error('[MeetKey] Failed to parse message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('[MeetKey] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[MeetKey] Disconnected from service, retrying in 5s...');
      setTimeout(() => initWebSocket(port), 5000);
    };
  } catch (e) {
    console.error('[MeetKey] Failed to initialize WebSocket:', e);
  }
}

function handleServerMessage(message: any) {
  if (!message.type) return;

  switch (message.type) {
    case 'command':
      executeCommand(message.payload);
      break;
    case 'state-query':
      reportCurrentState();
      break;
    default:
      console.log('[MeetKey] Unknown message type:', message.type);
  }
}

function executeCommand(payload: any) {
  const { device, action } = payload;
  console.log(`[MeetKey] Executing command: ${device} -> ${action}`);

  if (device === 'microphone') {
    handleMicrophoneCommand(action);
  } else if (device === 'camera') {
    handleCameraCommand(action);
  }
}

function handleMicrophoneCommand(action: string) {
  const micButton = findMicrophoneButton();
  if (!micButton) {
    console.warn('[MeetKey] Microphone button not found');
    return;
  }

  const isCurrentlyMuted = isMicrophoneMuted();

  if (action === 'turn-on' && isCurrentlyMuted) {
    micButton.click();
  } else if (action === 'turn-off' && !isCurrentlyMuted) {
    micButton.click();
  } else if (action === 'toggle') {
    micButton.click();
  }

  // Delay before reporting state
  setTimeout(() => reportCurrentState(), 500);
}

function handleCameraCommand(action: string) {
  const cameraButton = findCameraButton();
  if (!cameraButton) {
    console.warn('[MeetKey] Camera button not found');
    return;
  }

  const isCurrentlyOff = isCameraOff();

  if (action === 'turn-on' && isCurrentlyOff) {
    cameraButton.click();
  } else if (action === 'turn-off' && !isCurrentlyOff) {
    cameraButton.click();
  } else if (action === 'toggle') {
    cameraButton.click();
  }

  // Delay before reporting state
  setTimeout(() => reportCurrentState(), 500);
}

function findMicrophoneButton(): HTMLElement | null {
  // Google Meet 麦克风按钮通常带有特定的 aria-label
  const selectors = [
    'button[aria-label*="Mute"][aria-label*="microphone"], button[aria-label*="Turn off microphone"], button[aria-label*="Turn on microphone"]',
    'button[aria-label*="关闭麦克风"], button[aria-label*="打开麦克风"]',
  ];

  for (const selector of selectors) {
    const btn = document.querySelector(selector) as HTMLElement;
    if (btn) return btn;
  }

  return null;
}

function findCameraButton(): HTMLElement | null {
  // Google Meet 摄像头按钮通常带有特定的 aria-label
  const selectors = [
    'button[aria-label*="Turn off camera"], button[aria-label*="Turn on camera"]',
    'button[aria-label*="关闭摄像头"], button[aria-label*="打开摄像头"]',
  ];

  for (const selector of selectors) {
    const btn = document.querySelector(selector) as HTMLElement;
    if (btn) return btn;
  }

  return null;
}

function isMicrophoneMuted(): boolean {
  const micButton = findMicrophoneButton();
  if (!micButton) return false;
  // Check if button has "muted" indicator
  return micButton.getAttribute('aria-pressed') === 'true' ||
         micButton.querySelector('[aria-label*="muted"]') !== null;
}

function isCameraOff(): boolean {
  const cameraButton = findCameraButton();
  if (!cameraButton) return false;
  // Check if button has "off" indicator
  return cameraButton.getAttribute('aria-pressed') === 'true' ||
         cameraButton.querySelector('[aria-label*="off"]') !== null;
}

function reportCurrentState() {
  const microphone = isMicrophoneMuted() ? 'off' : 'on';
  const camera = isCameraOff() ? 'off' : 'on';

  const status = {
    microphone,
    camera,
    last_updated: Date.now(),
  };

  const message = MessageBuilder.createStateUpdateMessage(status);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    console.log('[MeetKey] State reported:', status);
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initWebSocket(8080);
  });
} else {
  initWebSocket(8080);
}

// Monitor for state changes and report periodically
setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    reportCurrentState();
  }
}, 2000);
```

**Step 2: 创建 background.ts - 后台脚本**

创建 `packages/browser-extension/src/entrypoints/background.ts`：

```typescript
/**
 * Background Script - 处理扩展事件和权限
 */

console.log('[MeetKey] Background script loaded');

// 监听扩展安装
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[MeetKey] Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // 打开欢迎页面
    chrome.tabs.create({ url: 'welcome.html' });
  }
});

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[MeetKey] Message received:', request);
  sendResponse({ status: 'ok' });
});
```

**Step 3: 验证文件创建**

```bash
ls -la packages/browser-extension/src/entrypoints/
```

Expected: 显示 `content.ts` 和 `background.ts`

**Step 4: 提交**

```bash
git add packages/browser-extension/src/entrypoints/content.ts packages/browser-extension/src/entrypoints/background.ts
git commit -m "feat: add content and background scripts for Google Meet control"
```

Expected: 提交成功

---

### Task 7: 更新 Browser Extension package.json - 添加依赖

**文件：**
- Modify: `packages/browser-extension/package.json`

**Step 1: 更新 browser-extension package.json**

打开 `packages/browser-extension/package.json`，确保包含以下依赖：

```json
{
  "name": "@meetkey/browser-extension",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "pack": "wxt build --zip"
  },
  "dependencies": {
    "@meetkey/shared": "workspace:*",
    "vue": "^3.4.21"
  },
  "devDependencies": {
    "wxt": "^0.20.4",
    "typescript": "workspace:*"
  }
}
```

**Step 2: 安装依赖**

```bash
cd packages/browser-extension
pnpm install
```

Expected: 依赖安装成功

**Step 3: 验证**

```bash
cat packages/browser-extension/package.json | grep '"@meetkey/shared"'
```

Expected: 显示 `"@meetkey/shared": "workspace:*"`

**Step 4: 提交**

```bash
git add packages/browser-extension/package.json
git commit -m "feat: configure browser-extension dependencies"
```

Expected: 提交成功

---

## 第四阶段：Stream Deck Plugin - 硬件按钮

### Task 8: 创建 Plugin 按钮组件

**文件：**
- Create: `packages/plugin/src/components/MicrophoneButton.vue`
- Create: `packages/plugin/src/components/CameraButton.vue`

**Step 1: 创建麦克风按钮组件**

创建 `packages/plugin/src/components/MicrophoneButton.vue`：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePluginStore } from '@/stores/plugin';

const props = defineProps<{
  mode: 'toggle' | 'on' | 'off';
}>();

const store = usePluginStore();
const isActive = ref(false);

onMounted(() => {
  // 订阅状态变化
  store.subscribeToState((state) => {
    isActive.value = state.microphone === 'on';
  });

  // 初始化状态
  isActive.value = store.currentState.microphone === 'on';
});

function handleClick() {
  const action = 
    props.mode === 'on' ? 'turn-on' :
    props.mode === 'off' ? 'turn-off' :
    'toggle';
  
  store.sendCommand('microphone', action);
}

const getIcon = () => {
  if (props.mode === 'toggle') {
    return isActive.value ? '🎤' : '🔇';
  }
  return '🎤';
};

const getLabel = () => {
  const base = {
    en: { toggle: 'Microphone', on: 'Turn On Mic', off: 'Turn Off Mic' },
    zh_CN: { toggle: '麦克风', on: '打开麦克风', off: '关闭麦克风' }
  };
  return base[store.language][props.mode];
};
</script>

<template>
  <button
    class="button"
    :class="{ active: isActive && mode === 'toggle' }"
    @click="handleClick"
  >
    <div class="icon">{{ getIcon() }}</div>
    <div class="label">{{ getLabel() }}</div>
  </button>
</template>

<style scoped>
.button {
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s;
}

.button:hover {
  background: #efefef;
  border-color: #999;
}

.button.active {
  background: #4CAF50;
  color: white;
  border-color: #388E3C;
}

.icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.label {
  font-size: 12px;
  font-weight: 500;
}
</style>
```

**Step 2: 创建摄像头按钮组件**

创建 `packages/plugin/src/components/CameraButton.vue`：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePluginStore } from '@/stores/plugin';

const props = defineProps<{
  mode: 'toggle' | 'on' | 'off';
}>();

const store = usePluginStore();
const isActive = ref(false);

onMounted(() => {
  // 订阅状态变化
  store.subscribeToState((state) => {
    isActive.value = state.camera === 'on';
  });

  // 初始化状态
  isActive.value = store.currentState.camera === 'on';
});

function handleClick() {
  const action = 
    props.mode === 'on' ? 'turn-on' :
    props.mode === 'off' ? 'turn-off' :
    'toggle';
  
  store.sendCommand('camera', action);
}

const getIcon = () => {
  if (props.mode === 'toggle') {
    return isActive.value ? '📷' : '📷‍🚫';
  }
  return '📷';
};

const getLabel = () => {
  const base = {
    en: { toggle: 'Camera', on: 'Turn On Camera', off: 'Turn Off Camera' },
    zh_CN: { toggle: '摄像头', on: '打开摄像头', off: '关闭摄像头' }
  };
  return base[store.language][props.mode];
};
</script>

<template>
  <button
    class="button"
    :class="{ active: isActive && mode === 'toggle' }"
    @click="handleClick"
  >
    <div class="icon">{{ getIcon() }}</div>
    <div class="label">{{ getLabel() }}</div>
  </button>
</template>

<style scoped>
.button {
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s;
}

.button:hover {
  background: #efefef;
  border-color: #999;
}

.button.active {
  background: #2196F3;
  color: white;
  border-color: #1565C0;
}

.icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.label {
  font-size: 12px;
  font-weight: 500;
}
</style>
```

**Step 3: 验证文件创建**

```bash
ls -la packages/plugin/src/components/
```

Expected: 显示两个按钮组件

**Step 4: 提交**

```bash
git add packages/plugin/src/components/MicrophoneButton.vue packages/plugin/src/components/CameraButton.vue
git commit -m "feat: add microphone and camera button components"
```

Expected: 提交成功

---

### Task 9: 创建 Plugin Pinia Store - 状态管理

**文件：**
- Create: `packages/plugin/src/stores/plugin.ts`

**Step 1: 创建 plugin store**

创建 `packages/plugin/src/stores/plugin.ts`：

```typescript
import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import type { MeetDeviceStatus } from '@meetkey/shared';
import { MessageBuilder } from '@meetkey/shared';

interface PluginState {
  microphone: 'on' | 'off' | 'unknown';
  camera: 'on' | 'off' | 'unknown';
  lastUpdated: number;
}

export const usePluginStore = defineStore('plugin', () => {
  // State
  const currentState = reactive<PluginState>({
    microphone: 'unknown',
    camera: 'unknown',
    lastUpdated: 0,
  });

  const language = ref<'en' | 'zh_CN'>('en');
  const isConnected = ref(false);
  let ws: WebSocket | null = null;
  const stateSubscribers: ((state: PluginState) => void)[] = [];

  // Initialize WebSocket
  function initWebSocket(port: number = 8080) {
    try {
      ws = new WebSocket(`ws://127.0.0.1:${port}`);

      ws.onopen = () => {
        isConnected.value = true;
        console.log('[Plugin] Connected to Tauri service');
        queryState();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('[Plugin] Failed to parse message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('[Plugin] WebSocket error:', error);
        isConnected.value = false;
      };

      ws.onclose = () => {
        console.log('[Plugin] Disconnected from service, retrying in 5s...');
        isConnected.value = false;
        setTimeout(() => initWebSocket(port), 5000);
      };
    } catch (e) {
      console.error('[Plugin] Failed to initialize WebSocket:', e);
    }
  }

  function handleMessage(message: any) {
    if (message.type === 'state-update' || message.type === 'state-response') {
      const payload = message.payload;
      if (payload) {
        currentState.microphone = payload.microphone || currentState.microphone;
        currentState.camera = payload.camera || currentState.camera;
        currentState.lastUpdated = payload.last_updated || Date.now();
        
        // Notify subscribers
        stateSubscribers.forEach(cb => cb(currentState));
      }
    }
  }

  function sendCommand(device: 'microphone' | 'camera', action: 'turn-on' | 'turn-off' | 'toggle') {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[Plugin] WebSocket not connected');
      return;
    }

    const message = MessageBuilder.createCommandMessage(device, action);
    ws.send(JSON.stringify(message));
    console.log('[Plugin] Command sent:', message);
  }

  function queryState() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[Plugin] WebSocket not connected');
      return;
    }

    const message = MessageBuilder.createStateQueryMessage();
    ws.send(JSON.stringify(message));
  }

  function subscribeToState(callback: (state: PluginState) => void) {
    stateSubscribers.push(callback);
  }

  function setLanguage(lang: 'en' | 'zh_CN') {
    language.value = lang;
  }

  // Initialize on module load
  initWebSocket();

  return {
    currentState,
    isConnected,
    language,
    sendCommand,
    queryState,
    subscribeToState,
    setLanguage,
  };
});
```

**Step 2: 验证文件**

```bash
cat packages/plugin/src/stores/plugin.ts | grep "export const usePluginStore"
```

Expected: 显示 store 导出

**Step 3: 提交**

```bash
git add packages/plugin/src/stores/plugin.ts
git commit -m "feat: add plugin store for state management and WebSocket"
```

Expected: 提交成功

---

### Task 10: 更新 Plugin 主组件 - 显示按钮

**文件：**
- Create: `packages/plugin/src/plugin/index.vue`

**Step 1: 创建 plugin 主组件**

创建 `packages/plugin/src/plugin/index.vue`：

```vue
<script setup lang="ts">
import MicrophoneButton from '@/components/MicrophoneButton.vue';
import CameraButton from '@/components/CameraButton.vue';
import { usePluginStore } from '@/stores/plugin';

const store = usePluginStore();
</script>

<template>
  <div class="meetkey-plugin">
    <h2>MeetKey - Google Meet Control</h2>
    
    <div class="status" v-if="!store.isConnected">
      <span class="status-badge error">Disconnected</span>
      <p>Waiting for Tauri service...</p>
    </div>
    
    <div class="status" v-else>
      <span class="status-badge success">Connected</span>
    </div>

    <!-- Microphone Controls -->
    <section class="control-section">
      <h3>{{ store.language === 'zh_CN' ? '麦克风' : 'Microphone' }}</h3>
      <div class="button-group">
        <MicrophoneButton mode="on" />
        <MicrophoneButton mode="off" />
        <MicrophoneButton mode="toggle" />
      </div>
    </section>

    <!-- Camera Controls -->
    <section class="control-section">
      <h3>{{ store.language === 'zh_CN' ? '摄像头' : 'Camera' }}</h3>
      <div class="button-group">
        <CameraButton mode="on" />
        <CameraButton mode="off" />
        <CameraButton mode="toggle" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.meetkey-plugin {
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 600px;
}

h2 {
  margin-top: 0;
  color: #333;
}

.status {
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
  margin-right: 8px;
}

.status-badge.success {
  background: #4CAF50;
  color: white;
}

.status-badge.error {
  background: #f44336;
  color: white;
}

.control-section {
  margin-bottom: 24px;
}

.control-section h3 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #555;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
}

.button-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
</style>
```

**Step 2: 验证文件**

```bash
cat packages/plugin/src/plugin/index.vue | grep "<h2>"
```

Expected: 显示标题标签

**Step 3: 提交**

```bash
git add packages/plugin/src/plugin/index.vue
git commit -m "feat: create main plugin component with button controls"
```

Expected: 提交成功

---

## 第五阶段：整合和验证

### Task 11: 验证 TypeScript 编译和依赖

**Step 1: 在根目录安装所有依赖**

```bash
cd /Users/hd/work/prj/MeetKey
pnpm install
```

Expected: 所有包的依赖安装成功

**Step 2: 构建 shared 包**

```bash
cd packages/shared
pnpm build
```

Expected: `packages/shared/dist/` 目录生成，包含 `.js` 和 `.d.ts` 文件

**Step 3: 验证构建产物**

```bash
ls -la packages/shared/dist/
```

Expected: 显示 `index.js`, `types/index.js`, `protocol/index.js` 等文件

**Step 4: 验证 Plugin 可以引入 shared**

```bash
cd packages/plugin
cat package.json | grep '@meetkey/shared'
```

Expected: 显示 `"@meetkey/shared": "workspace:*"`

**Step 5: 提交**

```bash
git add pnpm-lock.yaml
git commit -m "feat: install dependencies for MVP packages"
```

Expected: 提交成功

---

### Task 12: 创建集成测试文档

**文件：**
- Create: `docs/plans/2026-03-05-meetkey-mvp-testing.md`

**Step 1: 创建测试文档**

创建 `docs/plans/2026-03-05-meetkey-mvp-testing.md`：

```markdown
# MeetKey MVP 集成测试指南

## 前置条件

1. ✅ 所有 4 个包已创建并配置
2. ✅ 依赖已安装
3. ✅ Rust 工具链已安装（用于 Tauri 编译）

## 测试场景

### 场景 1：Tauri Service 启动

**步骤：**
1. 编译 Tauri 应用
   ```bash
   cd packages/service/src-tauri
   cargo build
   ```

2. 验证 WebSocket 服务监听
   ```bash
   # 应该看到: "WebSocket server listening on: 127.0.0.1:8080"
   ```

**预期结果：** ✅ 服务在 8080 端口监听，无错误

---

### 场景 2：Browser Extension 注入和连接

**步骤：**
1. 加载 Chrome 扩展（开发模式）
2. 访问 Google Meet 页面
3. 打开浏览器控制台（F12）

**预期结果：** ✅ 控制台显示：
- `[MeetKey] Connected to local service`
- `[MeetKey] State reported: {microphone: ..., camera: ...}`

---

### 场景 3：Plugin 与 Service 通信

**步骤：**
1. 启动 Tauri Service
2. 打开 Plugin UI
3. 查看连接状态

**预期结果：** ✅ Plugin 显示 "Connected" 状态

---

### 场景 4：发送麦克风控制命令

**步骤：**
1. 确保 Google Meet 页面开放
2. Service 和 Extension 都已连接
3. Plugin 中点击"麦克风打开"按钮

**预期结果：** ✅
- Google Meet 的麦克风状态改变
- Plugin 的麦克风切换按钮状态更新
- 控制台显示：`[MeetKey] Command sent: ...`

---

### 场景 5：状态同步

**步骤：**
1. 在 Google Meet 网页中手动打开摄像头
2. 观察 Plugin 中的动态摄像头按钮

**预期结果：** ✅ Plugin 中的摄像头按钮状态在 500ms 内更新

---

## 故障排查

### 问题：Plugin 无法连接 Service

**解决：**
1. 确保 Tauri Service 在运行
2. 检查防火墙设置，允许本地回环连接
3. 查看浏览器控制台和 Tauri 后台日志

### 问题：Extension 无法找到 Meet 按钮

**解决：**
1. 检查 Google Meet 页面是否完全加载
2. 在控制台运行：`document.querySelectorAll('button[aria-label*="microphone"]')`
3. 更新选择器以匹配当前 Meet 版本

---

## 性能基准

| 操作 | 目标 | 实际 |
|------|------|------|
| 命令执行延迟 | < 200ms | - |
| 状态同步延迟 | < 500ms | - |
| Plugin 连接建立 | < 1s | - |
| Extension 初始化 | < 2s | - |
```

**Step 2: 提交**

```bash
git add docs/plans/2026-03-05-meetkey-mvp-testing.md
git commit -m "docs: add MVP integration testing guide"
```

Expected: 提交成功

---

## 验收标准

✅ **代码完整性**
- @meetkey/shared 定义了通信协议
- @meetkey/service 实现了 WebSocket 服务器
- @meetkey/browser-extension 可以注入脚本到 Google Meet
- @meetkey/plugin 提供了 6 个按钮（麦克风/摄像头 各 3 个）

✅ **通信完整性**
- Plugin ↔ Service ↔ Extension 双向通信
- 实时状态推送
- 命令执行反馈

✅ **版本控制**
- 所有代码已提交
- 提交信息清晰

---

## 下一步（第二阶段）

1. 完善 Tauri Service UI（macOS 工具栏、Windows 托盘）
2. 优化状态查询和同步机制
3. 添加配置面板（端口、自启动）
4. 端到端测试和调试

---

**计划保存于：** `docs/plans/2026-03-05-meetkey-mvp-implementation.md`  
**执行步骤：** 使用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development`
