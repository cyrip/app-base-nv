<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../../auth/stores/auth'
import { socketState } from '../../../services/socket'

const users = ref([])
const authStore = useAuthStore()
const error = ref('')

onMounted(async () => {
  try {
    const response = await axios.get('http://localhost:3000/users', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    users.value = response.data
  } catch (e) {
    error.value = 'Failed to fetch users: ' + e.message
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-12">
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
        USER MANAGEMENT
      </h2>
      <div class="px-4 py-2 text-xs font-bold text-neon-blue bg-neon-blue/10 rounded-full border border-neon-blue/20">
        {{ users.length }} ACTIVE AGENTS
      </div>
    </div>

    <p v-if="error" class="mb-6 text-red-400 bg-red-400/10 py-3 px-4 rounded-lg border border-red-400/20">{{ error }}</p>

    <div v-if="users.length" class="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-white/10">
            <th class="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
            <th class="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email Identity</th>
            <th class="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Access Level</th>
            <th class="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr v-for="user in users" :key="user.id" class="group hover:bg-white/5 transition-colors duration-200">
            <td class="p-4 text-sm font-mono text-gray-400 group-hover:text-white transition-colors">#{{ user.id }}</td>
            <td class="p-4 text-sm font-medium text-white group-hover:text-neon-blue transition-colors">{{ user.email }}</td>
            <td class="p-4">
              <span 
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                :class="user.role === 'admin' ? 'bg-neon-purple/10 text-neon-purple border-neon-purple/20' : 'bg-neon-blue/10 text-neon-blue border-neon-blue/20'"
              >
                {{ user.role.toUpperCase() }}
              </span>
            </td>
            <td class="p-4 text-right">
              <div v-if="socketState.onlineUsers.has(user.id)" class="inline-flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span class="text-xs text-green-400">ONLINE</span>
              </div>
              <div v-else class="inline-flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-gray-500"></div>
                <span class="text-xs text-gray-500">OFFLINE</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="text-center py-12 text-gray-500">
      No agents found in the system.
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles replaced by Tailwind */
</style>
