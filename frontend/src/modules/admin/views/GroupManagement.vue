<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../../auth/stores/auth';
import { useServices } from '../../../services/serviceContainer';

const authStore = useAuthStore();
const { toast } = useServices();
const groups = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const newGroup = ref({ name: '', description: '' });

const fetchGroups = async () => {
  loading.value = true;
  try {
    const response = await axios.get('http://localhost:3000/groups', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    groups.value = response.data;
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    toast.error('Failed to fetch groups');
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  newGroup.value = { name: '', description: '' };
  showCreateModal.value = true;
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  newGroup.value = { name: '', description: '' };
};

const createGroup = async () => {
  if (!newGroup.value.name) {
    toast.warning('Group name is required');
    return;
  }

  try {
    await axios.post('http://localhost:3000/groups', newGroup.value, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    toast.success('Group created successfully!');
    await fetchGroups();
    closeCreateModal();
  } catch (error) {
    console.error('Failed to create group:', error);
    toast.error(error.response?.data?.message || 'Failed to create group');
  }
};

const deleteGroup = async (group) => {
  if (!confirm(`Delete group "${group.name}"?`)) return;

  try {
    await axios.delete(`http://localhost:3000/groups/${group.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    toast.success('Group deleted successfully!');
    await fetchGroups();
  } catch (error) {
    console.error('Failed to delete group:', error);
    toast.error('Failed to delete group');
  }
};

onMounted(() => {
  fetchGroups();
});
</script>

<template>
  <div class="container mx-auto px-4 py-12">
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
        GROUP MANAGEMENT
      </h2>
      <button
        @click="openCreateModal"
        class="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded hover:opacity-80 transition-opacity"
      >
        CREATE GROUP
      </button>
    </div>

    <!-- Groups List -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else class="grid gap-4">
      <div
        v-for="group in groups"
        :key="group.id"
        class="p-6 rounded-lg backdrop-blur-md bg-white/5 border border-white/10 hover:border-neon-blue/50 transition-all group"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="text-xl font-bold text-white mb-2">{{ group.name.toUpperCase() }}</h3>
            <p class="text-sm text-gray-400">{{ group.description || 'No description' }}</p>
          </div>

          <div class="flex gap-2">
            <button
              @click="deleteGroup(group)"
              class="px-3 py-1 text-xs font-bold text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 transition-colors"
            >
              DELETE
            </button>
          </div>
        </div>
      </div>

      <div v-if="groups.length === 0" class="text-center py-12 text-gray-400">
        No groups created yet
      </div>
    </div>

    <!-- Create Group Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-deep-space border border-white/10 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold text-white mb-4">Create New Group</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Group Name</label>
            <input
              v-model="newGroup.name"
              type="text"
              class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:border-neon-blue focus:outline-none"
              placeholder="e.g., Engineering"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              v-model="newGroup.description"
              class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:border-neon-blue focus:outline-none"
              rows="3"
              placeholder="Group description..."
            ></textarea>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="createGroup"
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
  </div>
</template>
