import { defineStore } from 'pinia'
import axios from 'axios'
import { initSocket, disconnectSocket } from '../../../services/socket'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        token: localStorage.getItem('token') || null
    }),
    actions: {
        async login(email, password) {
            const response = await axios.post('http://localhost:3000/auth/login', {
                email,
                password
            })
            this.token = response.data.token
            this.user = response.data.user
            localStorage.setItem('token', this.token)
            localStorage.setItem('user', JSON.stringify(this.user))
            initSocket(this.token)
        },
        logout() {
            this.token = null
            this.user = null
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            disconnectSocket()
        }
    }
})
