<script setup>
import { RouterView, useRouter } from 'vue-router';
import { onMounted, onUnmounted } from 'vue';
import { initSocket, disconnectSocket, socketState } from './services/socket';
import SocketStatus from './components/SocketStatus.vue';
import ToastContainer from './components/ToastContainer.vue';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import { useAuthStore } from './modules/auth/stores/auth';
import { useI18n } from 'vue-i18n';
import { useModuleStore } from './modules/modules/stores/modules';
import { useThemeStore } from './modules/themes/stores/theme';

const authStore = useAuthStore();
const moduleStore = useModuleStore();
const themeStore = useThemeStore();
const router = useRouter();
const { t } = useI18n();

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const isEnabled = (key) => moduleStore.isEnabled(key);

onMounted(() => {
  // In a real app, you'd watch for auth state changes. 
  // For now, we'll try to init if a token exists in localStorage (common pattern)
  const token = localStorage.getItem('token');
  if (token) {
    initSocket(token);
    moduleStore.fetchModules();
    authStore.refreshProfile().catch(() => {});
    themeStore.fetchThemes();
  }
});

onUnmounted(() => {
  disconnectSocket();
});
</script>

<template>
  <div class="min-h-screen overflow-hidden relative font-sans" :style="{ background: 'var(--bg)', color: 'var(--text)' }">
    <!-- Background Glow -->
    <div class="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-neon-purple/20 blur-[120px] rounded-full pointer-events-none z-0"></div>
    <div class="fixed bottom-0 right-0 w-[600px] h-[600px] bg-neon-blue/10 blur-[100px] rounded-full pointer-events-none z-0"></div>

    <!-- Navbar -->
    <nav class="relative z-50 flex items-center justify-between px-8 py-6 backdrop-blur-md bg-white/5 border-b border-white/10">
      <div class="text-2xl font-bold tracking-tighter">
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">{{ t('common.app.title').substring(0, 5) }}</span>
        <span class="text-white">{{ t('common.app.title').substring(5) }}</span>
      </div>
      <div class="flex gap-6 text-sm font-medium text-gray-300" v-if="$route.name !== 'login'">
        <router-link v-if="isEnabled('landing')" to="/" class="hover:text-neon-blue transition-colors duration-300">{{ t('common.app.home') }}</router-link>
        <router-link v-if="isEnabled('users')" to="/users" class="hover:text-neon-blue transition-colors duration-300">{{ t('common.app.users') }}</router-link>
        <router-link v-if="isEnabled('chat') && moduleStore.hasAccess('chat', authStore.permissionNames)" to="/chat" class="hover:text-neon-blue transition-colors duration-300">{{ t('common.app.chat') }}</router-link>
        <router-link v-if="isEnabled('profile')" to="/profile" class="hover:text-neon-blue transition-colors duration-300">{{ t('common.app.profile') }}</router-link>
        <router-link 
          v-if="authStore.user?.Roles?.some(r => r.name === 'admin') && isEnabled('roles')" 
          to="/roles" 
          class="hover:text-neon-purple transition-colors duration-300"
        >
          {{ t('common.app.roles') }}
        </router-link>
        <router-link 
          v-if="authStore.user?.Roles?.some(r => r.name === 'admin') && isEnabled('groups')" 
          to="/groups" 
          class="hover:text-neon-purple transition-colors duration-300"
        >
          {{ t('common.app.groups') }}
        </router-link>
        <router-link 
          v-if="authStore.user?.Roles?.some(r => r.name === 'admin') && isEnabled('permissions')" 
          to="/permissions" 
          class="hover:text-neon-blue transition-colors duration-300"
        >
          {{ t('common.app.permissions') }}
        </router-link>
        <router-link 
          v-if="authStore.user?.Roles?.some(r => r.name === 'admin') && isEnabled('modules')" 
          to="/modules" 
          class="hover:text-neon-blue transition-colors duration-300"
        >
          Module Admin
        </router-link>
        <router-link 
          v-if="isEnabled('themes') && moduleStore.hasAccess('themes', authStore.permissionNames)" 
          to="/themes" 
          class="hover:text-neon-blue transition-colors duration-300"
        >
          Themes
        </router-link>
        <router-link 
          v-if="isEnabled('llmconnect') && moduleStore.hasAccess('llmconnect', authStore.permissionNames)" 
          to="/llmconnect" 
          class="hover:text-neon-blue transition-colors duration-300"
        >
          LLM Connect
        </router-link>
      </div>
      <div v-if="$route.name !== 'login'" class="flex items-center gap-4">
         <LanguageSwitcher />
        <div v-if="authStore.user" class="flex items-center gap-4">
            <router-link to="/profile" class="flex flex-col items-end group">
              <span class="text-xs font-bold text-gray-400 group-hover:text-neon-blue transition-colors">{{ authStore.user.email }}</span>
              <span class="text-[10px] text-gray-500 group-hover:text-gray-300 transition-colors" v-if="authStore.user.Roles">
                {{ t('auth.user.roles') }}: {{ authStore.user.Roles.map(r => r.name).join(', ') }}
              </span>
              <span class="text-[10px] text-red-500 group-hover:text-red-300 transition-colors" v-else>
                {{ t('auth.user.noRoles') }}
              </span>
              <div class="flex items-center gap-1.5">
                 <div class="w-1.5 h-1.5 rounded-full" :class="socketState.connected ? 'bg-neon-blue animate-pulse' : 'bg-red-500'"></div>
                 <span class="text-[10px] font-bold tracking-wider" :class="socketState.connected ? 'text-neon-blue' : 'text-red-500'">
                    {{ socketState.connected ? t('common.status.connected') : t('common.status.disconnected') }}
                 </span>
              </div>
            </router-link>
            <button @click="handleLogout" class="px-4 py-1.5 text-xs font-bold text-red-400 border border-red-400/30 rounded-full hover:bg-red-400/10 transition-all duration-300">
              {{ t('common.actions.logout') }}
            </button>
         </div>
         <button v-else class="px-6 py-2 text-sm font-bold text-deep-space bg-neon-blue rounded-full hover:bg-white hover:shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-all duration-300">
          {{ t('common.actions.connect') }}
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="relative z-10">
      <RouterView />
    </main>

    <!-- Socket Status & Messages -->
    <SocketStatus />

    <!-- Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<style>
/* Global styles if needed */
</style>
