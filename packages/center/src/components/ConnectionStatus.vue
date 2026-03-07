<template>
  <div class="connection-status">
    <!-- Browser Extension -->
    <div class="status-item" :class="browserStatusClass">
      <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" fill="currentColor"/>
        <path d="M12.5 7H11V13L16.25 15.85L17 14.62L12.5 11.8V7Z" fill="currentColor"/>
      </svg>
      <span class="label">Browser</span>
      <span class="indicator" :class="browserStatusClass"></span>
    </div>

    <!-- Stream Deck Plugin -->
    <div class="status-item" :class="pluginStatusClass">
      <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
        <rect x="10" y="5" width="3" height="3" fill="currentColor"/>
        <rect x="15" y="5" width="3" height="3" fill="currentColor"/>
        <rect x="5" y="10" width="3" height="3" fill="currentColor"/>
        <rect x="10" y="10" width="3" height="3" fill="currentColor"/>
        <rect x="15" y="10" width="3" height="3" fill="currentColor"/>
        <rect x="5" y="15" width="3" height="3" fill="currentColor"/>
        <rect x="10" y="15" width="3" height="3" fill="currentColor"/>
        <rect x="15" y="15" width="3" height="3" fill="currentColor"/>
      </svg>
      <span class="label">Plugin</span>
      <span class="indicator" :class="pluginStatusClass"></span>
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
  flex-shrink: 0;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  transition: all 0.2s ease;
}

.icon {
  width: 14px;
  height: 14px;
  opacity: 0.6;
  flex-shrink: 0;
  color: currentColor;
}

.label {
  font-weight: 500;
  font-size: 11px;
  letter-spacing: -0.1px;
}

.indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.status-item.connected {
  color: #059669;
}

.status-item.connected .indicator {
  background-color: #059669;
  box-shadow: 0 0 6px rgba(5, 150, 105, 0.5);
}

.status-item.disconnected {
  color: #6b7280;
}

.status-item.disconnected .indicator {
  background-color: #ef4444;
}

.status-item.initializing {
  color: #6b7280;
}

.status-item.initializing .indicator {
  background-color: #9ca3af;
  animation: pulse-indicator 2s infinite;
}

@keyframes pulse-indicator {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
