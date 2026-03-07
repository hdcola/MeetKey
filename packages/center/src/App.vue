<script setup lang="ts">
import MicrophoneButton from '@/components/MicrophoneButton.vue'
import CameraButton from '@/components/CameraButton.vue'
import ConnectionStatus from '@/components/ConnectionStatus.vue'
</script>

<template>
  <div class="app">
    <!-- Brand Header -->
    <header class="header">
      <div class="brand">
        <svg class="brand-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="7" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M10.5 12H20M18 10l2 2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h1 class="brand-name">MeetKey</h1>
      </div>
    </header>

    <!-- Main Controls -->
    <main class="controls-area">
      <div class="controls-grid">
        <MicrophoneButton />
        <CameraButton />
      </div>
    </main>

    <!-- Connection Status -->
    <footer class="footer">
      <ConnectionStatus />
    </footer>
  </div>
</template>

<style scoped>
:root {
  /* Color Palette - Professional & Business */
  --primary: #1f2937; /* Dark gray - Primary text */
  --primary-accent: #d97706; /* Amber/Gold - Brand accent */
  --success: #059669; /* Green - Connected */
  --danger: #dc2626; /* Red - Error */
  --neutral: #9ca3af; /* Gray - Inactive */
  --bg: #ffffff; /* White background */
  --bg-light: #f9fafb; /* Very light gray */
  --border: #e5e7eb; /* Light border */
}

.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #ffffff;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue',
    sans-serif;
}

/* Header */
.header {
  flex-shrink: 0;
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--border);
  background: #ffffff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-icon {
  width: 20px;
  height: 20px;
  color: #d97706;
  flex-shrink: 0;
}

.brand-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.2px;
}

/* Controls Area */
.controls-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 16px;
  overflow: hidden;
}

.controls-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  width: 100%;
}

/* Footer */
.footer {
  flex-shrink: 0;
  padding: 8px 16px 12px;
  border-top: 1px solid var(--border);
  background: #ffffff;
}
</style>
