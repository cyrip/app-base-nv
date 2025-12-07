<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../auth/stores/auth';
import axios from 'axios';
import encryptionService from '../../../services/encryption';

const props = defineProps({
  channel: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['encryption-enabled', 'reload-channel', 'show-info']);

const authStore = useAuthStore();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const loading = ref(false);
const encryptionStatus = ref(null);
const showConfirmDialog = ref(false);
const error = ref('');

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${authStore.token}` }
});

const isEncrypted = computed(() => {
  return props.channel?.encryptionEnabled || encryptionStatus.value?.enabled || false;
});

const canEnable = computed(() => {
  if (!encryptionStatus.value) return false;
  return encryptionStatus.value.participantsMissingKeys.length === 0;
});

const checkEncryptionStatus = async () => {
  if (!props.channel?.id) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    const res = await axios.get(
      `${API_URL}/api/channels/${props.channel.id}/encryption/status`,
      authHeaders()
    );
    encryptionStatus.value = res.data;
  } catch (e) {
    console.error('Failed to check encryption status:', e);
    
    // Provide user-friendly error message
    if (e.response?.status === 404) {
      error.value = 'Channel not found';
    } else if (!navigator.onLine) {
      error.value = 'No internet connection';
    } else {
      error.value = 'Failed to check encryption status. Please refresh the page.';
    }
  } finally {
    loading.value = false;
  }
};

const enableEncryption = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    // Check if current user has keys
    const hasKeys = await encryptionService.hasKeys(authStore.user.id);
    if (!hasKeys) {
      error.value = 'You need to generate encryption keys first';
      showConfirmDialog.value = false;
      loading.value = false;
      return;
    }

    // Get all participant public keys
    const keysRes = await axios.get(
      `${API_URL}/api/channels/${props.channel.id}/participants/keys`,
      authHeaders()
    );
    const participantKeys = keysRes.data;
    
    console.log('[EncryptionToggle] Participant keys:', participantKeys);
    console.log('[EncryptionToggle] Number of participants:', participantKeys.length);
    
    // Log detailed info about each participant's key
    participantKeys.forEach(p => {
      console.log(`[EncryptionToggle] User ${p.userId}: fingerprint=${p.fingerprint?.substring(0, 20)}..., publicKey starts with: ${p.publicKey?.substring(0, 50)}...`);
    });

    // Generate session key
    const sessionKey = await encryptionService.generateSessionKey();
    console.log('[EncryptionToggle] Session key generated');

    // STEP 1: Enable encryption on channel FIRST
    await axios.post(
      `${API_URL}/api/channels/${props.channel.id}/encryption/enable`,
      { confirm: true },
      authHeaders()
    );
    console.log('[EncryptionToggle] Encryption enabled on channel');

    // STEP 2: Encrypt and store session keys for each participant
    const sessionKeyPromises = participantKeys.map(async (participant) => {
      console.log('[EncryptionToggle] Encrypting session key for user:', participant.userId);
      console.log('[EncryptionToggle] Using public key with fingerprint:', participant.fingerprint?.substring(0, 40) + '...');
      console.log('[EncryptionToggle] Public key starts with:', participant.publicKey?.substring(0, 50) + '...');
      
      const encryptedKey = await encryptionService.encryptSessionKey(
        sessionKey,
        participant.publicKey
      );
      
      console.log('[EncryptionToggle] Encrypted session key for user', participant.userId, '- encrypted key starts with:', encryptedKey.substring(0, 50) + '...');
      
      // Store encrypted session key on server using the participant-specific endpoint
      const response = await axios.post(
        `${API_URL}/api/channels/${props.channel.id}/participants/${participant.userId}/session-key`,
        {
          encryptedSessionKey: encryptedKey
        },
        authHeaders()
      );
      console.log('[EncryptionToggle] Session key stored for user:', participant.userId, response.data);
    });

    await Promise.all(sessionKeyPromises);
    console.log('[EncryptionToggle] All session keys stored');

    // Reload channel status
    await checkEncryptionStatus();
    
    showConfirmDialog.value = false;
    emit('encryption-enabled');
    emit('reload-channel');
  } catch (e) {
    console.error('[EncryptionToggle] Failed to enable encryption:', e);
    console.error('[EncryptionToggle] Error details:', e.response?.data || e.message);
    
    // Show alert for debugging
    alert(`Encryption enable failed: ${e.response?.data?.error || e.message}`);
    
    // Provide user-friendly error messages with actionable suggestions
    if (e.message.includes('need to generate encryption keys')) {
      error.value = 'You need to generate encryption keys first. Click "🔐 Encryption Keys" to get started.';
    } else if (e.response?.data?.error?.includes('do not have encryption keys')) {
      error.value = 'Some participants do not have encryption keys. All participants must generate keys before enabling encryption.';
    } else if (e.response?.status === 409) {
      error.value = 'Encryption is already enabled for this channel.';
    } else if (e.response?.status === 404) {
      error.value = 'Channel not found. It may have been deleted.';
    } else if (!navigator.onLine) {
      error.value = 'No internet connection. Please check your network and try again.';
    } else if (e.response?.status === 401) {
      error.value = 'Your session has expired. Please log in again.';
    } else {
      error.value = 'Failed to enable encryption. Please try again or contact support if the problem persists.';
    }
  } finally {
    loading.value = false;
  }
};

const openConfirmDialog = async () => {
  await checkEncryptionStatus();
  
  if (!canEnable.value) {
    const missingCount = encryptionStatus.value?.participantsMissingKeys?.length || 0;
    error.value = `Cannot enable encryption: ${missingCount} participant(s) do not have encryption keys. All participants must generate keys first.`;
    return;
  }
  
  showConfirmDialog.value = true;
};

onMounted(() => {
  checkEncryptionStatus();
});
</script>

<template>
  <div class="inline-flex items-center gap-2">
    <!-- Encryption Status Indicator -->
    <button
      @click="emit('show-info')"
      class="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors hover:opacity-80"
      :class="isEncrypted ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'"
      :title="isEncrypted ? 'Click to view encryption details' : 'Encryption not enabled'"
    >
      <span>{{ isEncrypted ? '🔒' : '🔓' }}</span>
      <span>{{ isEncrypted ? 'Encrypted' : 'Not Encrypted' }}</span>
    </button>

    <!-- Enable Button (only show if not encrypted) -->
    <button
      v-if="!isEncrypted"
      @click="openConfirmDialog"
      :disabled="loading"
      class="px-3 py-1 text-xs font-semibold text-white bg-neon-blue/20 hover:bg-neon-blue/40 border border-neon-blue/30 rounded transition-colors disabled:opacity-50"
      title="Enable end-to-end encryption for this channel. All participants must have encryption keys. Once enabled, encryption cannot be disabled."
    >
      Enable Encryption
    </button>

    <!-- Error Message -->
    <div v-if="error" class="text-xs text-red-400">
      {{ error }}
    </div>

    <!-- Confirmation Dialog -->
    <div v-if="showConfirmDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="bg-[#0a0a1f] border border-neon-blue/30 rounded-xl shadow-2xl w-full max-w-md">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-white/10">
          <h3 class="text-lg font-bold text-white">🔒 Enable End-to-End Encryption</h3>
        </div>

        <!-- Content -->
        <div class="px-6 py-5 space-y-4">
          <div class="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <h4 class="text-sm font-bold text-yellow-400 mb-2">⚠️ Important Information</h4>
            <ul class="text-xs text-gray-300 space-y-1">
              <li>• Once enabled, encryption <strong>cannot be disabled</strong></li>
              <li>• All future messages will be encrypted</li>
              <li>• Previous messages will remain unencrypted</li>
              <li>• All participants must have encryption keys</li>
              <li>• If you lose your keys, you cannot decrypt messages</li>
            </ul>
          </div>

          <div v-if="encryptionStatus" class="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
            <h4 class="text-xs font-bold text-gray-400 mb-2">Participants Status</h4>
            <div class="space-y-1">
              <div class="text-xs text-green-400">
                ✓ {{ encryptionStatus.participantsWithKeys.length }} participant(s) with keys
              </div>
              <div v-if="encryptionStatus.participantsMissingKeys.length > 0" class="text-xs text-red-400">
                ✗ {{ encryptionStatus.participantsMissingKeys.length }} participant(s) without keys
              </div>
            </div>
          </div>

          <div class="px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p class="text-xs text-gray-300">
              This will generate a secure session key and encrypt it for all participants.
              Only participants with their private keys will be able to read encrypted messages.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            @click="showConfirmDialog = false"
            :disabled="loading"
            class="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            @click="enableEncryption"
            :disabled="loading || !canEnable"
            class="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <span v-if="loading" class="flex items-center gap-2">
              <span class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              Enabling...
            </span>
            <span v-else>Enable Encryption</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
