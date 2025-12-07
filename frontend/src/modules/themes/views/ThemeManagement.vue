<script setup>
import { onMounted } from 'vue';
import { useThemeStore } from '../stores/theme';
import { useModuleStore } from '../../modules/stores/modules';

const themeStore = useThemeStore();
const moduleStore = useModuleStore();

onMounted(() => {
  moduleStore.fetchModules();
  themeStore.fetchThemes();
});

const activate = async (id) => {
  try {
    await themeStore.activateTheme(id);
  } catch (e) {
    console.error('Failed to activate theme', e);
  }
};
</script>

<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">Themes</h1>
      <span class="text-sm text-gray-400">{{ themeStore.themes.length }} themes</span>
    </div>

    <div v-if="themeStore.loading" class="text-gray-400 text-sm">Loading themes...</div>
    <div v-else-if="themeStore.error" class="text-red-400 text-sm">{{ themeStore.error }}</div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="theme in themeStore.themes"
        :key="theme.id"
        class="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-2"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-lg font-semibold text-white">{{ theme.name }}</p>
            <p class="text-xs text-gray-400">{{ theme.key }}</p>
          </div>
          <button
            @click="activate(theme.id)"
            :disabled="theme.isActive"
            :class="[
              'px-3 py-1 text-xs font-bold rounded border transition-colors',
              theme.isActive
                ? 'bg-green-500/20 border-green-400/30 text-green-200'
                : 'bg-neon-blue/20 border-neon-blue/30 text-white hover:bg-neon-blue/30'
            ]"
          >
            {{ theme.isActive ? 'Active' : 'Activate' }}
          </button>
        </div>
        <pre class="text-[11px] text-gray-400 bg-black/30 border border-white/5 rounded p-3 overflow-x-auto">{{ JSON.stringify(theme.config, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
