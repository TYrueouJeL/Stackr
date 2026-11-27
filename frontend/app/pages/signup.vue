<script setup lang="ts">
const { signup } = useAuth()
const form = reactive({ fullName: '', email: '', password: '', passwordConfirmation: '' })
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  if (form.password !== form.passwordConfirmation) {
    error.value = 'Les deux mots de passe ne correspondent pas'
    return
  }
  busy.value = true
  try {
    await signup({ ...form, fullName: form.fullName || undefined })
    await navigateTo('/')
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
    <h1 style="text-align: center; font-size: 1.7rem">Créer un compte</h1>
    <p class="muted small" style="text-align: center; margin: 0.4rem 0 1.4rem">Commence à suivre ta collection Riftbound</p>
    <form class="stack" @submit.prevent="submit">
      <label>Nom (optionnel) <input v-model="form.fullName" autocomplete="name" /></label>
      <label>E-mail <input v-model="form.email" type="email" autocomplete="email" required /></label>
      <label>Mot de passe (8 à 32 caractères)
        <input v-model="form.password" type="password" autocomplete="new-password" minlength="8" maxlength="32" required />
      </label>
      <label>Confirmer le mot de passe
        <input v-model="form.passwordConfirmation" type="password" autocomplete="new-password" required />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="primary" :disabled="busy" style="margin-top: 0.4rem; padding: 0.7rem">Créer mon compte</button>
    </form>
    <p class="muted small" style="text-align: center; margin-top: 1.2rem">Déjà inscrit ? <NuxtLink to="/login">Se connecter</NuxtLink></p>
  </div>
  </div>
</template>
