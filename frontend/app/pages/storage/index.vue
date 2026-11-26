<script setup lang="ts">
import type { StorageLocation } from '~/utils/types'

const { data, refresh } = await useApiFetch<{ locations: StorageLocation[]; unassigned: number }>('/storage-locations')
const form = reactive({ name: '', description: '' })
const { show } = useToast()

async function create() {
  if (!form.name.trim()) return
  try {
    await api('/storage-locations', { method: 'POST', body: form })
    form.name = ''
    form.description = ''
    show('Rangement créé')
    await refresh()
  } catch (e) {
    show(apiError(e), 'error')
  }
}
</script>

<template>
  <div>
    <h1>Rangements</h1>
    <form class="row" style="margin-bottom: 1rem" @submit.prevent="create">
      <input v-model="form.name" placeholder="Nom (ex : Classeur Origins, Boîte bulk…)" />
      <input v-model="form.description" placeholder="Description (optionnel)" />
      <button class="primary">Créer</button>
    </form>

    <div class="grid sets">
      <NuxtLink v-for="l in data?.locations" :key="l.id" :to="`/storage/${l.id}`" class="panel stack" style="color: var(--text)">
        <strong>{{ l.name }}</strong>
        <span v-if="l.description" class="muted small">{{ l.description }}</span>
        <span class="small">{{ l.copies }} exemplaire(s)</span>
      </NuxtLink>
      <NuxtLink to="/storage/none" class="panel stack" style="color: var(--text); border-style: dashed">
        <strong>Sans rangement</strong>
        <span class="small">{{ data?.unassigned ?? 0 }} exemplaire(s)</span>
      </NuxtLink>
    </div>
  </div>
</template>
