import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../modules/landing/views/Landing.vue'
import Login from '../modules/auth/views/Login.vue'
import UserManagement from '../modules/users/views/UserManagement.vue'
import RoleManagement from '../modules/admin/views/RoleManagement.vue'
import GroupManagement from '../modules/admin/views/GroupManagement.vue'
import PermissionManagement from '../modules/admin/views/PermissionManagement.vue'

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
        },
        {
            path: '/roles',
            name: 'roles',
            component: RoleManagement
        },
        {
            path: '/groups',
            name: 'groups',
            component: GroupManagement
        },
        {
            path: '/permissions',
            name: 'permissions',
            component: PermissionManagement
        }
    ]
})

export default router
