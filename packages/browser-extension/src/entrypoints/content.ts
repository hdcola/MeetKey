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
  return (
    micButton.getAttribute('aria-pressed') === 'true' ||
    micButton.querySelector('[aria-label*="muted"]') !== null
  );
}

function isCameraOff(): boolean {
  const cameraButton = findCameraButton();
  if (!cameraButton) return false;
  // Check if button has "off" indicator
  return (
    cameraButton.getAttribute('aria-pressed') === 'true' ||
    cameraButton.querySelector('[aria-label*="off"]') !== null
  );
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
