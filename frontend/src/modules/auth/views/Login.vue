<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const authStore = useAuthStore()
const router = useRouter()
const error = ref('')

const handleLogin = async () => {
  try {
    await authStore.login(email.value, password.value)
    router.push('/users')
  } catch (e) {
    error.value = 'Login failed: ' + e.message
  }
}
</script>

<template>
  <div class="login">
    <h2>Login</h2>
    <form @submit.prevent="handleLogin">
      <div>
        <label>Email:</label>
        <input v-model="email" type="email" required />
      </div>
      <div>
        <label>Password:</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit">Login</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.login {
  max-width: 300px;
  margin: 50px auto;
}
div {
  margin-bottom: 10px;
}
label {
  display: block;
}
input {
  width: 100%;
  padding: 5px;
}
.error {
  color: red;
}
</style>
