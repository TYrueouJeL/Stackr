<script setup lang="ts">
const { toast } = useToast()
const { user, logout } = useAuth()
</script>

<template>
  <div>
    <nav class="nav">
      <div class="inner">
        <NuxtLink to="/" class="brand">Stackr</NuxtLink>
        <template v-if="user">
          <NuxtLink to="/">Masterset</NuxtLink>
          <NuxtLink to="/cards">Cartes</NuxtLink>
          <NuxtLink to="/decklists">Decklists</NuxtLink>
          <NuxtLink to="/storage">Rangements</NuxtLink>
          <span class="spacer" />
          <span class="muted small" :title="user.email">{{ user.fullName || user.email }}</span>
          <button class="small" @click="logout">Déconnexion</button>
        </template>
      </div>
    </nav>
    <main class="container">
      <NuxtPage />
    </main>
    <div v-if="toast" class="toast" :class="toast.kind">{{ toast.text }}</div>
  </div>
</template>
