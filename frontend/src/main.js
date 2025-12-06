import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { serviceContainer } from './services/serviceContainer'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Initialize service container
serviceContainer.init()

app.mount('#app')
