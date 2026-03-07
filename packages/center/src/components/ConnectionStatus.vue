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
import { computed } from 'vue'
import { useCenterStore } from '@/stores/centerStore'

const store = useCenterStore()

const browserStatusClass = computed(() => {
  switch (store.browserConnection) {
    case 'connected':
      return 'connected'
    case 'disconnected':
      return 'disconnected'
    case 'initializing':
      return 'initializing'
    default:
      return 'initializing'
  }
})

const pluginStatusClass = computed(() => {
  switch (store.pluginConnection) {
    case 'connected':
      return 'connected'
    case 'disconnected':
      return 'disconnected'
    case 'initializing':
      return 'initializing'
    default:
      return 'initializing'
  }
})
</script>

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
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
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
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
