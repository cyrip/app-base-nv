<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../../auth/stores/auth'

const users = ref([])
const authStore = useAuthStore()
const error = ref('')

onMounted(async () => {
  try {
    const response = await axios.get('http://localhost:3000/users', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    users.value = response.data
  } catch (e) {
    error.value = 'Failed to fetch users: ' + e.message
  }
})
</script>

<template>
  <div class="users">
    <h2>User Management</h2>
    <p v-if="error" class="error">{{ error }}</p>
    <table v-if="users.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Email</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.role }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No users found.</p>
  </div>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
th {
  background-color: #f2f2f2;
}
.error {
  color: red;
}
</style>
