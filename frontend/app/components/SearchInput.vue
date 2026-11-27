<script setup lang="ts">
const model = defineModel<string>({ default: '' })
defineProps<{ placeholder?: string; lazy?: boolean }>()
</script>

<template>
  <div class="search">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
    <input v-if="lazy" v-model.lazy="model" :placeholder="placeholder ?? 'Rechercher…'" type="search" />
    <input v-else v-model="model" :placeholder="placeholder ?? 'Rechercher…'" type="search" />
  </div>
</template>
