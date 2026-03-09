<template>
  <div class="device-control">
    <div class="device-info">
      <span class="device-label">Camera</span>
      <span class="status-indicator" :class="{ active: isCameraOn }">
        {{ isCameraOn ? 'ON' : 'OFF' }}
      </span>
    </div>
    <button
      class="control-button"
      :class="{ active: isCameraOn, pressing: isPressing }"
      @click="handleClick"
      :title="isCameraOn ? 'Turn off camera' : 'Turn on camera'"
    >
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="15" height="12" rx="2" stroke="currentColor" stroke-width="1.5" />
        <circle cx="9.5" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M19 6L22 4V14L19 12"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useCenterStore } from '@/stores/centerStore';
  import { wsService } from '@/services/websocketService';

  const store = useCenterStore();
  const isPressing = ref(false);

  const isCameraOn = computed(() => store.isCameraOn);

  function handleClick() {
    isPressing.value = true;
    setTimeout(() => {
      isPressing.value = false;
    }, 150);
    wsService.toggleCamera();
  }
</script>

<style scoped>
  .device-control {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    max-width: 280px;
    padding: 12px 14px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .device-control:hover {
    border-color: #d97706;
    background: #fffbf0;
  }

  .device-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .device-label {
    font-size: 13px;
    font-weight: 600;
    color: #1f2937;
    letter-spacing: -0.2px;
  }

  .status-indicator {
    font-size: 11px;
    font-weight: 700;
    color: #6b7280;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    transition: all 0.2s ease;
  }

  .status-indicator.active {
    color: #059669;
  }

  .control-button {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    border: 2px solid transparent;
    background: #f3f4f6;
    color: #6b7280;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
    -webkit-app-region: no-drag;
  }

  .control-button:hover {
    background: #f0f1f3;
    color: #1f2937;
  }

  .control-button.active {
    background: #fef3c7;
    border-color: #d97706;
    color: #d97706;
  }

  .control-button.pressing {
    transform: scale(0.95);
    background: #d97706;
    border-color: #d97706;
    color: #ffffff;
  }

  .button-icon {
    width: 20px;
    height: 20px;
    color: inherit;
  }
</style>
