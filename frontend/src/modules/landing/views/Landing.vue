<template>
  <div class="landing">
    <h1>Welcome to the Agent App</h1>
    <p>This is the general project foundation.</p>
    <router-link to="/login" class="btn">Login</router-link>
  </div>
</template>

<style scoped>
.landing {
  text-align: center;
  margin-top: 50px;
}
.btn {
  display: inline-block;
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  margin-top: 20px;
}
</style>
