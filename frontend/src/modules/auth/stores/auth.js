import { defineStore } from 'pinia'
import axios from 'axios'
import { initSocket, disconnectSocket } from '../../../services/socket'
import i18n from '../../../i18n'
import { useModuleStore } from '../../modules/stores/modules'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        token: localStorage.getItem('token') || null
    }),
    getters: {
        permissionNames: (state) => {
            const roles = state.user?.Roles || [];
            const names = new Set();
            roles.forEach(r => (r.Permissions || []).forEach(p => names.add(p.name)));
            return Array.from(names);
        }
    },
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
            if (this.user?.Language?.code) {
                i18n.global.locale.value = this.user.Language.code
                localStorage.setItem('locale', this.user.Language.code)
            }
            initSocket(this.token)
            const moduleStore = useModuleStore()
            moduleStore.fetchModules()
        },
        async refreshProfile() {
            if (!this.token) return
            const res = await axios.get('http://localhost:3000/users/me', {
                headers: { Authorization: `Bearer ${this.token}` }
            })
            this.user = res.data
            localStorage.setItem('user', JSON.stringify(this.user))
        },
        setUser(user) {
            this.user = user
            localStorage.setItem('user', JSON.stringify(user))
        },
        logout() {
            this.token = null
            this.user = null
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            disconnectSocket()
            const moduleStore = useModuleStore()
            moduleStore.modules = []
        }
    }
})
