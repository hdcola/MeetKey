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
  height: 100vh;
  width: 100%;
  padding: 10px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue',
    sans-serif;
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
