<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../auth/stores/auth';
import axios from 'axios';

const props = defineProps({
  channel: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close']);

const authStore = useAuthStore();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const loading = ref(false);
const encryptionStatus = ref(null);
const participantKeys = ref([]);
const error = ref('');

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${authStore.token}` }
});

const formatFingerprint = (fp) => {
  if (!fp) return '';
  // Format as: XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX
  return fp.match(/.{1,4}/g)?.join(' ') || fp;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString();
};

const loadEncryptionInfo = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    // Get encryption status
    const statusRes = await axios.get(
      `${API_URL}/api/channels/${props.channel.id}/encryption/status`,
      authHeaders()
    );
    encryptionStatus.value = statusRes.data;

    // Get participant keys
    const keysRes = await axios.get(
      `${API_URL}/api/channels/${props.channel.id}/participants/keys`,
      authHeaders()
    );
    participantKeys.value = keysRes.data;
  } catch (e) {
    console.error('Failed to load encryption info:', e);
    
    // Provide user-friendly error message
    if (e.response?.status === 404) {
      error.value = 'Channel not found. It may have been deleted.';
    } else if (e.response?.status === 403) {
      error.value = 'You do not have permission to view encryption information for this channel.';
    } else if (!navigator.onLine) {
      error.value = 'No internet connection. Please check your network and try again.';
    } else {
      error.value = 'Failed to load encryption information. Please try again.';
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadEncryptionInfo();
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="bg-[#0a0a1f] border border-neon-blue/30 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[#0a0a1f] z-10">
        <div>
          <h3 class="text-lg font-bold text-white">🔒 Encryption Information</h3>
          <p class="text-xs text-gray-400">{{ channel.name || 'Direct Channel' }}</p>
        </div>
        <button
          @click="emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-5 space-y-4">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
          <p class="text-sm text-gray-400 mt-2">Loading encryption information...</p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {{ error }}
        </div>

        <!-- Encryption Status -->
        <div v-if="!loading && encryptionStatus" class="space-y-4">
          <!-- Status Overview -->
          <div class="px-4 py-4 bg-white/5 border border-white/10 rounded-lg">
            <div class="flex items-center gap-3 mb-3">
              <span class="text-2xl">{{ encryptionStatus.enabled ? '🔒' : '🔓' }}</span>
              <div>
                <h4 class="text-sm font-bold text-white">
                  {{ encryptionStatus.enabled ? 'Encryption Enabled' : 'Encryption Disabled' }}
                </h4>
                <p class="text-xs text-gray-400">
                  {{ encryptionStatus.enabled ? 'All messages are end-to-end encrypted' : 'Messages are not encrypted' }}
                </p>
              </div>
            </div>

            <div v-if="encryptionStatus.enabled" class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-400">Enabled At:</span>
                <span class="text-white">{{ formatDate(encryptionStatus.enabledAt) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Enabled By:</span>
                <span class="text-white">User ID {{ encryptionStatus.enabledBy }}</span>
              </div>
            </div>
          </div>

          <!-- Participant Keys -->
          <div class="space-y-3">
            <h4 class="text-sm font-bold text-white">Participant Encryption Keys</h4>
            
            <div v-if="participantKeys.length === 0" class="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs">
              No participants have encryption keys yet.
            </div>

            <div v-for="key in participantKeys" :key="key.id" class="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <div class="text-sm font-semibold text-white">User ID: {{ key.userId }}</div>
                  <div class="text-xs text-gray-400">{{ key.keyType }}</div>
                </div>
                <span class="text-xs text-green-400">✓ Active</span>
              </div>

              <div class="space-y-2">
                <div>
                  <div class="text-xs text-gray-400 mb-1">Fingerprint</div>
                  <div class="text-xs text-white font-mono break-all bg-black/30 px-2 py-1 rounded">
                    {{ formatFingerprint(key.fingerprint) }}
                  </div>
                </div>

                <div class="text-xs text-gray-400">
                  Created: {{ formatDate(key.createdAt) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Security Information -->
          <div class="px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h4 class="text-xs font-bold text-blue-400 mb-2">🛡️ Security Information</h4>
            <ul class="text-xs text-gray-300 space-y-1">
              <li>• Messages are encrypted with AES-256-GCM</li>
              <li>• Keys are exchanged using RSA-4096</li>
              <li>• Each message is signed to verify authenticity</li>
              <li>• Private keys never leave your device</li>
              <li>• Session keys are unique per channel</li>
            </ul>
          </div>

          <!-- Fingerprint Verification -->
          <div class="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <h4 class="text-xs font-bold text-yellow-400 mb-2">⚠️ Fingerprint Verification</h4>
            <p class="text-xs text-gray-300">
              To ensure secure communication, verify participant fingerprints through a separate secure channel 
              (e.g., in person, phone call, or video chat). This prevents man-in-the-middle attacks.
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-white/10 flex justify-end sticky bottom-0 bg-[#0a0a1f]">
        <button
          @click="emit('close')"
          class="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
