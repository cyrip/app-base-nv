<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../../auth/stores/auth';
import { useI18n } from 'vue-i18n';
import { socketState, getSocket } from '../../../services/socket';

const authStore = useAuthStore();
const { t } = useI18n();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const channels = ref([]);
const users = ref([]);
const activeChannelId = ref(null);
const messages = ref([]);
const loadingMessages = ref(false);
const creatingChannel = ref(false);
const showChannelModal = ref(false);
const userSearchTerm = ref('');
const debouncedSearchTerm = ref('');
const showUserDropdown = ref(false);
let searchDebounceTimer = null;
const newChannel = reactive({
  name: '',
  participantIds: []
});
const newMessage = ref('');
const usersLoaded = ref(false);
const usersError = ref('');

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${authStore.token}` }
});

const activeChannel = computed(() => channels.value.find(c => c.id === activeChannelId.value));

const loadChannels = async () => {
  try {
    const res = await axios.get(`${API_URL}/channels`, authHeaders());
    channels.value = res.data;
  } catch (e) {
    console.error('Failed to load channels', e);
    channels.value = [];
  }
};

const loadUsers = async () => {
  console.log('[chat] loading users...');
  try {
    const res = await axios.get(`${API_URL}/users`, authHeaders());
    users.value = res.data;
    usersLoaded.value = true;
    usersError.value = '';
    console.log('[chat] users loaded', users.value.length);
  } catch (e) {
    console.error('Failed to load users', e);
    users.value = [];
    usersError.value = e.response?.data?.message || e.message;
    usersLoaded.value = false;
  }
};

const selectChannel = async (channelId) => {
  activeChannelId.value = channelId;
  await loadMessages(channelId);
};

const loadMessages = async (channelId) => {
  loadingMessages.value = true;
  try {
    const res = await axios.get(`${API_URL}/channels/${channelId}/messages`, authHeaders());
    messages.value = res.data.reverse();
  } catch (e) {
    console.error('Failed to load messages', e);
    messages.value = [];
  } finally {
    loadingMessages.value = false;
  }
};

const handleKeydown = (e) => {
  // Enter without Ctrl sends message
  if (e.key === 'Enter' && !e.ctrlKey) {
    e.preventDefault();
    sendMessage();
  }
  // Ctrl+Enter adds new line (default behavior, just let it happen)
};

const sendMessage = async () => {
  if (!newMessage.value.trim() || !activeChannelId.value) return;
  const content = newMessage.value;
  newMessage.value = '';
  
  // Optimistically add message to UI
  const tempMessage = {
    id: Date.now(),
    content,
    fromUserId: authStore.user?.id,
    channelId: activeChannelId.value,
    createdAt: new Date().toISOString(),
    FromUser: {
      email: authStore.user?.email
    }
  };
  messages.value.push(tempMessage);
  
  try {
    const res = await axios.post(`${API_URL}/channels/${activeChannelId.value}/messages`, { content }, authHeaders());
    // Replace temp message with real one from server
    const index = messages.value.findIndex(m => m.id === tempMessage.id);
    if (index !== -1 && res.data) {
      messages.value[index] = res.data;
    }
  } catch (e) {
    console.error('Failed to send message', e);
    // Remove temp message on error
    messages.value = messages.value.filter(m => m.id !== tempMessage.id);
  }
};

const createChannel = async () => {
  if (!newChannel.participantIds.length) return;
  creatingChannel.value = true;
  try {
    const res = await axios.post(`${API_URL}/channels`, {
      name: newChannel.name || null,
      type: 'custom',
      participantIds: newChannel.participantIds
    }, authHeaders());
    addChannelIfMissing(res.data);
    newChannel.name = '';
    newChannel.participantIds = [];
    showChannelModal.value = false;
  } catch (e) {
    console.error('Failed to create channel', e);
  } finally {
    creatingChannel.value = false;
  }
};

const selectUser = (id) => {
  const idNum = Number(id);
  if (!newChannel.participantIds.includes(idNum)) {
    newChannel.participantIds.push(idNum);
  }
  console.log('[chat] selected user', idNum, newChannel.participantIds);
  showUserDropdown.value = false;
  userSearchTerm.value = '';
};

const removeParticipant = (id) => {
  newChannel.participantIds = newChannel.participantIds.filter(pid => pid !== id);
};

const openDirectChat = async (userId) => {
  try {
    // Check if a direct channel already exists with this user
    const existingChannel = channels.value.find(ch => {
      const participants = ch.ChannelParticipants || [];
      return participants.length === 2 && 
             participants.some(p => p.userId === userId) &&
             participants.some(p => p.userId === authStore.user?.id);
    });

    if (existingChannel) {
      // Open existing channel
      await selectChannel(existingChannel.id);
    } else {
      // Create new direct channel
      const res = await axios.post(`${API_URL}/channels`, {
        name: null,
        type: 'custom',
        participantIds: [userId]
      }, authHeaders());
      addChannelIfMissing(res.data);
      await selectChannel(res.data.id);
    }
  } catch (e) {
    console.error('Failed to open direct chat', e);
  }
};

const setupSocket = () => {
  const socket = getSocket();
  if (!socket) return;
  socket.on('channel:message', (msg) => {
    if (msg.channelId === activeChannelId.value) {
      // Avoid duplicates - check if message already exists
      const exists = messages.value.some(m => m.id === msg.id);
      if (!exists) {
        messages.value.push(msg);
      }
    }
  });
  socket.on('channel:created', (channel) => {
    addChannelIfMissing(channel);
  });
};

watch(showChannelModal, (val) => {
  if (val) {
    showUserDropdown.value = true;
    userSearchTerm.value = '';
    debouncedSearchTerm.value = '';
    console.log('[chat] channel modal opened');
  } else {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    console.log('[chat] channel modal closed');
  }
});

const addChannelIfMissing = (channel) => {
  const channelId = Number(channel.id);
  const exists = channels.value.some(c => Number(c.id) === channelId);
  if (!exists) {
    channels.value.unshift({ ...channel, id: channelId });
  }
};

const filteredUsers = computed(() => {
  const term = debouncedSearchTerm.value?.toLowerCase() || '';
  const list = Array.isArray(users.value) ? users.value : [];
  return !term ? list : list.filter(u => u.email?.toLowerCase().includes(term));
});

watch(userSearchTerm, (newVal) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  searchDebounceTimer = setTimeout(() => {
    debouncedSearchTerm.value = newVal;
  }, 500);
});

watch(filteredUsers, (val) => {
  console.log('[chat] filtered users', val?.length);
});

const openUserDropdown = () => {
  showUserDropdown.value = true;
  console.log('[chat] open user dropdown', {
    users: users.value?.length,
    filtered: filteredUsers.value?.length,
    search: userSearchTerm.value
  });
};

onMounted(async () => {
  await loadChannels();
  await loadUsers();
  setupSocket();
});
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-5 gap-4 p-4">
    <div class="md:col-span-1 bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
      <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-white">{{ t('common.chat.channels') }}</h3>
        <span class="text-xs text-gray-400">{{ channels.length }}</span>
      </div>
      <div class="space-y-2 max-h-[70vh] overflow-y-auto">
        <button
          v-for="ch in channels"
          :key="ch.id"
          @click="selectChannel(ch.id)"
          :class="[
            'w-full text-left px-3 py-2 rounded-lg border transition-colors',
            activeChannelId === ch.id ? 'border-neon-blue/50 bg-neon-blue/10 text-white' : 'border-white/10 text-gray-300 hover:border-neon-blue/30'
          ]"
        >
          <div class="text-sm font-bold">{{ ch.name || t('common.chat.directChannel') }}</div>
          <div class="text-xs text-gray-400 truncate">
            {{ (ch.ChannelParticipants || []).map(p => p.User?.email).join(', ') }}
          </div>
        </button>
      </div>
      <div class="pt-3 border-t border-white/10">
        <button
          @click="showChannelModal = true"
          class="w-full px-3 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded hover:opacity-90"
        >
          {{ t('common.chat.newChannel') }}
        </button>
      </div>
    </div>

    <div class="md:col-span-3 bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col h-[80vh]">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-xl font-bold text-white">
            {{ activeChannel?.name || t('common.chat.selectChannel') }}
          </h3>
          <p class="text-xs text-gray-400">
            {{ (activeChannel?.ChannelParticipants || []).map(p => p.User?.email).join(', ') }}
          </p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3 pr-2">
        <div v-if="!activeChannelId" class="text-gray-500 text-sm">{{ t('common.chat.selectPrompt') }}</div>
        <div v-else-if="loadingMessages" class="text-gray-400 text-sm">{{ t('common.chat.loading') }}</div>
        <div v-else>
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="[
              'p-3 rounded-lg border text-sm max-w-3xl',
              msg.fromUserId === authStore.user?.id
                ? 'ml-auto bg-neon-blue/10 border-neon-blue/30 text-white'
                : 'mr-auto bg-white/5 border-white/10 text-gray-200'
            ]"
          >
            <div class="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span>{{ msg.FromUser?.email || (msg.fromUserId === authStore.user?.id ? 'You' : '') }}</span>
              <span>{{ new Date(msg.createdAt || msg.timestamp).toLocaleString() }}</span>
            </div>
            <div class="prose prose-invert max-w-none" v-html="msg.content"></div>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <textarea
          v-model="newMessage"
          @keydown="handleKeydown"
          class="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue"
          :placeholder="t('common.chat.messagePlaceholder')"
          rows="3"
        ></textarea>
        <div class="flex justify-end mt-2">
          <button
            @click="sendMessage"
            class="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded hover:opacity-90"
            :disabled="!activeChannelId"
          >
            {{ t('common.chat.send') }}
          </button>
        </div>
      </div>
    </div>

    <div class="md:col-span-1 bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <h3 class="text-lg font-bold text-white">{{ t('common.chat.users') }}</h3>
      <div class="space-y-2 max-h-[70vh] overflow-y-auto">
        <div
          v-for="user in users"
          :key="user.id"
          class="flex items-center justify-between gap-2 px-3 py-2 rounded border border-white/10 bg-black/30"
        >
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <span class="text-sm text-white truncate">{{ user.email }}</span>
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :class="socketState.onlineUsers.has(user.id) ? 'bg-green-400' : 'bg-gray-500'"
            ></span>
          </div>
          <button
            v-if="user.id !== authStore.user?.id"
            @click="openDirectChat(user.id)"
            class="px-2 py-1 text-xs font-semibold text-white bg-neon-blue/20 hover:bg-neon-blue/40 border border-neon-blue/30 rounded transition-colors flex-shrink-0"
            :title="t('common.chat.startChat') || 'Chat'"
          >
            💬
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showChannelModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="bg-[#0a0a1f] border border-neon-blue/30 rounded-xl shadow-2xl w-full max-w-lg">
      <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h3 class="text-lg font-bold text-white">{{ t('common.chat.newChannel') }}</h3>
          <p class="text-xs text-gray-400">{{ t('common.chat.channelNamePlaceholder') }}</p>
        </div>
        <button
          @click="showChannelModal = false"
          class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      <div class="px-6 py-5 space-y-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">{{ t('common.chat.channelNamePlaceholder') }}</label>
          <input
            v-model="newChannel.name"
            type="text"
            class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-white focus:outline-none focus:border-neon-blue"
            :placeholder="t('common.chat.channelNamePlaceholder')"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-xs text-gray-400">{{ t('common.chat.users') }}</label>
          <div class="relative">
            <input
              v-model="userSearchTerm"
              @focus="openUserDropdown"
              @input="openUserDropdown"
              type="text"
              class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-white focus:outline-none focus:border-neon-blue"
              :placeholder="t('common.actions.searchUsers')"
            />
            <div
              v-if="showUserDropdown"
              class="absolute mt-1 w-full bg-[#0a0a1f] border border-white/10 rounded-lg shadow-lg z-10"
            >
              <div class="max-h-48 overflow-y-auto">
                <div v-if="usersError" class="px-3 py-2 text-xs text-red-400">
                  {{ usersError }}
                </div>
                <div v-else-if="!usersLoaded" class="px-3 py-2 text-xs text-gray-400">
                  {{ t('common.chat.loading') }}
                </div>
                <button
                  v-for="user in filteredUsers"
                  :key="user.id"
                  @click="selectUser(user.id)"
                  class="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  {{ user.email }}
                </button>
                <div v-if="!filteredUsers || filteredUsers.length === 0" class="px-3 py-2 text-xs text-gray-400">
                  {{ t('common.chat.noUsers') || 'No users found' }}
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="pid in newChannel.participantIds"
              :key="pid"
              class="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-white/10 border border-white/20 text-white"
            >
              {{ users.find(u => u.id === pid)?.email || pid }}
              <button class="text-gray-300 hover:text-white" @click="removeParticipant(pid)">✕</button>
            </span>
          </div>
        </div>
      </div>
      <div class="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
        <button
          @click="showChannelModal = false"
          class="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
        >
          {{ t('common.actions.cancel') }}
        </button>
        <button
          @click="createChannel"
          :disabled="creatingChannel || newChannel.participantIds.length === 0"
          class="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded hover:opacity-90 disabled:opacity-50"
        >
          {{ creatingChannel ? t('common.chat.creating') : t('common.chat.createChannel') }}
        </button>
      </div>
    </div>
  </div>
</template>
