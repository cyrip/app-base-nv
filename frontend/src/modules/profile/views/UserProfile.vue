<script setup>
import { onMounted, ref } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../../auth/stores/auth';
import { useServices } from '../../../services/serviceContainer';
import { useI18n } from 'vue-i18n';

const authStore = useAuthStore();
const { toast } = useServices();
const { t, locale } = useI18n();

const loading = ref(true);
const saving = ref(false);
const languages = ref([]);
const form = ref({
  languageId: authStore.user?.Language?.id || null,
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${authStore.token}` }
});

const fetchLanguages = async () => {
  const response = await axios.get('http://localhost:3000/languages');
  languages.value = response.data;
};

const fetchProfile = async () => {
  const response = await axios.get('http://localhost:3000/users/me', authHeaders());
  const user = response.data;
  authStore.setUser(user);
  form.value.languageId = user.languageId || user.Language?.id || form.value.languageId;
};

const syncLocale = (langCode) => {
  if (!langCode) return;
  locale.value = langCode;
  localStorage.setItem('locale', langCode);
};

const updateProfile = async () => {
  if (form.value.newPassword && form.value.newPassword !== form.value.confirmPassword) {
    toast.warning(t('users.profile.passwordMismatch'));
    return;
  }

  saving.value = true;
  try {
    const payload = {
      languageId: form.value.languageId
    };

    if (form.value.newPassword) {
      payload.currentPassword = form.value.currentPassword;
      payload.newPassword = form.value.newPassword;
    }

    const response = await axios.put('http://localhost:3000/users/me', payload, authHeaders());
    const user = response.data.user;
    authStore.setUser(user);
    syncLocale(user.Language?.code);
    toast.success(t('users.profile.success'));
    form.value.currentPassword = '';
    form.value.newPassword = '';
    form.value.confirmPassword = '';
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    toast.error(message);
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    await Promise.all([fetchLanguages(), fetchProfile()]);
  } catch (error) {
    toast.error(error.response?.data?.message || error.message);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-12">
    <div class="max-w-3xl mx-auto space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
            {{ t('users.profile.title') }}
          </h2>
          <p class="text-sm text-gray-400 mt-1">{{ t('users.profile.subtitle') }}</p>
        </div>
        <div class="px-4 py-2 text-xs font-bold text-neon-blue bg-neon-blue/10 rounded-full border border-neon-blue/20">
          {{ authStore.user?.email }}
        </div>
      </div>

      <div v-if="loading" class="text-center py-12 text-gray-400">
        <div class="inline-block w-10 h-10 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Loading profile...</p>
      </div>

      <div v-else class="space-y-6">
        <div class="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
          <h3 class="text-lg font-bold text-white mb-4">{{ t('users.profile.languageLabel') }}</h3>
          <p class="text-sm text-gray-400 mb-4">{{ t('users.profile.languageHelp') }}</p>
          <div class="flex flex-col gap-3">
            <select
              v-model="form.languageId"
              class="w-full px-4 py-3 bg-deep-space/60 border border-white/10 rounded-lg text-white focus:outline-none focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/30 [&>option]:bg-deep-space [&>option]:text-white"
            >
              <option v-for="lang in languages" :key="lang.id" :value="lang.id">
                {{ lang.name }} ({{ lang.code }})
              </option>
            </select>
          </div>
        </div>

        <div class="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
          <h3 class="text-lg font-bold text-white mb-4">{{ t('users.profile.passwordTitle') }}</h3>
          <div class="grid gap-4">
            <input
              v-model="form.currentPassword"
              type="password"
              class="w-full px-4 py-3 bg-deep-space/60 border border-white/10 rounded-lg text-white focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/30"
              :placeholder="t('users.profile.currentPassword')"
            />
            <input
              v-model="form.newPassword"
              type="password"
              class="w-full px-4 py-3 bg-deep-space/60 border border-white/10 rounded-lg text-white focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/30"
              :placeholder="t('users.profile.newPassword')"
            />
            <input
              v-model="form.confirmPassword"
              type="password"
              class="w-full px-4 py-3 bg-deep-space/60 border border-white/10 rounded-lg text-white focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/30"
              :placeholder="t('users.profile.confirmPassword')"
            />
          </div>
        </div>

        <div class="flex justify-end">
          <button
            :disabled="saving"
            @click="updateProfile"
            class="px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-neon-blue to-neon-purple rounded-lg hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? '...' : t('common.actions.update') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
