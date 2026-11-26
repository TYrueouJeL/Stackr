<script setup lang="ts">
import type { SetSummary } from '~/utils/types'

const { show } = useToast()
const { data: sets, refresh } = await useFetch<SetSummary[]>('/api/v1/sets', { default: () => [] })
const { data: status, refresh: refreshStatus } = await useFetch<{
  sets: number
  cards: number
  copies: number
  lastImport: string | null
  apiKeyConfigured: boolean
}>('/api/v1/import')

const importing = ref(false)
const locale = ref('en')

const totals = computed(() => {
  const all = sets.value ?? []
  const total = all.reduce((s, x) => s + x.totalCards, 0)
  const owned = all.reduce((s, x) => s + x.ownedCards, 0)
  return { total, owned, completion: total ? Math.round((owned / total) * 1000) / 10 : 0 }
})

async function runImport() {
  importing.value = true
  try {
    const res = await api<{ cards: number; sets: number }>('/import', { method: 'POST', body: { locale: locale.value } })
    show(`${res.cards} cartes importées dans ${res.sets} extensions`)
    await Promise.all([refresh(), refreshStatus()])
  } catch (e) {
    show(apiError(e), 'error')
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div>
    <div class="row between">
      <h1>Masterset Riftbound</h1>
      <div class="row">
        <select v-model="locale" title="Langue des cartes">
          <option value="en">Anglais</option>
          <option value="fr">Français</option>
        </select>
        <button class="primary" :disabled="importing" @click="runImport">
          {{ importing ? 'Import en cours…' : 'Mettre à jour les cartes depuis Riot' }}
        </button>
      </div>
    </div>

    <p v-if="status && !status.apiKeyConfigured" class="panel" style="border-color: var(--warn)">
      Aucune clé API Riot n'est configurée. Ajoute <code>RIOT_API_KEY</code> dans <code>backend/.env</code>.
    </p>

    <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin-bottom: 1rem">
      <div class="panel"><div class="muted small">Masterset global</div><div class="stat">{{ totals.completion }} %</div></div>
      <div class="panel"><div class="muted small">Cartes différentes</div><div class="stat">{{ totals.owned }} / {{ totals.total }}</div></div>
      <div class="panel"><div class="muted small">Exemplaires en stock</div><div class="stat">{{ status?.copies ?? 0 }}</div></div>
    </div>

    <div v-if="!sets?.length" class="panel empty">
      Aucune carte en base. Lance l'import depuis l'API Riot avec le bouton ci-dessus
      ou <code>node ace riftbound:import</code> dans le dossier backend.
    </div>

    <div class="grid sets">
      <NuxtLink v-for="set in sets" :key="set.id" :to="`/sets/${encodeURIComponent(set.id)}`" class="panel stack" style="color: var(--text)">
        <div class="row between">
          <strong>{{ set.name }}</strong>
          <span class="tag">{{ set.id }}</span>
        </div>
        <ProgressBar :value="set.completion" />
        <div class="row between small">
          <span>{{ set.completion }} %</span>
          <span class="muted">{{ set.ownedCards }} / {{ set.totalCards }} cartes · {{ set.totalCopies }} ex.</span>
        </div>
      </NuxtLink>
    </div>

    <p v-if="status?.lastImport" class="muted small" style="margin-top: 1.5rem">
      Dernière mise à jour du catalogue : {{ new Date(status.lastImport).toLocaleString('fr-FR') }}
    </p>
  </div>
</template>
