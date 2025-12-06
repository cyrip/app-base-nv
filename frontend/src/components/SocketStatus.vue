<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    <!-- Connection Status -->
    <div
      class="px-4 py-2 rounded-full backdrop-blur-md border shadow-lg transition-all duration-300 flex items-center gap-2 pointer-events-auto"
      :class="[
        socketState.connected
          ? 'bg-neon-blue/10 border-neon-blue/50 text-neon-blue'
          : 'bg-red-500/10 border-red-500/50 text-red-500',
      ]"
    >
      <div
        class="w-2 h-2 rounded-full animate-pulse"
        :class="[socketState.connected ? 'bg-neon-blue' : 'bg-red-500']"
      ></div>
      <span class="text-sm font-bold">{{
        socketState.connected ? "Connected" : "Disconnected"
      }}</span>
    </div>

    <!-- Messages List -->
    <TransitionGroup
      name="list"
      tag="div"
      class="flex flex-col gap-2 items-end"
    >
      <div
        v-for="msg in socketState.messages"
        :key="msg.id"
        class="pointer-events-auto max-w-xs px-4 py-3 rounded-lg backdrop-blur-md bg-deep-space/80 border border-white/10 shadow-xl text-sm text-gray-200 relative group"
      >
        <button 
          @click="removeMessage(msg.id)"
          class="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Close"
        >
          <svg class="w-3 h-3 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <div class="flex justify-between items-start gap-2 mb-1 pr-6">
          <span
            class="text-xs font-bold uppercase tracking-wider"
            :class="msg.type === 'info' ? 'text-neon-purple' : 'text-neon-blue'"
            >{{ msg.type }}</span
          >
          <span class="text-xs text-gray-500">{{ msg.timestamp }}</span>
        </div>
        <p>{{ msg.content }}</p>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { socketState } from "../services/socket";
import { watch } from 'vue';

const removeMessage = (messageId) => {
  const index = socketState.messages.findIndex(m => m.id === messageId);
  if (index > -1) {
    socketState.messages.splice(index, 1);
  }
};

// Auto-remove messages after 10 seconds
watch(() => socketState.messages.length, () => {
  socketState.messages.forEach(message => {
    if (!message.timeoutId) {
      message.timeoutId = setTimeout(() => {
        removeMessage(message.id);
      }, 10000); // 10 seconds
    }
  });
});
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
