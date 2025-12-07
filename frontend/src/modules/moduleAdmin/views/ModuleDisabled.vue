<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
const key = route.params.key || 'module';
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center">
    <div class="bg-white/5 border border-white/10 rounded-xl p-8 max-w-lg text-center space-y-3">
      <h1 class="text-2xl font-bold text-white">Module disabled</h1>
      <p class="text-gray-300">
        The <span class="font-semibold text-white">{{ key }}</span> module is currently disabled.
      </p>
      <p class="text-sm text-gray-400">
        Please ask an administrator to enable it in Module Admin.
      </p>
    </div>
  </div>
</template>
