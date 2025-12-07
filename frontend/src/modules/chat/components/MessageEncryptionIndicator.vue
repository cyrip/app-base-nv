<script setup>
import { computed } from 'vue';

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
});

const statusIcon = computed(() => {
  if (!props.message.encrypted) {
    return '🔓';
  }
  
  if (props.message.decryptionError) {
    return '⚠️';
  }
  
  if (props.message.signatureValid === false) {
    return '⚠️';
  }
  
  if (props.message.signatureValid === true) {
    return '🔒✓';
  }
  
  return '🔒';
});

const statusText = computed(() => {
  if (!props.message.encrypted) {
    return 'Unencrypted';
  }
  
  if (props.message.decryptionError === 'NO_KEYS') {
    return 'Encrypted - Generate keys to read';
  }
  
  if (props.message.decryptionError === 'NO_SESSION_KEY') {
    return 'Encrypted - Session key not available';
  }
  
  if (props.message.decryptionError === 'DECRYPTION_FAILED') {
    return 'Encrypted - Decryption failed';
  }
  
  if (props.message.signatureValid === false) {
    return 'Encrypted - Signature verification failed';
  }
  
  if (props.message.signatureValid === true) {
    return 'Encrypted & Verified';
  }
  
  return 'Encrypted';
});

const statusColor = computed(() => {
  if (!props.message.encrypted) {
    return 'text-gray-400';
  }
  
  if (props.message.decryptionError || props.message.signatureValid === false) {
    return 'text-yellow-400';
  }
  
  if (props.message.signatureValid === true) {
    return 'text-green-400';
  }
  
  return 'text-blue-400';
});
</script>

<template>
  <span 
    :class="['text-[10px] flex items-center gap-1', statusColor]"
    :title="statusText"
  >
    <span>{{ statusIcon }}</span>
    <span class="hidden sm:inline">{{ statusText }}</span>
  </span>
</template>
