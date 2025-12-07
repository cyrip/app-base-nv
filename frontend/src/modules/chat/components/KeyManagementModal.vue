<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../auth/stores/auth';
import { useI18n } from 'vue-i18n';
import encryptionService from '../../../services/encryption';
import axios from 'axios';

const { t } = useI18n();
const authStore = useAuthStore();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const emit = defineEmits(['close']);

const hasKeys = ref(false);
const fingerprint = ref('');
const keyType = ref('');
const createdAt = ref('');
const loading = ref(false);
const generating = ref(false);
const error = ref('');
const success = ref('');

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${authStore.token}` }
});

const checkKeyStatus = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    // Check browser support
    try {
      encryptionService.checkBrowserSupport();
    } catch (e) {
      error.value = e.message;
      loading.value = false;
      return;
    }

    // Check for private mode with timeout
    let isPrivateMode = false;
    try {
      const privateModePromise = encryptionService.checkPrivateMode();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      isPrivateMode = await Promise.race([privateModePromise, timeoutPromise]);
    } catch (e) {
      console.warn('Private mode check failed or timed out:', e);
      // Continue anyway - we'll catch errors later if there are issues
    }
    
    if (isPrivateMode) {
      error.value = 'Private/Incognito mode detected. Encryption keys cannot be stored. Please use normal browsing mode.';
      loading.value = false;
      return;
    }

    // Check local keys
    const localHasKeys = await encryptionService.hasKeys(authStore.user.id);
    
    // Check server status
    const res = await axios.get(`${API_URL}/api/users/me/encryption/status`, authHeaders());
    
    hasKeys.value = localHasKeys && res.data.hasKeys;
    
    if (res.data.hasKeys) {
      fingerprint.value = res.data.publicKeyFingerprint;
      keyType.value = res.data.keyType;
      createdAt.value = res.data.keyCreatedAt;
    }
  } catch (e) {
    console.error('Failed to check key status:', e);
    
    // Provide user-friendly error message
    if (e.message.includes('Web Crypto API')) {
      error.value = 'Your browser does not support encryption. Please update to a modern browser (Chrome, Firefox, Safari, or Edge).';
    } else if (e.message.includes('Private/Incognito')) {
      error.value = 'Private browsing mode detected. Encryption keys cannot be stored in private mode. Please use normal browsing mode.';
    } else if (!navigator.onLine) {
      error.value = 'No internet connection. Please check your network and try again.';
    } else if (e.response?.status === 401) {
      error.value = 'Session expired. Please log in again.';
    } else {
      error.value = `Failed to check encryption key status: ${e.message || 'Unknown error'}. Please refresh the page and try again.`;
    }
  } finally {
    loading.value = false;
  }
};

const generateKeys = async () => {
  generating.value = true;
  error.value = '';
  success.value = '';
  
  try {
    // Generate key pair (takes ~1 second for RSA-4096)
    const keys = await encryptionService.generateKeyPair();
    
    // Store private key locally
    await encryptionService.storePrivateKey(authStore.user.id, keys.privateKey);
    
    // Upload public key to server
    await axios.post(`${API_URL}/api/users/keys`, {
      publicKey: keys.publicKey,
      fingerprint: keys.fingerprint,
      algorithm: keys.algorithm
    }, authHeaders());
    
    // Update UI
    hasKeys.value = true;
    fingerprint.value = keys.fingerprint;
    keyType.value = keys.algorithm;
    createdAt.value = new Date().toISOString();
    
    success.value = 'Encryption keys generated successfully!';
  } catch (e) {
    console.error('Failed to generate keys:', e);
    
    // Provide user-friendly error message with actionable suggestions
    if (e.message.includes('Web Crypto API')) {
      error.value = 'Your browser does not support encryption. Please update to a modern browser.';
    } else if (e.message.includes('already exists')) {
      error.value = 'You already have encryption keys. If you want to generate new keys, please export your current keys first as a backup.';
    } else if (e.response?.status === 409) {
      error.value = 'A key with this fingerprint already exists. This is unusual - please contact support.';
    } else if (!navigator.onLine) {
      error.value = 'No internet connection. Keys were generated locally but could not be uploaded to the server. Please check your connection and try again.';
    } else if (e.response?.status === 401) {
      error.value = 'Your session has expired. Please log in again.';
    } else {
      error.value = 'Failed to generate encryption keys. Please try again or contact support if the problem persists.';
    }
  } finally {
    generating.value = false;
  }
};

const exportKeys = async () => {
  try {
    const blob = await encryptionService.exportKeys(authStore.user.id);
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `encryption-keys-backup-${authStore.user.id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    success.value = 'Keys exported successfully. Store this file securely!';
  } catch (e) {
    console.error('Failed to export keys:', e);
    
    // Provide user-friendly error message
    if (e.message.includes('Private key not found')) {
      error.value = 'No encryption keys found to export. Please generate keys first.';
    } else {
      error.value = 'Failed to export encryption keys. Please try again.';
    }
  }
};

