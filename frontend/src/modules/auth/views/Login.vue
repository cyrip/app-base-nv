<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const authStore = useAuthStore()
const router = useRouter()
const error = ref('')

const handleLogin = async () => {
  try {
    await authStore.login(email.value, password.value)
    router.push('/users')
  } catch (e) {
    error.value = 'Login failed: ' + e.message
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[80vh]">
    <div class="w-full max-w-md p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <h2 class="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
        SYSTEM LOGIN
      </h2>
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-400 uppercase tracking-wider">Email Access</label>
          <input 
            v-model="email" 
            type="email" 
            required 
            class="w-full px-4 py-3 bg-deep-space/50 border border-white/10 rounded-lg focus:outline-none focus:border-neon-blue focus:shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all duration-300 text-white placeholder-gray-600"
            placeholder="agent@codeware.cc"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-400 uppercase tracking-wider">Security Key</label>
          <input 
            v-model="password" 
            type="password" 
            required 
            class="w-full px-4 py-3 bg-deep-space/50 border border-white/10 rounded-lg focus:outline-none focus:border-neon-purple focus:shadow-[0_0_15px_rgba(188,19,254,0.3)] transition-all duration-300 text-white placeholder-gray-600"
            placeholder="••••••••"
          />
        </div>
        <button 
          type="submit" 
          class="w-full py-4 mt-4 font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded-lg hover:opacity-90 hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all duration-300 transform hover:-translate-y-1"
        >
          AUTHENTICATE
        </button>
      </form>
      <p v-if="error" class="mt-4 text-center text-red-400 bg-red-400/10 py-2 rounded border border-red-400/20">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles replaced by Tailwind */
</style>
