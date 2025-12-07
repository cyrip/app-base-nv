import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../modules/auth/stores/auth'
import Landing from '../modules/landing/views/Landing.vue'
import Login from '../modules/auth/views/Login.vue'
import UserManagement from '../modules/users/views/UserManagement.vue'
import RoleManagement from '../modules/admin/views/RoleManagement.vue'
import GroupManagement from '../modules/admin/views/GroupManagement.vue'
import PermissionManagement from '../modules/admin/views/PermissionManagement.vue'
import UserProfile from '../modules/profile/views/UserProfile.vue'
import Chat from '../modules/chat/views/Chat.vue'

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
            component: UserManagement,
            meta: { requiresAuth: true }
        },
        {
            path: '/roles',
            name: 'roles',
            component: RoleManagement,
            meta: { requiresAuth: true }
        },
        {
            path: '/groups',
            name: 'groups',
            component: GroupManagement,
            meta: { requiresAuth: true }
        },
        {
            path: '/permissions',
            name: 'permissions',
            component: PermissionManagement,
            meta: { requiresAuth: true }
        },
        {
            path: '/chat',
            name: 'chat',
            component: Chat,
            meta: { requiresAuth: true }
        },
        {
            path: '/profile',
            name: 'profile',
            component: UserProfile,
            meta: { requiresAuth: true }
        }
    ]
})

// Navigation guard to check authentication
router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

    if (requiresAuth && !authStore.token) {
        // Redirect to login if route requires auth and user is not authenticated
        next({ name: 'login', query: { redirect: to.fullPath } })
    } else if (to.name === 'login' && authStore.token) {
        // Redirect to chat if already logged in and trying to access login
        next({ name: 'chat' })
    } else {
        next()
    }
})

export default router
