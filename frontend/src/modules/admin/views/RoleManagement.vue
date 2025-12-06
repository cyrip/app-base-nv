<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../../auth/stores/auth';
import { useServices } from '../../../services/serviceContainer';

const authStore = useAuthStore();
const { toast } = useServices();
const roles = ref([]);
const permissions = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showPermissionsModal = ref(false);
const selectedRole = ref(null);
const newRole = ref({ name: '', description: '' });
const selectedPermissions = ref([]);

const fetchRoles = async () => {
  loading.value = true;
  try {
    const response = await axios.get('http://localhost:3000/roles', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    roles.value = response.data;
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    toast.error('Failed to fetch roles');
  } finally {
    loading.value = false;
  }
};

const fetchPermissions = async () => {
  try {
    const response = await axios.get('http://localhost:3000/permissions', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    permissions.value = response.data;
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
  }
};

const openCreateModal = () => {
  newRole.value = { name: '', description: '' };
  showCreateModal.value = true;
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  newRole.value = { name: '', description: '' };
};

const createRole = async () => {
  if (!newRole.value.name) {
    toast.warning('Role name is required');
    return;
  }

  try {
    await axios.post('http://localhost:3000/roles', newRole.value, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    toast.success('Role created successfully!');
    await fetchRoles();
    closeCreateModal();
  } catch (error) {
    console.error('Failed to create role:', error);
    toast.error(error.response?.data?.message || 'Failed to create role');
  }
};

const openPermissionsModal = (role) => {
  selectedRole.value = role;
  selectedPermissions.value = role.Permissions?.map(p => p.id) || [];
  showPermissionsModal.value = true;
};

const closePermissionsModal = () => {
  showPermissionsModal.value = false;
  selectedRole.value = null;
  selectedPermissions.value = [];
};

const assignPermissions = async () => {
  try {
    await axios.post(
      `http://localhost:3000/roles/${selectedRole.value.id}/permissions`,
      { permissionIds: selectedPermissions.value },
      { headers: { Authorization: `Bearer ${authStore.token}` } }
    );
    toast.success('Permissions updated successfully!');
    await fetchRoles();
    closePermissionsModal();
  } catch (error) {
    console.error('Failed to assign permissions:', error);
    toast.error('Failed to assign permissions');
  }
};

const deleteRole = async (role) => {
  if (!confirm(`Delete role "${role.name}"?`)) return;

  try {
    await axios.delete(`http://localhost:3000/roles/${role.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    toast.success('Role deleted successfully!');
    await fetchRoles();
  } catch (error) {
    console.error('Failed to delete role:', error);
    toast.error(error.response?.data?.message || 'Failed to delete role');
  }
};

onMounted(() => {
  fetchRoles();
  fetchPermissions();
});
</script>

<template>
  <div class="container mx-auto px-4 py-12">
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">
        ROLE MANAGEMENT
      </h2>
      <button
        @click="openCreateModal"
        class="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-purple to-neon-blue rounded hover:opacity-80 transition-opacity"
      >
        CREATE ROLE
      </button>
    </div>

    <!-- Roles List -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else class="grid gap-4">
      <div
        v-for="role in roles"
        :key="role.id"
        class="p-6 rounded-lg backdrop-blur-md bg-white/5 border border-white/10 hover:border-neon-purple/50 transition-all group"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="text-xl font-bold text-white mb-2">{{ role.name.toUpperCase() }}</h3>
            <p class="text-sm text-gray-400 mb-4">{{ role.description || 'No description' }}</p>
            
            <div class="flex flex-wrap gap-2">
              <span
                v-for="perm in role.Permissions"
                :key="perm.id"
                class="px-2 py-1 text-xs font-medium rounded bg-neon-blue/10 text-neon-blue border border-neon-blue/20"
              >
                {{ perm.name }}
              </span>
              <span v-if="!role.Permissions || role.Permissions.length === 0" class="text-xs text-gray-500">
                No permissions assigned
              </span>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              @click="openPermissionsModal(role)"
              class="px-3 py-1 text-xs font-bold text-neon-purple border border-neon-purple/30 rounded hover:bg-neon-purple/10 transition-colors"
            >
              PERMISSIONS
            </button>
            <button
              v-if="role.name !== 'admin' && role.name !== 'user'"
              @click="deleteRole(role)"
              class="px-3 py-1 text-xs font-bold text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 transition-colors"
            >
              DELETE
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Role Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-deep-space border border-white/10 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold text-white mb-4">Create New Role</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Role Name</label>
            <input
              v-model="newRole.name"
              type="text"
              class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:border-neon-purple focus:outline-none"
              placeholder="e.g., moderator"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              v-model="newRole.description"
              class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:border-neon-purple focus:outline-none"
              rows="3"
              placeholder="Role description..."
            ></textarea>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="createRole"
            class="flex-1 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-purple to-neon-blue rounded hover:opacity-80"
          >
            CREATE
          </button>
          <button
            @click="closeCreateModal"
            class="flex-1 px-4 py-2 text-sm font-bold text-gray-300 border border-white/10 rounded hover:bg-white/5"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>

    <!-- Permissions Modal -->
    <div v-if="showPermissionsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-deep-space border border-white/10 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold text-white mb-4">Manage Permissions for {{ selectedRole?.name }}</h3>
        
        <div class="space-y-2 max-h-96 overflow-y-auto">
          <label
            v-for="perm in permissions"
            :key="perm.id"
            class="flex items-center gap-3 p-3 rounded hover:bg-white/5 cursor-pointer"
          >
            <input
              type="checkbox"
              :value="perm.id"
              v-model="selectedPermissions"
              class="w-4 h-4 rounded border-white/10 bg-white/5 text-neon-purple focus:ring-neon-purple"
            />
            <div class="flex-1">
              <div class="text-sm font-medium text-white">{{ perm.name }}</div>
              <div class="text-xs text-gray-400">{{ perm.description }}</div>
            </div>
          </label>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="assignPermissions"
            class="flex-1 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-purple to-neon-blue rounded hover:opacity-80"
          >
            SAVE
          </button>
          <button
            @click="closePermissionsModal"
            class="flex-1 px-4 py-2 text-sm font-bold text-gray-300 border border-white/10 rounded hover:bg-white/5"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
