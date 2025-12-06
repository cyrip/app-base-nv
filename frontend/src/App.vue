<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app-container">
    <nav v-if="$route.name !== 'login' && $route.name !== 'register'">
      <router-link to="/">Home</router-link> |
      <router-link to="/users">Users</router-link>
    </nav>
    <RouterView />
  </div>
</template>

<style>
.app-container {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
nav {
  margin-bottom: 20px;
  padding: 10px;
  background: #f0f0f0;
}
</style>
