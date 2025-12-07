<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../auth/stores/auth';
import encryptionService from '../../../services/encryption';

const props = defineProps({
  channel: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['generate-keys']);

const authStore = useAuthStore();
const hasKeys = ref(false);
const checking = ref(true);

const checkKeys = async () => {
  checking.value = true;
  try {
    hasKeys.value = await encryptionService.hasKeys(authStore.user.id);
  } catch (e) {
    console.error('Failed to check keys:', e);
    hasKeys.value = false;
  } finally {
    checking.value = false;
  }
};

const handleGenerateKeys = () => {
  emit('generate-keys');
};

onMounted(() => {
  checkKeys();
});
</script>

<template>
  <div
    v-if="channel.encryptionEnabled && !checking && !hasKeys"
    class="mb-4 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
  >
    <div class="flex items-start gap-3">
      <span class="text-2xl">⚠️</span>
      <div class="flex-1">
        <h4 class="text-sm font-bold text-yellow-400 mb-1">
          Encryption Keys Required
        </h4>
        <p class="text-xs text-yellow-300 mb-2">
          This channel uses end-to-end encryption, but you don't have encryption keys yet.
          You won't be able to read encrypted messages or send messages until you generate keys.
        </p>
        <button
          @click="handleGenerateKeys"
          class="px-3 py-1.5 text-xs font-bold text-white bg-yellow-600 hover:bg-yellow-700 rounded transition-colors"
        >
          Generate Encryption Keys
        </button>
      </div>
    </div>
  </div>
</template>
