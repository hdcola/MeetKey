import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ConnectionStatus = 'connected' | 'disconnected' | 'initializing'
export type DeviceState = 'on' | 'off' | 'unknown'

export const useCenterStore = defineStore('center', () => {
  // 设备状态
  const microphone = ref<DeviceState>('unknown')
  const camera = ref<DeviceState>('unknown')

  // 连接状态
  const pluginConnection = ref<ConnectionStatus>('initializing')
  const browserConnection = ref<ConnectionStatus>('initializing')

  // 计算属性
  const isMicrophoneOn = computed(() => microphone.value === 'on')
  const isCameraOn = computed(() => camera.value === 'on')

  // 方法
  function setMicrophoneState(state: DeviceState) {
    microphone.value = state
  }

  function setCameraState(state: DeviceState) {
    camera.value = state
  }

  function setPluginConnection(status: ConnectionStatus) {
    pluginConnection.value = status
  }

  function setBrowserConnection(status: ConnectionStatus) {
    browserConnection.value = status
  }

  function toggleMicrophone() {
    return microphone.value === 'on' ? 'off' : 'on'
  }

  function toggleCamera() {
    return camera.value === 'on' ? 'off' : 'on'
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
  }
})
