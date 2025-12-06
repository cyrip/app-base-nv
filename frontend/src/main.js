import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './style.css'
import { serviceContainer } from './services/serviceContainer'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

// Initialize service container
serviceContainer.init()

app.mount('#app')
