<script setup>
import { RouterView, useRouter } from 'vue-router';
import { onMounted, onUnmounted } from 'vue';
import { initSocket, disconnectSocket, socketState } from './services/socket';
import SocketStatus from './components/SocketStatus.vue';
import ToastContainer from './components/ToastContainer.vue';
import { useAuthStore } from './modules/auth/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

onMounted(() => {
  // In a real app, you'd watch for auth state changes. 
  // For now, we'll try to init if a token exists in localStorage (common pattern)
  const token = localStorage.getItem('token');
  if (token) {
    initSocket(token);
  }
});

onUnmounted(() => {
  disconnectSocket();
});
</script>

<template>
  <div class="min-h-screen bg-deep-space text-white overflow-hidden relative selection:bg-neon-blue selection:text-deep-space font-sans">
    <!-- Background Glow -->
    <div class="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-neon-purple/20 blur-[120px] rounded-full pointer-events-none z-0"></div>
    <div class="fixed bottom-0 right-0 w-[600px] h-[600px] bg-neon-blue/10 blur-[100px] rounded-full pointer-events-none z-0"></div>

    <!-- Navbar -->
    <nav class="relative z-50 flex items-center justify-between px-8 py-6 backdrop-blur-md bg-white/5 border-b border-white/10">
      <div class="text-2xl font-bold tracking-tighter">
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">AGENT</span>
        <span class="text-white">APP</span>
      </div>
      <div class="flex gap-6 text-sm font-medium text-gray-300" v-if="$route.name !== 'login'">
        <router-link to="/" class="hover:text-neon-blue transition-colors duration-300">Home</router-link>
        <router-link to="/users" class="hover:text-neon-blue transition-colors duration-300">Users</router-link>
      </div>
      <div v-if="$route.name !== 'login'" class="flex items-center gap-4">
         <div v-if="authStore.user" class="flex items-center gap-4">
            <div class="flex flex-col items-end">
              <span class="text-xs font-bold text-gray-400">{{ authStore.user.email }}</span>
              <div class="flex items-center gap-1.5">
                 <div class="w-1.5 h-1.5 rounded-full" :class="socketState.connected ? 'bg-neon-blue animate-pulse' : 'bg-red-500'"></div>
                 <span class="text-[10px] font-bold tracking-wider" :class="socketState.connected ? 'text-neon-blue' : 'text-red-500'">
                    {{ socketState.connected ? 'CONNECTED' : 'DISCONNECTED' }}
                 </span>
              </div>
            </div>
            <button @click="handleLogout" class="px-4 py-1.5 text-xs font-bold text-red-400 border border-red-400/30 rounded-full hover:bg-red-400/10 transition-all duration-300">
              LOGOUT
            </button>
         </div>
         <button v-else class="px-6 py-2 text-sm font-bold text-deep-space bg-neon-blue rounded-full hover:bg-white hover:shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-all duration-300">
          CONNECT
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
