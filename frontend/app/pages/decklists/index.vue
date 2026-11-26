<script setup lang="ts">
import type { DecklistSummary } from '~/utils/types'

const { data: decklists, refresh } = await useApiFetch<DecklistSummary[]>('/decklists', { default: () => [] })
const name = ref('')
const { show } = useToast()

async function create() {
  if (!name.value.trim()) return
  try {
    const deck = await api<{ id: number }>('/decklists', { method: 'POST', body: { name: name.value } })
    name.value = ''
    await navigateTo(`/decklists/${deck.id}`)
  } catch (e) {
    show(apiError(e), 'error')
  }
  await refresh()
}
</script>

<template>
  <div>
    <h1>Decklists</h1>
    <form class="row" style="margin-bottom: 1rem" @submit.prevent="create">
      <input v-model="name" placeholder="Nom de la nouvelle decklist" />
      <button class="primary">Créer</button>
    </form>
    <div v-if="!decklists?.length" class="panel empty">Aucune decklist pour l'instant.</div>
    <div class="grid sets">
      <NuxtLink v-for="d in decklists" :key="d.id" :to="`/decklists/${d.id}`" class="panel stack" style="color: var(--text)">
        <div class="row between">
          <strong>{{ d.name }}</strong>
          <span class="tag" :class="d.complete ? 'ok' : 'warn'">{{ d.complete ? 'Complète' : 'Incomplète' }}</span>
        </div>
        <ProgressBar :value="d.totalCards ? (d.assignedCopies / d.totalCards) * 100 : 0" />
        <span class="muted small">{{ d.assignedCopies }} / {{ d.totalCards }} exemplaires affectés</span>
      </NuxtLink>
    </div>
  </div>
</template>
