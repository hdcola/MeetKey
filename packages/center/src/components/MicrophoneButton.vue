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
import { ref, computed } from 'vue'
import { useCenterStore } from '@/stores/centerStore'
import { wsService } from '@/services/websocketService'

const store = useCenterStore()
const isPressing = ref(false)

const isMicrophoneOn = computed(() => store.isMicrophoneOn)

function handleClick() {
  isPressing.value = true
  setTimeout(() => {
    isPressing.value = false
  }, 150)

  // Send command to WebSocket
  wsService.toggleMicrophone()
}
</script>

<style scoped>
.microphone-button {
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
  -webkit-app-region: no-drag;
}

.microphone-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.microphone-button.pressed {
  background: #eff6ff;
  border-color: #93c5fd;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  transform: scale(0.95);
}

.microphone-button.active {
  background: #dbeafe;
  border-color: #60a5fa;
  color: #1e40af;
}

.icon {
  display: inline-block;
  line-height: 1;
}
</style>
