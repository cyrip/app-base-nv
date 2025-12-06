<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../../auth/stores/auth';
import { useServices } from '../../../services/serviceContainer';
import { useI18n } from 'vue-i18n';

const authStore = useAuthStore();
const { toast } = useServices();
const { t } = useI18n();
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
    console.error(t('admin.permissions.errors.fetch'), error);
    toast.error(t('admin.permissions.errors.fetch'));
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

const formatGroupLabel = (group) => {
  return group === 'other' ? t('admin.permissions.otherGroup') : group.toUpperCase();
};

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
    toast.warning(t('admin.permissions.errors.nameRequired'));
    return;
  }

  try {
    await axios.post('http://localhost:3000/permissions', newPermission.value, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    toast.success(t('admin.permissions.success.create'));
    await fetchPermissions();
    closeCreateModal();
  } catch (error) {
    console.error(t('admin.permissions.errors.create'), error);
    toast.error(error.response?.data?.message || t('admin.permissions.errors.create'));
  }
};

const deletePermission = async (permission) => {
  if (!confirm(t('admin.permissions.deleteConfirm', { name: permission.name }))) return;

  try {
    await axios.delete(`http://localhost:3000/permissions/${permission.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    toast.success(t('admin.permissions.success.delete'));
    await fetchPermissions();
  } catch (error) {
    console.error(t('admin.permissions.errors.delete'), error);
    toast.error(t('admin.permissions.errors.delete'));
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
        {{ t('admin.permissions.title') }}
      </h2>
      <button
        @click="openCreateModal"
        class="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded hover:opacity-80 transition-opacity"
      >
        {{ t('admin.permissions.create') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Search -->
      <div>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('admin.permissions.filter.search')"
          class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none"
        />
      </div>
      
      <!-- Group Filter -->
      <div>
        <select
          v-model="selectedGroup"
          class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded text-white focus:border-neon-purple focus:outline-none [&>option]:bg-gray-900 [&>option]:text-white"
        >
          <option value="all">{{ t('admin.permissions.filter.allGroups', { count: permissions.length }) }}</option>
          <option v-for="group in resourceGroups" :key="group" :value="group">
            {{ t('admin.permissions.filter.groupCount', { group: formatGroupLabel(group), count: groupCounts[group] }) }}
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
            {{ formatGroupLabel(group) }}
          </h3>
          <span class="px-2 py-0.5 text-xs font-bold rounded bg-neon-purple/20 text-neon-purple border border-neon-purple/30">
            {{ t('admin.permissions.count', perms.length, { count: perms.length }) }}
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
                <span class="text-xs text-gray-500">{{ t('users.table.id') }}: {{ permission.id }}</span>
                <button
                  @click="deletePermission(permission)"
                  class="px-2.5 py-1 text-xs font-bold text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 transition-colors"
                >
                  {{ t('common.actions.delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div v-if="Object.keys(filteredGroupedPermissions).length === 0" class="text-center py-12 text-gray-400">
        <p v-if="searchQuery || selectedGroup !== 'all'">{{ t('admin.permissions.noResults') }}</p>
        <p v-else>{{ t('admin.permissions.noPermissions') }}</p>
      </div>
    </div>

    <!-- Create Permission Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-deep-space border border-white/10 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold text-white mb-4">{{ t('admin.permissions.createModal.title') }}</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">{{ t('admin.permissions.createModal.name') }}</label>
            <input
              v-model="newPermission.name"
              type="text"
              class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:border-neon-blue focus:outline-none"
              :placeholder="t('admin.permissions.createModal.namePlaceholder')"
            />
            <p class="text-xs text-gray-500 mt-1">{{ t('admin.permissions.createModal.nameHint') }}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">{{ t('admin.permissions.createModal.description') }}</label>
            <textarea
              v-model="newPermission.description"
              class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:border-neon-blue focus:outline-none"
              rows="3"
              :placeholder="t('admin.permissions.createModal.descriptionPlaceholder')"
            ></textarea>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="createPermission"
            class="flex-1 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded hover:opacity-80"
          >
            {{ t('common.actions.create') }}
          </button>
          <button
            @click="closeCreateModal"
            class="flex-1 px-4 py-2 text-sm font-bold text-gray-300 border border-white/10 rounded hover:bg-white/5"
          >
            {{ t('common.actions.cancel') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Info Card -->
    <div class="mt-8 p-6 rounded-lg bg-gradient-to-br from-white/5 to-white/10 border border-white/10">
      <h3 class="text-lg font-bold text-white mb-3">{{ t('admin.permissions.info.title') }}</h3>
      <div class="space-y-2 text-sm text-gray-300">
        <p>{{ t('admin.permissions.info.line1') }}</p>
        <p>{{ t('admin.permissions.info.line2') }}</p>
        <p>{{ t('admin.permissions.info.line3') }}</p>
        <p>{{ t('admin.permissions.info.line4') }}</p>
      </div>
    </div>
  </div>
</template>
