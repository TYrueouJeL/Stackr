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
  <div class="auth-wrap">
  <div class="auth-box panel glow fade-up">
    <div class="logo"><Logo /></div>
    <h1 style="text-align: center; font-size: 1.7rem">Connexion</h1>
    <p class="muted small" style="text-align: center; margin: 0.4rem 0 1.4rem">Retrouve ta collection Riftbound</p>
    <form class="stack" @submit.prevent="submit">
      <label>E-mail <input v-model="form.email" type="email" autocomplete="email" required /></label>
      <label>Mot de passe <input v-model="form.password" type="password" autocomplete="current-password" required /></label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="primary" :disabled="busy" style="margin-top: 0.4rem; padding: 0.7rem">Se connecter</button>
    </form>
    <p class="muted small" style="text-align: center; margin-top: 1.2rem">Pas encore de compte ? <NuxtLink to="/signup">Créer un compte</NuxtLink></p>
  </div>
  </div>
</template>
