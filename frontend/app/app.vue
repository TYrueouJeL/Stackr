<script setup lang="ts">
const { toast } = useToast()
</script>

<template>
  <div>
    <nav class="nav">
      <div class="inner">
        <NuxtLink to="/" class="brand">Stackr</NuxtLink>
        <NuxtLink to="/">Masterset</NuxtLink>
        <NuxtLink to="/cards">Cartes</NuxtLink>
        <NuxtLink to="/decklists">Decklists</NuxtLink>
        <NuxtLink to="/storage">Rangements</NuxtLink>
      </div>
    </nav>
    <main class="container">
      <NuxtPage />
    </main>
    <div v-if="toast" class="toast" :class="toast.kind">{{ toast.text }}</div>
  </div>
</template>
