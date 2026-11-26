<script setup lang="ts">
const { login } = useAuth()
const route = useRoute()
const form = reactive({ email: '', password: '' })
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await login(form.email, form.password)
    await navigateTo(String(route.query.redirect ?? '/'))
  } catch (e) {
    error.value = apiError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth-box panel">
    <h1>Connexion</h1>
    <form class="stack" @submit.prevent="submit">
      <label>E-mail <input v-model="form.email" type="email" autocomplete="email" required /></label>
      <label>Mot de passe <input v-model="form.password" type="password" autocomplete="current-password" required /></label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="primary" :disabled="busy">Se connecter</button>
    </form>
    <p class="muted small">Pas encore de compte ? <NuxtLink to="/signup">Créer un compte</NuxtLink></p>
  </div>
</template>