const handleImportFile = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  loading.value = true;
  error.value = '';
  success.value = '';
  
  try {
    await encryptionService.importKeys(authStore.user.id, file);
    await checkKeyStatus();
    success.value = 'Keys imported successfully!';
  } catch (e) {
    console.error('Failed to import keys:', e);
    
    // Provide user-friendly error message with actionable suggestions
    if (e.message.includes('Invalid backup file')) {
      error.value = 'Invalid backup file format. Please select a valid encryption keys backup file (.json).';
    } else if (e.message.includes('JSON')) {
      error.value = 'The backup file is corrupted or invalid. Please check the file and try again.';
    } else {
      error.value = 'Failed to import encryption keys. Please ensure you selected the correct backup file and try again.';
    }
  } finally {
    loading.value = false;
    // Reset file input
    event.target.value = '';
  }
};

const formatFingerprint = (fp) => {
  if (!fp) return '';
  // Format as: XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX
  return fp.match(/.{1,4}/g)?.join(' ') || fp;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString();
};

const clearAllData = async () => {
  if (!confirm('⚠️ WARNING: This will delete ALL your encryption keys from this browser.\n\nYou will NOT be able to decrypt old messages unless you have a backup.\n\nAre you sure you want to continue?')) {
    return;
  }
  
  loading.value = true;
  error.value = '';
  success.value = '';
  
  try {
    // Delete IndexedDB database
    await encryptionService.deleteAllKeys();
    
    // Clear state
    hasKeys.value = false;
    fingerprint.value = '';
    keyType.value = '';
    createdAt.value = '';
    
    success.value = 'All encryption data cleared from browser. You can now generate new keys.';
  } catch (e) {
    console.error('Failed to clear data:', e);
    error.value = 'Failed to clear encryption data. Please try again or manually clear browser data.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  checkKeyStatus();
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="bg-[#0a0a1f] border border-neon-blue/30 rounded-xl shadow-2xl w-full max-w-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h3 class="text-lg font-bold text-white">🔐 Encryption Key Management</h3>
          <p class="text-xs text-gray-400">Manage your end-to-end encryption keys</p>
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
        <div v-if="loading && !generating" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
          <p class="text-sm text-gray-400 mt-2">Loading...</p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {{ error }}
        </div>

        <!-- Success Message -->
        <div v-if="success" class="px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
          {{ success }}
        </div>

        <!-- No Keys State -->
        <div v-if="!loading && !hasKeys" class="space-y-4">
          <div class="px-4 py-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div class="flex items-start gap-3">
              <span class="text-2xl">⚠️</span>
              <div class="flex-1">
                <h4 class="text-sm font-bold text-yellow-400 mb-1">No Encryption Keys Found</h4>
                <p class="text-xs text-gray-300">
                  You need to generate encryption keys to send and receive encrypted messages.
                  Keys are generated locally in your browser and your private key never leaves your device.
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <button
              @click="generateKeys"
              :disabled="generating"
              class="w-full px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              title="Generate a new RSA-4096 key pair for end-to-end encryption"
            >
              <span v-if="generating" class="flex items-center justify-center gap-2">
                <span class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Generating Keys... (this may take a moment)
              </span>
              <span v-else>🔑 Generate Encryption Keys</span>
            </button>

            <div class="text-center text-xs text-gray-400">or</div>

            <label class="block" title="Restore your encryption keys from a previously exported backup file">
              <input
                type="file"
                accept=".json"
                @change="handleImportFile"
                class="hidden"
              />
              <div class="w-full px-4 py-3 text-sm font-bold text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 cursor-pointer text-center transition-colors">
                📁 Import Keys from Backup
              </div>
            </label>
          </div>

          <div class="px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h4 class="text-xs font-bold text-blue-400 mb-2">About Encryption Keys</h4>
            <ul class="text-xs text-gray-300 space-y-1">
              <li>• Keys use RSA-4096 encryption (industry standard)</li>
              <li>• Your private key is stored securely in your browser</li>
              <li>• Your public key is shared with other users</li>
              <li>• Generation takes ~1 second</li>
            </ul>
          </div>
        </div>

        <!-- Has Keys State -->
        <div v-if="!loading && hasKeys" class="space-y-4">
          <div class="px-4 py-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div class="flex items-start gap-3">
              <span class="text-2xl">✅</span>
              <div class="flex-1">
                <h4 class="text-sm font-bold text-green-400 mb-1">Encryption Keys Active</h4>
                <p class="text-xs text-gray-300">
                  Your encryption keys are set up and ready to use.
                </p>
              </div>
            </div>
          </div>

          <!-- Key Details -->
          <div class="space-y-3">
            <div class="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
              <div class="text-xs text-gray-400 mb-1">Key Type</div>
              <div class="text-sm text-white font-mono">{{ keyType || 'RSA-4096' }}</div>
            </div>

            <div class="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
              <div class="text-xs text-gray-400 mb-1">
                Fingerprint
                <span class="ml-1 text-gray-500" title="A unique identifier for your public key. Share this with others to verify your identity.">ℹ️</span>
              </div>
              <div class="text-xs text-white font-mono break-all">{{ formatFingerprint(fingerprint) }}</div>
              <p class="text-xs text-gray-500 mt-1">Use this to verify your identity with other users</p>
            </div>

            <div class="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
              <div class="text-xs text-gray-400 mb-1">Created</div>
              <div class="text-sm text-white">{{ formatDate(createdAt) }}</div>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-2">
            <button
              @click="exportKeys"
              class="w-full px-4 py-2 text-sm font-bold text-white bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
              title="Download an encrypted backup of your private key. Store this file securely!"
            >
              💾 Export Keys (Backup)
            </button>

            <div class="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <h4 class="text-xs font-bold text-yellow-400 mb-1">⚠️ Important</h4>
              <p class="text-xs text-gray-300">
                Export and securely store your keys. If you lose them, you won't be able to decrypt old messages.
                Never share your backup file with anyone.
              </p>
            </div>

            <!-- Danger Zone -->
            <div class="mt-6 pt-4 border-t border-red-500/30">
              <div class="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-2">
                <h4 class="text-xs font-bold text-red-400 mb-1">🚨 Danger Zone</h4>
                <p class="text-xs text-gray-300">
                  Clearing encryption data will permanently delete your keys from this browser.
                  You will NOT be able to decrypt old messages unless you have a backup.
                </p>
              </div>
              <button
                @click="clearAllData"
                :disabled="loading"
                class="w-full px-4 py-2 text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                title="Permanently delete all encryption keys from this browser"
              >
                🗑️ Clear All Encryption Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-white/10 flex justify-end">
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
