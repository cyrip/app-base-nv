<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../../auth/stores/auth'
import { socketState, sendPrivateMessage } from '../../../services/socket'
import { useI18n } from 'vue-i18n'

const users = ref([])
const authStore = useAuthStore()
const { t } = useI18n()
const error = ref('')
const showMessageModal = ref(false)
const showRoleModal = ref(false)
const showGroupModal = ref(false)
const selectedUser = ref(null)
const messageText = ref('')
const roles = ref([])
const groups = ref([])
const selectedRoles = ref([])
const selectedGroups = ref([])

const openMessageModal = (user) => {
  selectedUser.value = user
  showMessageModal.value = true
  messageText.value = ''
}

const closeMessageModal = () => {
  showMessageModal.value = false
  selectedUser.value = null
  messageText.value = ''
}

const sendMessage = () => {
  if (!messageText.value.trim() || !selectedUser.value) return
  
  sendPrivateMessage(selectedUser.value.id, messageText.value)
  closeMessageModal()
}

const openRoleModal = async (user) => {
  selectedUser.value = user
  selectedRoles.value = user.Roles?.map(r => r.id) || []
  showRoleModal.value = true
}

const closeRoleModal = () => {
  showRoleModal.value = false
  selectedUser.value = null
  selectedRoles.value = []
}

const openGroupModal = async (user) => {
  selectedUser.value = user
  selectedGroups.value = user.Groups?.map(g => g.id) || []
  showGroupModal.value = true
}

const closeGroupModal = () => {
  showGroupModal.value = false
  selectedUser.value = null
  selectedGroups.value = []
}

