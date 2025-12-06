<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale, t } = useI18n();

const languages = computed(() => [
  { code: 'en', name: t('common.languages.en'), flag: '🇬🇧' },
  { code: 'hu', name: t('common.languages.hu'), flag: '🇭🇺' },
  { code: 'de', name: t('common.languages.de'), flag: '🇩🇪' },
  { code: 'es', name: t('common.languages.es'), flag: '🇪🇸' }
]);

const selectedLanguage = computed({
  get: () => locale.value,
  set: (lang) => {
    locale.value = lang;
    localStorage.setItem('locale', lang);
  }
});
</script>

<template>
  <div class="relative">
    <select
      v-model="selectedLanguage"
      class="appearance-none bg-white/10 border border-white/20 text-xs font-bold rounded px-3 py-2 pr-8 text-white focus:outline-none focus:border-neon-blue transition-colors backdrop-blur"
    >
      <option
        v-for="lang in languages"
        :key="lang.code"
        :value="lang.code"
        class="bg-deep-space text-white"
      >
        {{ lang.flag }} {{ lang.name }}
      </option>
    </select>
    <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
      ▾
    </span>
  </div>
</template>
