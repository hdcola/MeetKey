<script setup lang="ts">
import MicrophoneButton from '@/components/MicrophoneButton.vue'
import CameraButton from '@/components/CameraButton.vue'
import ConnectionStatus from '@/components/ConnectionStatus.vue'
// WebSocket connection initialized in main.ts

</script>

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

<style scoped>
.center-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 12px 14px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue',
    sans-serif;
}

.header {
  flex-shrink: 0;
  padding: 0 0 8px 0;
  user-select: none;
  -webkit-user-select: none;
}

.header h1 {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: #4b5563;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.buttons-container {
  display: flex;
  gap: 14px;
  justify-content: center;
  align-items: center;
  flex: 1;
  min-height: 0;
  padding: 4px 0;
}
</style>