const fetchRoles = async () => {
  try {
    const response = await axios.get('http://localhost:3000/roles', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    roles.value = response.data
  } catch (e) {
    console.error('Failed to fetch roles:', e)
  }
}

const fetchGroups = async () => {
  try {
    const response = await axios.get('http://localhost:3000/groups', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    groups.value = response.data
  } catch (e) {
    console.error('Failed to fetch groups:', e)
  }
}

const saveUserRoles = async () => {
  try {
    const currentRoleIds = selectedUser.value.Roles?.map(r => r.id) || []
    const rolesToAdd = selectedRoles.value.filter(id => !currentRoleIds.includes(id))
    const rolesToRemove = currentRoleIds.filter(id => !selectedRoles.value.includes(id))

    for (const roleId of rolesToAdd) {
      await axios.post(
        `http://localhost:3000/users/${selectedUser.value.id}/roles`,
        { roleId },
        { headers: { Authorization: `Bearer ${authStore.token}` } }
      )
    }

    for (const roleId of rolesToRemove) {
      await axios.delete(
        `http://localhost:3000/users/${selectedUser.value.id}/roles/${roleId}`,
        { headers: { Authorization: `Bearer ${authStore.token}` } }
      )
    }

    await fetchUsers()
    closeRoleModal()
  } catch (e) {
    error.value = t('users.errors.updateRoles', { message: e.message })
  }
}

const saveUserGroups = async () => {
  try {
    const currentGroupIds = selectedUser.value.Groups?.map(g => g.id) || []
    const groupsToAdd = selectedGroups.value.filter(id => !currentGroupIds.includes(id))
    const groupsToRemove = currentGroupIds.filter(id => !selectedGroups.value.includes(id))

    for (const groupId of groupsToAdd) {
      await axios.post(
        `http://localhost:3000/users/${selectedUser.value.id}/groups`,
        { groupId },
        { headers: { Authorization: `Bearer ${authStore.token}` } }
      )
    }

    for (const groupId of groupsToRemove) {
      await axios.delete(
        `http://localhost:3000/users/${selectedUser.value.id}/groups/${groupId}`,
        { headers: { Authorization: `Bearer ${authStore.token}` } }
      )
    }

    await fetchUsers()
    closeGroupModal()
  } catch (e) {
    error.value = t('users.errors.updateGroups', { message: e.message })
  }
}

const fetchUsers = async () => {
  try {
    const response = await axios.get('http://localhost:3000/users', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    users.value = response.data
  } catch (e) {
    error.value = t('users.errors.fetchUsers', { message: e.message })
  }
}

onMounted(async () => {
  await fetchUsers()
  await fetchRoles()
  await fetchGroups()
})
</script>

<template>
  <div class="container mx-auto px-4 py-12">
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
        {{ t('users.title') }}
      </h2>
      <div class="px-4 py-2 text-xs font-bold text-neon-blue bg-neon-blue/10 rounded-full border border-neon-blue/20">
        {{ t('users.activeAgents', { count: users.length }) }}
      </div>
    </div>

    <p v-if="error" class="mb-6 text-red-400 bg-red-400/10 py-3 px-4 rounded-lg border border-red-400/20">{{ error }}</p>

    <div v-if="users.length" class="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-white/10">
            <th class="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{{ t('users.table.id') }}</th>
            <th class="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{{ t('users.table.emailIdentity') }}</th>
            <th class="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{{ t('users.table.accessLevel') }}</th>
            <th class="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">{{ t('users.table.status') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr v-for="user in users" :key="user.id" class="group hover:bg-white/5 transition-colors duration-200">
            <td class="p-4 text-sm font-mono text-gray-400 group-hover:text-white transition-colors">#{{ user.id }}</td>
            <td class="p-4 text-sm font-medium text-white group-hover:text-neon-blue transition-colors">{{ user.email }}</td>
            <td class="p-4">
              <div class="flex gap-1.5 flex-wrap">
                <span 
                  v-for="role in user.Roles" 
                  :key="role.id"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                  :class="role.name === 'admin' ? 'bg-neon-purple/10 text-neon-purple border-neon-purple/20' : 'bg-neon-blue/10 text-neon-blue border-neon-blue/20'"
                >
                  {{ role.name.toUpperCase() }}
                </span>
                <span v-if="!user.Roles || user.Roles.length === 0" class="text-xs text-gray-500">{{ t('users.roles.noRoles') }}</span>
              </div>
            </td>
            <td class="p-4 text-right">
              <div class="flex items-center justify-end gap-3">
                <button 
                  @click="openMessageModal(user)"
                  class="px-3 py-1 text-xs font-bold text-neon-blue border border-neon-blue/30 rounded hover:bg-neon-blue/10 transition-colors"
                  v-if="user.id !== authStore.user?.id"
                >
                  {{ t('common.actions.message') }}
                </button>
                <button
                  @click="openRoleModal(user)"
                  class="px-3 py-1 text-xs font-bold text-neon-purple border border-neon-purple/30 rounded hover:bg-neon-purple/10 transition-colors"
                  v-if="authStore.user?.Roles?.some(r => r.name === 'admin')"
                >
                  {{ t('users.roles.button') }}
                </button>
                <button
                  @click="openGroupModal(user)"
                  class="px-3 py-1 text-xs font-bold text-neon-blue border border-neon-blue/30 rounded hover:bg-neon-blue/10 transition-colors"
                  v-if="authStore.user?.Roles?.some(r => r.name === 'admin')"
                >
                  {{ t('users.groups.button') }}
                </button>
                <div v-if="socketState.onlineUsers.has(user.id)" class="inline-flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span class="text-xs text-green-400">{{ t('common.status.online') }}</span>
                </div>
                <div v-else class="inline-flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-gray-500"></div>
                  <span class="text-xs text-gray-500">{{ t('common.status.offline') }}</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="text-center py-12 text-gray-500">
      {{ t('users.noUsers') }}
    </div>

    <!-- Message Modal -->
    <div v-if="showMessageModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-md bg-[#0a0a1f] border border-neon-blue/30 rounded-xl shadow-[0_0_50px_rgba(0,243,255,0.1)] overflow-hidden">
        <div class="p-6">
          <h3 class="text-xl font-bold text-white mb-4">{{ t('users.message.title', { email: selectedUser?.email || '' }) }}</h3>
          <textarea 
            v-model="messageText"
            class="w-full h-32 bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue focus:outline-none transition-colors resize-none"
            :placeholder="t('users.message.placeholder')"
          ></textarea>
          <div class="flex justify-end gap-3 mt-6">
            <button 
              @click="closeMessageModal"
              class="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
              {{ t('common.actions.cancel') }}
            </button>
            <button 
              @click="sendMessage"
              class="px-6 py-2 text-sm font-bold text-deep-space bg-neon-blue rounded-lg hover:bg-white hover:shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-all duration-300"
            >
              {{ t('common.actions.send') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Role Management Modal -->
    <div v-if="showRoleModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-md bg-[#0a0a1f] border border-neon-purple/30 rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.1)] overflow-hidden">
        <div class="p-6">
          <h3 class="text-xl font-bold text-white mb-4">{{ t('users.roles.manage', { email: selectedUser?.email || '' }) }}</h3>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            <label
              v-for="role in roles"
              :key="role.id"
              class="flex items-center gap-3 p-3 rounded hover:bg-white/5 cursor-pointer"
            >
              <input
                type="checkbox"
                :value="role.id"
                v-model="selectedRoles"
                class="w-4 h-4 rounded border-white/10 bg-white/5 text-neon-purple focus:ring-neon-purple"
              />
              <div class="flex-1">
                <div class="text-sm font-medium text-white">{{ role.name }}</div>
                <div class="text-xs text-gray-400">{{ role.description }}</div>
              </div>
            </label>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button 
              @click="closeRoleModal"
              class="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
              {{ t('common.actions.cancel') }}
            </button>
            <button 
              @click="saveUserRoles"
              class="px-6 py-2 text-sm font-bold text-deep-space bg-neon-purple rounded-lg hover:bg-white hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all duration-300"
            >
              {{ t('common.actions.save') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Group Management Modal -->
    <div v-if="showGroupModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-md bg-[#0a0a1f] border border-neon-blue/30 rounded-xl shadow-[0_0_50px_rgba(0,243,255,0.1)] overflow-hidden">
        <div class="p-6">
          <h3 class="text-xl font-bold text-white mb-4">{{ t('users.groups.manage', { email: selectedUser?.email || '' }) }}</h3>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            <label
              v-for="group in groups"
              :key="group.id"
              class="flex items-center gap-3 p-3 rounded hover:bg-white/5 cursor-pointer"
            >
              <input
                type="checkbox"
                :value="group.id"
                v-model="selectedGroups"
                class="w-4 h-4 rounded border-white/10 bg-white/5 text-neon-blue focus:ring-neon-blue"
              />
              <div class="flex-1">
                <div class="text-sm font-medium text-white">{{ group.name }}</div>
                <div class="text-xs text-gray-400">{{ group.description }}</div>
              </div>
            </label>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button 
              @click="closeGroupModal"
              class="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
              {{ t('common.actions.cancel') }}
            </button>
            <button 
              @click="saveUserGroups"
              class="px-6 py-2 text-sm font-bold text-deep-space bg-neon-blue rounded-lg hover:bg-white hover:shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-all duration-300"
            >
              {{ t('common.actions.save') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles replaced by Tailwind */
</style>
