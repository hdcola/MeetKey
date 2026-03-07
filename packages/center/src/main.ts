import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { wsService } from '@/services/websocketService'

const app = createApp(App)

app.use(createPinia())
app.mount('#app')

// Initialize WebSocket connection
wsService.connect()
