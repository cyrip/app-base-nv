import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../modules/landing/views/Landing.vue'
import Login from '../modules/auth/views/Login.vue'
import UserManagement from '../modules/users/views/UserManagement.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'landing',
            component: Landing
        },
        {
            path: '/login',
            name: 'login',
            component: Login
        },
        {
            path: '/users',
            name: 'users',
            component: UserManagement
        }
    ]
})

export default router
