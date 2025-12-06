<script setup>
import { RouterView } from 'vue-router'
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
      <div v-if="$route.name !== 'login'">
         <button class="px-6 py-2 text-sm font-bold text-deep-space bg-neon-blue rounded-full hover:bg-white hover:shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-all duration-300">
          CONNECT
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="relative z-10">
      <RouterView />
    </main>
  </div>
</template>

<style>
/* Global styles if needed */
</style>
