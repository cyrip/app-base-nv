import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../modules/landing/views/Landing.vue'
import Login from '../modules/auth/views/Login.vue'
import UserManagement from '../modules/users/views/UserManagement.vue'
import RoleManagement from '../modules/admin/views/RoleManagement.vue'
import GroupManagement from '../modules/admin/views/GroupManagement.vue'
import PermissionManagement from '../modules/admin/views/PermissionManagement.vue'
import UserProfile from '../modules/profile/views/UserProfile.vue'
import Chat from '../modules/chat/views/Chat.vue'
import ModuleAdmin from '../modules/moduleAdmin/views/ModuleAdmin.vue'
import ModuleDisabled from '../modules/moduleAdmin/views/ModuleDisabled.vue'
import ThemeManagement from '../modules/themes/views/ThemeManagement.vue'
import { useModuleStore } from '../modules/modules/stores/modules'
import { useAuthStore } from '../modules/auth/stores/auth'
import { useAuthGuard } from './moduleGuard'

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
            meta: { moduleKey: 'users' }
        },
        {
            path: '/roles',
            name: 'roles',
            component: RoleManagement,
            meta: { moduleKey: 'roles' }
        },
        {
            path: '/groups',
            name: 'groups',
            component: GroupManagement,
            meta: { moduleKey: 'groups' }
        },
        {
            path: '/permissions',
            name: 'permissions',
            component: PermissionManagement,
            meta: { moduleKey: 'permissions' }
        },
        {
            path: '/modules',
            name: 'modules',
            component: ModuleAdmin,
            meta: { moduleKey: 'modules' }
        },
        {
            path: '/themes',
            name: 'themes',
            component: ThemeManagement,
            meta: { moduleKey: 'themes' }
        },
        {
            path: '/chat',
            name: 'chat',
            component: Chat,
            meta: { moduleKey: 'chat' }
        },
        {
            path: '/profile',
            name: 'profile',
            component: UserProfile,
            meta: { moduleKey: 'profile' }
        },
        {
            path: '/module-disabled/:key',
            name: 'module-disabled',
            component: ModuleDisabled,
            props: true
        }
    ]
})

const { guardModuleAccess } = useAuthGuard();
router.beforeEach(guardModuleAccess);

export default router
