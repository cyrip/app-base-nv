<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../../auth/stores/auth';
import { useServices } from '../../../services/serviceContainer';

const authStore = useAuthStore();
const { toast } = useServices();
const permissions = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const newPermission = ref({ name: '', description: '' });
const searchQuery = ref('');
const selectedGroup = ref('all');

const fetchPermissions = async () => {
  loading.value = true;
  try {
    const response = await axios.get('http://localhost:3000/permissions', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    permissions.value = response.data;
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    toast.error('Failed to fetch permissions');
  } finally {
    loading.value = false;
  }
};

// Group permissions by resource (e.g., user.*, role.*)
const groupedPermissions = computed(() => {
  const groups = {};
  
  permissions.value.forEach(permission => {
    const parts = permission.name.split('.');
    const resource = parts[0] || 'other';
    
    if (!groups[resource]) {
      groups[resource] = [];
    }
    groups[resource].push(permission);
  });
  
  return groups;
});

// Get list of all resource groups
const resourceGroups = computed(() => {
  return Object.keys(groupedPermissions.value).sort();
});

// Filter permissions based on search and selected group
const filteredGroupedPermissions = computed(() => {
  let filtered = { ...groupedPermissions.value };
  
  // Filter by selected group
  if (selectedGroup.value !== 'all') {
    filtered = { [selectedGroup.value]: filtered[selectedGroup.value] || [] };
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    const result = {};
    
    Object.keys(filtered).forEach(group => {
      const matchingPerms = filtered[group].filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description?.toLowerCase().includes(query)
      );
      
      if (matchingPerms.length > 0) {
        result[group] = matchingPerms;
      }
    });
    
    return result;
  }
  
  return filtered;
});

// Count permissions in each group
const groupCounts = computed(() => {
  const counts = {};
  Object.keys(groupedPermissions.value).forEach(group => {
    counts[group] = groupedPermissions.value[group].length;
  });
  return counts;
});

const openCreateModal = () => {
  newPermission.value = { name: '', description: '' };
  showCreateModal.value = true;
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  newPermission.value = { name: '', description: '' };
};

const createPermission = async () => {
  if (!newPermission.value.name) {
    toast.warning('Permission name is required');
    return;
  }

  try {
    await axios.post('http://localhost:3000/permissions', newPermission.value, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    toast.success('Permission created successfully!');
    await fetchPermissions();
    closeCreateModal();
  } catch (error) {
    console.error('Failed to create permission:', error);
    toast.error(error.response?.data?.message || 'Failed to create permission');
  }
};

const deletePermission = async (permission) => {
  if (!confirm(`Delete permission "${permission.name}"?`)) return;

  try {
    await axios.delete(`http://localhost:3000/permissions/${permission.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    toast.success('Permission deleted successfully!');
    await fetchPermissions();
  } catch (error) {
    console.error('Failed to delete permission:', error);
    toast.error('Failed to delete permission');
  }
};

onMounted(() => {
  fetchPermissions();
});
</script>

<template>
  <div class="container mx-auto px-4 py-12">
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-purple to-neon-blue">
        PERMISSION MANAGEMENT
      </h2>
      <button
        @click="openCreateModal"
        class="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded hover:opacity-80 transition-opacity"
      >
        CREATE PERMISSION
      </button>
    </div>

    <!-- Filters -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Search -->
      <div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search permissions..."
          class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none"
        />
      </div>
      
      <!-- Group Filter -->
      <div>
        <select
          v-model="selectedGroup"
          class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded text-white focus:border-neon-purple focus:outline-none [&>option]:bg-gray-900 [&>option]:text-white"
        >
          <option value="all">All Groups ({{ permissions.length }})</option>
          <option v-for="group in resourceGroups" :key="group" :value="group">
            {{ group.toUpperCase() }} ({{ groupCounts[group] }})
          </option>
        </select>
      </div>
    </div>

    <!-- Permissions List -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else class="space-y-6">
      <!-- Grouped Permissions -->
      <div v-for="(perms, group) in filteredGroupedPermissions" :key="group" class="space-y-3">
        <!-- Group Header -->
        <div class="flex items-center gap-3 mb-3">
          <h3 class="text-lg font-bold text-white uppercase tracking-wider">
            {{ group }}
          </h3>
          <span class="px-2 py-0.5 text-xs font-bold rounded bg-neon-purple/20 text-neon-purple border border-neon-purple/30">
            {{ perms.length }} {{ perms.length === 1 ? 'permission' : 'permissions' }}
          </span>
        </div>

        <!-- Permissions in Group -->
        <div class="grid gap-2 pl-4 border-l-2 border-neon-blue/30">
          <div
            v-for="permission in perms"
            :key="permission.id"
            class="p-3 rounded-lg backdrop-blur-md bg-white/5 border border-white/10 hover:border-neon-blue/30 transition-all group"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <span class="px-2.5 py-1 text-xs font-mono font-bold rounded bg-neon-blue/20 text-neon-blue border border-neon-blue/30">
                    {{ permission.name }}
                  </span>
                  <span class="text-sm text-gray-400">
                    {{ permission.description }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-500">ID: {{ permission.id }}</span>
                <button
                  @click="deletePermission(permission)"
                  class="px-2.5 py-1 text-xs font-bold text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 transition-colors"
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div v-if="Object.keys(filteredGroupedPermissions).length === 0" class="text-center py-12 text-gray-400">
        <p v-if="searchQuery || selectedGroup !== 'all'">No permissions match your filters.</p>
        <p v-else>No permissions found. Create your first permission above.</p>
      </div>
    </div>

    <!-- Create Permission Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-deep-space border border-white/10 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold text-white mb-4">Create New Permission</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Permission Name</label>
            <input
              v-model="newPermission.name"
              type="text"
              class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:border-neon-blue focus:outline-none"
              placeholder="e.g., post.create"
            />
            <p class="text-xs text-gray-500 mt-1">Use dot notation: resource.action (e.g., user.edit, post.delete)</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              v-model="newPermission.description"
              class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:border-neon-blue focus:outline-none"
              rows="3"
              placeholder="Permission description..."
            ></textarea>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="createPermission"
            class="flex-1 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded hover:opacity-80"
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

    <!-- Info Card -->
    <div class="mt-8 p-6 rounded-lg bg-gradient-to-br from-white/5 to-white/10 border border-white/10">
      <h3 class="text-lg font-bold text-white mb-3">About Permissions</h3>
      <div class="space-y-2 text-sm text-gray-300">
        <p>• Permissions define specific actions users can perform in the system</p>
        <p>• Permissions are grouped by resource (e.g., user.*, role.*, group.*)</p>
        <p>• Use dot notation for permission names (e.g., user.create, post.delete)</p>
        <p>• Use the Roles page to assign permissions to specific roles</p>
      </div>
    </div>
  </div>
</template>
