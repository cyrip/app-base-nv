<script setup>
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

const changeLanguage = (lang) => {
  locale.value = lang;
  localStorage.setItem('locale', lang);
};
</script>

<template>
  <div class="flex gap-2">
    <button
      v-for="lang in languages"
      :key="lang.code"
      @click="changeLanguage(lang.code)"
      :class="[
        'px-3 py-1 text-xs font-bold rounded transition-colors',
        locale === lang.code
          ? 'bg-neon-blue text-white'
          : 'text-gray-400 hover:text-white border border-white/10'
      ]"
    >
      {{ lang.flag }} {{ lang.name }}
    </button>
  </div>
</template>
