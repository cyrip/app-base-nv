<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="container mx-auto px-4 pt-20 text-center">
    <h1 class="text-7xl font-bold mb-6 tracking-tight">
      {{ t('common.landing.hero.title') }} <br />
      <span class="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-purple-500 to-neon-purple animate-pulse">{{ t('common.landing.hero.highlight') }}</span>
    </h1>
    <p class="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
      {{ t('common.landing.hero.subtitle') }}
    </p>

    <div class="flex justify-center gap-6">
      <button class="group relative px-8 py-4 bg-transparent overflow-hidden rounded-xl">
        <div class="absolute inset-0 w-full h-full bg-gradient-to-r from-neon-blue to-neon-purple opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <div class="absolute inset-0 w-full h-full border border-white/20 rounded-xl group-hover:border-neon-blue/50 transition-colors"></div>
        <span class="relative text-lg font-bold text-white group-hover:text-neon-blue transition-colors">{{ t('common.actions.getStarted') }}</span>
      </button>
      <router-link to="/login" class="px-8 py-4 text-lg font-bold text-gray-300 hover:text-white transition-colors">
        {{ t('common.actions.login') }}
      </router-link>
    </div>

    <!-- Stats Card -->
    <div class="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      <div class="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-neon-blue/30 transition-all duration-500 group">
        <div class="text-4xl font-bold text-white mb-2 group-hover:text-neon-blue transition-colors">98%</div>
        <div class="text-gray-400 text-sm uppercase tracking-wider">{{ t('common.landing.stats.efficiency') }}</div>
      </div>
      <div class="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-neon-purple/30 transition-all duration-500 group">
        <div class="text-4xl font-bold text-white mb-2 group-hover:text-neon-purple transition-colors">24/7</div>
        <div class="text-gray-400 text-sm uppercase tracking-wider">{{ t('common.landing.stats.uptime') }}</div>
      </div>
      <div class="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-neon-blue/30 transition-all duration-500 group">
        <div class="text-4xl font-bold text-white mb-2 group-hover:text-neon-blue transition-colors">10k+</div>
        <div class="text-gray-400 text-sm uppercase tracking-wider">{{ t('common.landing.stats.agents') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles if needed */
</style>
