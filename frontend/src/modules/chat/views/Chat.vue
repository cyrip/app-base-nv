<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../../auth/stores/auth';
import { useI18n } from 'vue-i18n';
import { socketState, getSocket } from '../../../services/socket';
import { useServices } from '../../../services/serviceContainer';
import KeyManagementModal from '../components/KeyManagementModal.vue';
import EncryptionToggle from '../components/EncryptionToggle.vue';
import EncryptionInfoModal from '../components/EncryptionInfoModal.vue';
import MessageEncryptionIndicator from '../components/MessageEncryptionIndicator.vue';
import EncryptionWarningBanner from '../components/EncryptionWarningBanner.vue';
import encryptionService from '../../../services/encryption';
import { retryWithBackoff } from '../../../utils/retryWithBackoff';

const authStore = useAuthStore();
const { t } = useI18n();
const { toast } = useServices();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const channels = ref([]);
const users = ref([]);
const activeChannelId = ref(null);
const messages = ref([]);
const loadingMessages = ref(false);
const creatingChannel = ref(false);
const showChannelModal = ref(false);
const showKeyManagementModal = ref(false);
const showEncryptionInfoModal = ref(false);
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
const sendingMessage = ref(false);
const encryptionError = ref('');

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
  
  // Join the channel room via socket
  const socket = getSocket();
  if (socket) {
    socket.emit('join-channel', { channelId });
    console.log('[chat] Joining channel room:', channelId);
  }
  
  await loadMessages(channelId);
};

const loadMessages = async (channelId) => {
  loadingMessages.value = true;
  try {
    const res = await axios.get(`${API_URL}/channels/${channelId}/messages`, authHeaders());
    const loadedMessages = res.data.reverse();
    
    // Mark encrypted messages as pending decryption
    loadedMessages.forEach(msg => {
      if (msg.encrypted && msg.encryptionMetadata) {
        msg.decryptionPending = true;
      }
    });
    
    messages.value = loadedMessages;
    
    // Set up intersection observer for lazy decryption
    setupLazyDecryption();
  } catch (e) {
    console.error('Failed to load messages', e);
    messages.value = [];
  } finally {
    loadingMessages.value = false;
  }
};

// Cache for decryption resources
const decryptionCache = reactive({
  privateKey: null,
  sessionKeys: new Map(), // channelId -> sessionKey
  publicKeys: new Map() // userId -> publicKey
});

// Intersection observer for lazy decryption
let messageObserver = null;
const pendingDecryption = new Set();

const setupLazyDecryption = () => {
  // Clean up existing observer
  if (messageObserver) {
    messageObserver.disconnect();
  }
  
  // Create new observer
  messageObserver = new IntersectionObserver(
    (entries) => {
      const visibleMessages = entries
        .filter(entry => entry.isIntersecting)
        .map(entry => {
          const msgId = parseInt(entry.target.dataset.messageId);
          return messages.value.find(m => m.id === msgId);
        })
        .filter(msg => msg && msg.encrypted && msg.decryptionPending && !pendingDecryption.has(msg.id));
      
      if (visibleMessages.length > 0) {
        decryptMessagesBatch(visibleMessages);
      }
    },
    {
      root: null,
      rootMargin: '100px', // Start decrypting slightly before message is visible
      threshold: 0.1
    }
  );
  
  // Observe all message elements after next tick
  setTimeout(() => {
    const messageElements = document.querySelectorAll('[data-message-id]');
    messageElements.forEach(el => messageObserver.observe(el));
  }, 100);
};

