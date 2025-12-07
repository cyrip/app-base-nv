<script setup>
import { onMounted, reactive, computed } from 'vue';
import { useModuleStore } from '../../modules/stores/modules';
import { useAuthStore } from '../../auth/stores/auth';

const moduleStore = useModuleStore();
const authStore = useAuthStore();

const localSettings = reactive({});
const localPermissions = reactive({});

onMounted(() => {
  moduleStore.fetchModules().then(() => {
    moduleStore.modules.forEach((mod) => {
      localSettings[mod.id] = mod.Settings ? mod.Settings.map((s) => ({ ...s })) : [];
      localPermissions[mod.id] = mod.Permissions ? mod.Permissions.map((p) => p.name) : [];
    });
  });
});

const toggleModule = async (mod) => {
  try {
    await moduleStore.updateModule(mod.id, { enabled: !mod.enabled });
  } catch (e) {
    console.error('Failed to toggle module', e);
  }
};

const addSetting = (modId) => {
  if (!localSettings[modId]) localSettings[modId] = [];
  localSettings[modId].push({ id: `new-${Date.now()}`, key: '', value: '' });
};

const saveSettings = async (mod) => {
  const settings = (localSettings[mod.id] || [])
    .filter((s) => s.key && s.key.trim())
    .map((s) => ({ key: s.key.trim(), value: s.value }));
  const permissions = (localPermissions[mod.id] || []).filter(Boolean);
  try {
    const updated = await moduleStore.updateModule(mod.id, { enabled: mod.enabled, settings, permissions });
    localSettings[mod.id] = updated.Settings ? updated.Settings.map((s) => ({ ...s })) : [];
    localPermissions[mod.id] = updated.Permissions ? updated.Permissions.map((p) => p.name) : [];
  } catch (e) {
    console.error('Failed to save settings', e);
  }
};

const availablePermissions = computed(() => {
  const names = new Set();
  (authStore.user?.Roles || []).forEach((r) => (r.Permissions || []).forEach((p) => names.add(p.name)));
  return Array.from(names);
});
</script>

<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">Module Admin</h1>
      <span class="text-sm text-gray-400">{{ moduleStore.modules.length }} modules</span>
    </div>

    <div v-if="moduleStore.loading" class="text-gray-400 text-sm">Loading modules...</div>
    <div v-else-if="moduleStore.error" class="text-red-400 text-sm">{{ moduleStore.error }}</div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="mod in moduleStore.modules"
        :key="mod.id"
        class="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-3"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-lg font-semibold text-white">{{ mod.name }}</p>
            <p class="text-xs text-gray-400">{{ mod.key }}</p>
          </div>
          <button
            @click="toggleModule(mod)"
            :class="[
              'px-3 py-1 text-xs font-bold rounded border transition-colors',
              mod.enabled
                ? 'bg-green-500/20 border-green-400/30 text-green-200 hover:bg-green-500/30'
                : 'bg-red-500/10 border-red-400/30 text-red-200 hover:bg-red-500/20'
            ]"
          >
            {{ mod.enabled ? 'Enabled' : 'Disabled' }}
          </button>
        </div>
        <p class="text-sm text-gray-300">{{ mod.description }}</p>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400">Settings</span>
            <button
              @click="addSetting(mod.id)"
              class="px-2 py-1 text-[11px] font-bold text-white bg-neon-blue/30 rounded hover:bg-neon-blue/50"
            >
              Add
            </button>
          </div>
          <div v-if="(localSettings[mod.id] || []).length === 0" class="text-xs text-gray-500">
            No settings
          </div>
          <div
            v-for="setting in localSettings[mod.id]"
            :key="setting.id"
            class="flex items-center gap-2"
          >
            <input
              v-model="setting.key"
              class="flex-1 px-2 py-1 text-sm bg-black/40 border border-white/10 rounded text-white"
              placeholder="Key"
            />
            <input
              v-model="setting.value"
              class="flex-1 px-2 py-1 text-sm bg-black/40 border border-white/10 rounded text-white"
              placeholder="Value"
            />
          </div>
          <div class="flex justify-end">
            <button
              @click="saveSettings(mod)"
              class="px-3 py-1.5 text-xs font-bold text-white bg-neon-purple/60 rounded hover:opacity-90"
            >
              Save
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400">Permissions (require at least one)</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="perm in availablePermissions"
              :key="perm"
              class="text-xs text-gray-200 bg-white/5 border border-white/10 rounded px-2 py-1 cursor-pointer flex items-center gap-1"
            >
              <input
                type="checkbox"
                class="accent-neon-blue"
                :value="perm"
                v-model="localPermissions[mod.id]"
              />
              <span>{{ perm }}</span>
            </label>
          </div>
          <div v-if="(localPermissions[mod.id] || []).length === 0" class="text-[11px] text-gray-500">
            No permissions selected (accessible to all)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
