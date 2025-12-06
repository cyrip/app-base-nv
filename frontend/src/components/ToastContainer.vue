<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
    <TransitionGroup name="toast" tag="div" class="flex flex-col gap-2">
      <div
        v-for="toast in toastService.state.toasts"
        :key="toast.id"
        class="px-4 py-3 rounded-lg backdrop-blur-md border shadow-lg transition-all duration-300 relative group min-w-[300px]"
        :class="{
          'bg-green-500/10 border-green-500/30': toast.type === 'success',
          'bg-red-500/10 border-red-500/30': toast.type === 'error',
          'bg-yellow-500/10 border-yellow-500/30': toast.type === 'warning',
          'bg-blue-500/10 border-blue-500/30': toast.type === 'info'
        }"
      >
        <button 
          @click="toastService.remove(toast.id)"
          class="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          :aria-label="t('common.actions.close')"
        >
          <svg class="w-3 h-3 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <div class="flex items-start gap-3 pr-6">
          <div class="flex-shrink-0 mt-0.5">
            <!-- Success Icon -->
            <svg v-if="toast.type === 'success'" class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <!-- Error Icon -->
            <svg v-else-if="toast.type === 'error'" class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <!-- Warning Icon -->
            <svg v-else-if="toast.type === 'warning'" class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <!-- Info Icon -->
            <svg v-else class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-white font-medium">{{ toast.message }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ toast.timestamp }}</p>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { toastService } from '../services/toastService';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}
</style>