const decryptMessagesBatch = async (messageList) => {
  if (messageList.length === 0) return;
  
  // Mark messages as being processed
  messageList.forEach(msg => pendingDecryption.add(msg.id));
  
  // Get user's private key once (cached)
  if (!decryptionCache.privateKey) {
    try {
      const hasKeys = await encryptionService.hasKeys(authStore.user.id);
      if (hasKeys) {
        decryptionCache.privateKey = await encryptionService.getPrivateKey(authStore.user.id);
      }
    } catch (e) {
      console.error('Failed to get private key:', e);
    }
  }
  
  const privateKey = decryptionCache.privateKey;
  
  // Decrypt messages in parallel
  await Promise.all(messageList.map(async (msg) => {
    try {
      if (!privateKey) {
        msg.decryptionError = 'NO_KEYS';
        msg.decryptedContent = null;
        msg.decryptionPending = false;
        return;
      }
      
      // Get session key if not cached
      const channelId = msg.channelId;
      if (!decryptionCache.sessionKeys.has(channelId)) {
        try {
          const sessionKeyRes = await retryWithBackoff(
            () => axios.get(
              `${API_URL}/api/channels/${channelId}/session-keys/me`,
              authHeaders()
            ),
            { maxRetries: 2 }
          );
          const sessionKey = await encryptionService.decryptSessionKey(
            sessionKeyRes.data.encryptedSessionKey,
            privateKey
          );
          decryptionCache.sessionKeys.set(channelId, sessionKey);
        } catch (e) {
          console.error('Failed to get session key:', e);
          msg.decryptionError = 'NO_SESSION_KEY';
          msg.decryptedContent = null;
          msg.decryptionPending = false;
          return;
        }
      }
      
      const sessionKey = decryptionCache.sessionKeys.get(channelId);
      
      // Verify signature if available
      if (msg.encryptionMetadata.signature && msg.FromUser) {
        try {
          // Get sender's public key (cached)
          if (!decryptionCache.publicKeys.has(msg.fromUserId)) {
            const senderKeyRes = await retryWithBackoff(
              () => axios.get(
                `${API_URL}/api/users/${msg.fromUserId}/public-key`,
                authHeaders()
              ),
              { maxRetries: 2 }
            );
            decryptionCache.publicKeys.set(msg.fromUserId, senderKeyRes.data.publicKey);
          }
          
          const senderPublicKey = decryptionCache.publicKeys.get(msg.fromUserId);
          const isValid = await encryptionService.verifySignature(
            msg.content,
            msg.encryptionMetadata.signature,
            senderPublicKey
          );
          
          msg.signatureValid = isValid;
        } catch (e) {
          console.error('Signature verification failed:', e);
          msg.signatureValid = false;
        }
      }
      
      // Decrypt message content
      const decrypted = await encryptionService.decryptMessage(
        {
          encryptedContent: msg.content,
          iv: msg.encryptionMetadata.iv
        },
        msg.encryptionMetadata.encryptedSessionKeys[0].encryptedKey,
        privateKey
      );
      
      msg.decryptedContent = decrypted;
      msg.decryptionError = null;
      msg.decryptionPending = false;
    } catch (e) {
      console.error('Failed to decrypt message:', e);
      msg.decryptionError = 'DECRYPTION_FAILED';
      msg.decryptedContent = null;
      msg.decryptionPending = false;
    } finally {
      pendingDecryption.delete(msg.id);
    }
  }));
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
  if (!newMessage.value.trim() || !activeChannelId.value || sendingMessage.value) return;
  
  const content = newMessage.value;
  newMessage.value = '';
  sendingMessage.value = true;
  encryptionError.value = '';
  
  try {
    let messageData = { content };
    let displayContent = content;
    
    // Check if channel has encryption enabled
    if (activeChannel.value?.encryptionEnabled) {
      try {
        // Get user's private key
        const privateKey = await encryptionService.getPrivateKey(authStore.user.id);
        
        // Get session key for this channel with retry
        const sessionKeyRes = await retryWithBackoff(
          () => axios.get(
            `${API_URL}/api/channels/${activeChannelId.value}/session-keys/me`,
            authHeaders()
          ),
          { maxRetries: 2 }
        );
        
        // Decrypt session key
        const sessionKey = await encryptionService.decryptSessionKey(
          sessionKeyRes.data.encryptedSessionKey,
          privateKey
        );
        
        // Get all participant public keys with retry
        const keysRes = await retryWithBackoff(
          () => axios.get(
            `${API_URL}/api/channels/${activeChannelId.value}/participants/keys`,
            authHeaders()
          ),
          { maxRetries: 2 }
        );
        const participantKeys = keysRes.data.map(p => p.publicKey);
        
        // Encrypt message
        const encrypted = await encryptionService.encryptMessage(
          content,
          participantKeys,
          sessionKey
        );
        
        // Sign the encrypted content
        const signature = await encryptionService.signMessage(
          encrypted.encryptedContent,
          privateKey
        );
        
        // Prepare encrypted message data
        messageData = {
          content: encrypted.encryptedContent,
          encrypted: true,
          encryptionMetadata: {
            iv: encrypted.iv,
            algorithm: encrypted.algorithm,
            signature,
            encryptedSessionKeys: encrypted.encryptedSessionKeys
          }
        };
        
        displayContent = content; // Keep plaintext for optimistic UI
      } catch (encError) {
        console.error('Encryption failed:', encError);
        
        // Provide user-friendly error messages with actionable suggestions
        let errorMessage = 'Failed to encrypt message. ';
        if (encError.message.includes('Private key not found')) {
          errorMessage += 'Please generate encryption keys first.';
        } else if (encError.message.includes('Session key')) {
          errorMessage += 'Session key not available. Try reloading the page.';
        } else if (encError.message.includes('Public key')) {
          errorMessage += 'Some participants are missing encryption keys.';
        } else {
          errorMessage += encError.message || 'Please try again.';
        }
        
        encryptionError.value = errorMessage;
        sendingMessage.value = false;
        newMessage.value = content; // Restore message
        return;
      }
    }
    
    // Optimistically add message to UI
    const tempMessage = {
      id: Date.now(),
      content: displayContent,
      fromUserId: authStore.user?.id,
      channelId: activeChannelId.value,
      createdAt: new Date().toISOString(),
      encrypted: messageData.encrypted || false,
      FromUser: {
        email: authStore.user?.email
      }
    };
    messages.value.push(tempMessage);
    
    // Send message to server with retry
    const res = await retryWithBackoff(
      () => axios.post(
        `${API_URL}/channels/${activeChannelId.value}/messages`,
        messageData,
        authHeaders()
      ),
      { maxRetries: 2 }
    );
    
    console.log('[chat] Message sent successfully:', res.data);
    
    // Replace temp message with real one from server
    const index = messages.value.findIndex(m => m.id === tempMessage.id);
    if (index !== -1 && res.data) {
      // If encrypted, keep the decrypted content for display
      if (res.data.encrypted) {
        res.data.decryptedContent = displayContent;
      }
      messages.value[index] = res.data;
    }
  } catch (e) {
    console.error('Failed to send message', e);
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to send message. ';
    if (e.response?.status === 400) {
      errorMessage += e.response.data.error || 'Invalid message format.';
    } else if (e.response?.status === 403) {
      errorMessage += 'You do not have permission to send messages in this channel.';
    } else if (e.response?.status === 404) {
      errorMessage += 'Channel not found. It may have been deleted.';
    } else if (!navigator.onLine) {
      errorMessage += 'No internet connection. Please check your network.';
    } else {
      errorMessage += 'Please try again.';
    }
    
    encryptionError.value = errorMessage;
    // Remove temp message on error
    messages.value = messages.value.filter(m => m.id === Date.now());
    newMessage.value = content; // Restore message
  } finally {
    sendingMessage.value = false;
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
    // Check if a direct channel already exists with this user in the local list
    const existingChannel = channels.value.find(ch => {
      const participants = ch.ChannelParticipants || [];
      return ch.type === 'direct' &&
             participants.length === 2 && 
             participants.some(p => p.userId === userId) &&
             participants.some(p => p.userId === authStore.user?.id);
    });

    if (existingChannel) {
      // Open existing channel
      await selectChannel(existingChannel.id);
    } else {
      // Get or create direct channel via the direct endpoint
      const res = await axios.post(`${API_URL}/channels/direct`, {
        userId
      }, authHeaders());
      
      // Add to list if not already there
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
  socket.on('channel:message', async (msg) => {
    console.log('[chat] Received message via socket:', msg);
    
    // Show toast notification for messages from other users
    if (msg.fromUserId !== authStore.user?.id && msg.fromUserId !== null) {
      const channel = channels.value.find(c => c.id === msg.channelId);
      const channelName = channel?.name || t('common.chat.directChannel');
      const senderEmail = msg.FromUser?.email || 'Someone';
      
      // Show different notification based on whether it's the active channel
      if (msg.channelId === activeChannelId.value) {
        // Message in active channel - subtle notification
        toast.info(`${senderEmail}: ${msg.encrypted ? '🔒 Encrypted message' : msg.content.substring(0, 50)}`, 3000);
      } else {
        // Message in another channel - more prominent notification
        toast.info(`💬 ${senderEmail} in ${channelName}: ${msg.encrypted ? '🔒 Encrypted message' : msg.content.substring(0, 50)}`, 5000);
      }
    }
    
    if (msg.channelId === activeChannelId.value) {
      // Avoid duplicates - check if message already exists by ID
      const exists = messages.value.some(m => m.id === msg.id);
      
      // Also check if this is our own message that we just sent (within last 5 seconds)
      const isOwnRecentMessage = msg.fromUserId === authStore.user?.id && 
        messages.value.some(m => 
          m.fromUserId === msg.fromUserId && 
          m.content === msg.content &&
          Math.abs(new Date(m.createdAt) - new Date(msg.createdAt)) < 5000
        );
      
      if (!exists && !isOwnRecentMessage) {
        console.log('[chat] Adding new message to UI');
        // Mark encrypted messages as pending decryption
        if (msg.encrypted && msg.encryptionMetadata) {
          msg.decryptionPending = true;
        }
        messages.value.push(msg);
        
        // Set up observer for new message after next tick
        setTimeout(() => {
          const newMsgElement = document.querySelector(`[data-message-id="${msg.id}"]`);
          if (newMsgElement && messageObserver) {
            messageObserver.observe(newMsgElement);
          }
        }, 100);
      }
    }
  });
  socket.on('channel:created', (channel) => {
    console.log('[chat] Received channel:created event:', channel);
    addChannelIfMissing(channel);
  });
  socket.on('channel:participant-added', async (data) => {
    // If I was added to an encrypted channel and I have keys, encrypt session key for myself
    if (data.userId === authStore.user?.id && data.channelEncrypted && data.participantHasKeys) {
      // Reload channels to show the new channel
      await loadChannels();
    }
    
    // If someone was added to my active channel, reload it
    if (data.channelId === activeChannelId.value) {
      await loadChannels();
    }
  });
  
  socket.on('channel:participant-removed', async (data) => {
    // If participant was removed from an encrypted channel, handle key rotation
    if (data.channelEncrypted && data.requiresKeyRotation) {
      // If this is my active channel, trigger key rotation
      if (data.channelId === activeChannelId.value) {
        await handleKeyRotation(data.channelId);
      }
    }
    
    // Reload channels to update participant list
    await loadChannels();
    
    // If I was removed, clear the active channel
    if (data.userId === authStore.user?.id && data.channelId === activeChannelId.value) {
      activeChannelId.value = null;
      messages.value = [];
    }
  });
};

const handleKeyRotation = async (channelId) => {
  try {
    // Get my private key
    const privateKey = await encryptionService.getPrivateKey(authStore.user.id);
    if (!privateKey) {
      console.error('Cannot rotate keys: no private key');
      return;
    }
    
    // Get current session key with retry
    const sessionKeyRes = await retryWithBackoff(
      () => axios.get(
        `${API_URL}/api/channels/${channelId}/session-keys/me`,
        authHeaders()
      ),
      { maxRetries: 3 }
    );
    
    // Decrypt current session key
    const currentSessionKey = await encryptionService.decryptSessionKey(
      sessionKeyRes.data.encryptedSessionKey,
      privateKey
    );
    
    // Generate new session key
    const newSessionKey = await encryptionService.generateSessionKey();
    
    // Get all current participants' public keys with retry
    const keysRes = await retryWithBackoff(
      () => axios.get(
        `${API_URL}/api/channels/${channelId}/participants/keys`,
        authHeaders()
      ),
      { maxRetries: 3 }
    );
    
    // Encrypt new session key for each participant
    const encryptedSessionKeys = await Promise.all(
      keysRes.data.map(async (participant) => ({
        userId: participant.userId,
        encryptedKey: await encryptionService.encryptSessionKey(
          newSessionKey,
          participant.publicKey
        )
      }))
    );
    
    // Send rotation request to server with retry
    await retryWithBackoff(
      () => axios.post(
        `${API_URL}/api/channels/${channelId}/session-keys/rotate`,
        { encryptedSessionKeys },
        authHeaders()
      ),
      { maxRetries: 3 }
    );
    
    // Clear cached session key to force reload
    decryptionCache.sessionKeys.delete(channelId);
    
    // Reload messages with new session key
    await loadMessages(channelId);
    
    console.log('Session key rotated successfully');
  } catch (error) {
    console.error('Failed to rotate session key:', error);
  }
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
    console.log('[chat] Adding new channel to list:', channelId);
    channels.value.unshift({ ...channel, id: channelId });
  } else {
    console.log('[chat] Channel already exists in list:', channelId);
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

const handleEncryptionEnabled = async () => {
  // Clear decryption cache when encryption is enabled
  decryptionCache.sessionKeys.clear();
  
  // Reload channel to get updated encryption status
  await loadChannels();
  if (activeChannelId.value) {
    await loadMessages(activeChannelId.value);
  }
};

// Clean up observer on unmount
onMounted(async () => {
  await loadChannels();
  await loadUsers();
  setupSocket();
  
  // Clean up on unmount
  return () => {
    if (messageObserver) {
      messageObserver.disconnect();
    }
  };
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
          <div class="flex items-center gap-2">
            <span v-if="ch.encryptionEnabled" class="text-xs" title="End-to-end encrypted">🔒</span>
            <span v-else class="text-xs" title="Not encrypted">🔓</span>
            <span class="text-sm font-bold flex-1">{{ ch.name || t('common.chat.directChannel') }}</span>
          </div>
          <div class="text-xs text-gray-400 truncate">
            {{ (ch.ChannelParticipants || []).map(p => p.User?.email).join(', ') }}
          </div>
        </button>
      </div>
      <div class="pt-3 border-t border-white/10 space-y-2">
        <button
          @click="showChannelModal = true"
          class="w-full px-3 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded hover:opacity-90"
        >
          {{ t('common.chat.newChannel') }}
        </button>
        <button
          @click="showKeyManagementModal = true"
          class="w-full px-3 py-2 text-sm font-bold text-white bg-white/10 border border-white/20 rounded hover:bg-white/20"
          title="Manage your encryption keys - generate, export, or import keys for secure messaging"
        >
          🔐 Encryption Keys
        </button>
      </div>
    </div>

    <div class="md:col-span-3 bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col h-[80vh]">
      <div class="flex items-center justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white">
            {{ activeChannel?.name || t('common.chat.selectChannel') }}
          </h3>
          <p class="text-xs text-gray-400">
            {{ (activeChannel?.ChannelParticipants || []).map(p => p.User?.email).join(', ') }}
          </p>
        </div>
        <EncryptionToggle
          v-if="activeChannel"
          :channel="activeChannel"
          @encryption-enabled="handleEncryptionEnabled"
          @reload-channel="loadChannels"
          @show-info="showEncryptionInfoModal = true"
        />
      </div>

      <!-- Encryption Warning Banner -->
      <EncryptionWarningBanner
        v-if="activeChannel"
        :channel="activeChannel"
        @generate-keys="showKeyManagementModal = true"
      />

      <div class="flex-1 overflow-y-auto space-y-3 pr-2">
        <div v-if="!activeChannelId" class="text-gray-500 text-sm">{{ t('common.chat.selectPrompt') }}</div>
        <div v-else-if="loadingMessages" class="text-gray-400 text-sm">{{ t('common.chat.loading') }}</div>
        <div v-else>
          <div
            v-for="msg in messages"
            :key="msg.id"
            :data-message-id="msg.id"
            :class="[
              'p-3 rounded-lg border text-sm',
              msg.fromUserId === null 
                ? 'mx-auto bg-gray-500/10 border-gray-500/30 text-gray-300 text-center max-w-xl'
                : msg.fromUserId === authStore.user?.id
                  ? 'ml-auto bg-neon-blue/10 border-neon-blue/30 text-white max-w-3xl'
                  : 'mr-auto bg-white/5 border-white/10 text-gray-200 max-w-3xl'
            ]"
          >
            <!-- System Message -->
            <div v-if="msg.fromUserId === null" class="text-xs italic">
              {{ msg.content }}
            </div>
            
            <!-- Regular Message -->
            <template v-else>
              <div class="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <div class="flex items-center gap-2">
                  <span>{{ msg.FromUser?.email || (msg.fromUserId === authStore.user?.id ? 'You' : '') }}</span>
                  <MessageEncryptionIndicator :message="msg" />
                </div>
                <span>{{ new Date(msg.createdAt || msg.timestamp).toLocaleString() }}</span>
              </div>
              
              <!-- Message Content -->
              <div v-if="msg.encrypted && msg.decryptionPending" class="text-gray-400 text-xs italic flex items-center gap-2">
                <span class="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></span>
                <span>Decrypting...</span>
              </div>
              <div v-else-if="msg.encrypted && msg.decryptionError" class="text-yellow-400 text-xs italic">
                <span v-if="msg.decryptionError === 'NO_KEYS'">
                  🔒 [Encrypted message - <button @click="showKeyManagementModal = true" class="underline hover:text-yellow-300">Generate keys</button> to read]
                </span>
                <span v-else-if="msg.decryptionError === 'NO_SESSION_KEY'">
                  🔒 [Encrypted message - Session key not available]
                </span>
                <span v-else>
                  🔒 [Encrypted message - Cannot decrypt]
                </span>
              </div>
              <div v-else-if="msg.encrypted && msg.decryptedContent" class="prose prose-invert max-w-none">
                {{ msg.decryptedContent }}
              </div>
              <div v-else class="prose prose-invert max-w-none" v-html="msg.content"></div>
              
              <!-- Signature Warning -->
              <div v-if="msg.encrypted && msg.signatureValid === false" class="mt-2 text-[10px] text-yellow-400 flex items-center gap-1">
                <span>⚠️</span>
                <span>Warning: Message signature could not be verified</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <!-- Encryption Error -->
        <div v-if="encryptionError" class="mb-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          {{ encryptionError }}
        </div>
        
        <textarea
          v-model="newMessage"
          @keydown="handleKeydown"
          :disabled="sendingMessage"
          class="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue disabled:opacity-50"
          :placeholder="t('common.chat.messagePlaceholder')"
          rows="3"
        ></textarea>
        <div class="flex items-center justify-between mt-2">
          <div class="text-xs text-gray-400">
            <span v-if="activeChannel?.encryptionEnabled" class="flex items-center gap-1" title="All messages in this channel are end-to-end encrypted">
              <span>🔒</span>
              <span>Messages are encrypted</span>
            </span>
            <span v-else class="text-xs text-gray-500" title="Press Enter to send, Ctrl+Enter for new line">
              Tip: Enter to send
            </span>
          </div>
          <button
            @click="sendMessage"
            class="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded hover:opacity-90 disabled:opacity-50"
            :disabled="!activeChannelId || sendingMessage"
            :title="activeChannel?.encryptionEnabled ? 'Send encrypted message (Enter)' : 'Send message (Enter)'"
          >
            <span v-if="sendingMessage" class="flex items-center gap-2">
              <span class="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
              <span v-if="activeChannel?.encryptionEnabled">Encrypting...</span>
              <span v-else>Sending...</span>
            </span>
            <span v-else>{{ t('common.chat.send') }}</span>
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

  <!-- Key Management Modal -->
  <KeyManagementModal
    v-if="showKeyManagementModal"
    @close="showKeyManagementModal = false"
  />

  <!-- Encryption Info Modal -->
  <EncryptionInfoModal
    v-if="showEncryptionInfoModal && activeChannel"
    :channel="activeChannel"
    @close="showEncryptionInfoModal = false"
  />
</template>
