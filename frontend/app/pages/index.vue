<script setup lang="ts">
import type { SetSummary } from '~/utils/types'

const { show } = useToast()
const { user } = useAuth()
const { data: sets, refresh } = await useApiFetch<SetSummary[]>('/sets', { default: () => [] })
const { data: status, refresh: refreshStatus } = await useApiFetch<{
  sets: number
  cards: number
  copies: number
  lastImport: string | null
  source: 'riftcodex' | 'riot'
  apiKeyConfigured: boolean
  canImport: boolean
}>('/import')

const importing = ref(false)
const source = ref<'riftcodex' | 'riot'>(status.value?.source ?? 'riftcodex')

const totals = computed(() => {
  const all = sets.value ?? []
  const total = all.reduce((s, x) => s + x.totalCards, 0)
  const owned = all.reduce((s, x) => s + x.ownedCards, 0)
  return { total, owned, completion: total ? Math.round((owned / total) * 1000) / 10 : 0 }
})

const firstName = computed(() => user.value?.fullName?.split(' ')[0] ?? null)

async function runImport() {
  importing.value = true
  try {
    const res = await api<{ cards: number; sets: number }>('/import', { method: 'POST', body: { source: source.value } })
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
    <section class="hero fade-up">
      <div class="hero-inner">
        <div class="stack" style="gap: 0.6rem">
          <span class="eyebrow">Collection Riftbound</span>
          <h1>
            <template v-if="firstName">Bon retour, <span class="gold-text">{{ firstName }}</span></template>
            <template v-else>Ton <span class="gold-text">masterset</span></template>
          </h1>
          <p class="muted" style="margin: 0">
            Suis ta progression extension par extension, range chaque exemplaire et construis tes decks
            avec les cartes que tu possèdes vraiment.
          </p>
          <div class="hero-stats">
            <div class="hero-stat"><div class="value">{{ totals.owned }}<span class="faint" style="font-size: 0.6em"> / {{ totals.total }}</span></div><div class="label">Cartes différentes</div></div>
            <div class="hero-stat"><div class="value">{{ status?.copies ?? 0 }}</div><div class="label">Exemplaires</div></div>
            <div class="hero-stat"><div class="value">{{ sets?.length ?? 0 }}</div><div class="label">Extensions</div></div>
          </div>
        </div>
        <ProgressRing :value="totals.completion" :size="168" :stroke="12">
          <strong style="font-size: 2.3rem">{{ totals.completion }}<small style="font-size: 0.5em">%</small></strong>
          <div class="tiny muted" style="letter-spacing: 0.12em; text-transform: uppercase">Masterset</div>
        </ProgressRing>
      </div>
    </section>

    <div class="page-head">
      <div class="stack">
        <span class="eyebrow">Extensions</span>
        <h2 style="margin: 0">Progression par extension</h2>
      </div>
      <div v-if="status?.canImport" class="row">
        <select v-model="source" title="Source des cartes">
          <option value="riftcodex">RiftCodex (communautaire)</option>
          <option value="riot">API officielle Riot</option>
        </select>
        <button class="primary" :disabled="importing" @click="runImport">
          {{ importing ? 'Import en cours…' : '⟳ Mettre à jour le catalogue' }}
        </button>
      </div>
    </div>

    <p v-if="status?.canImport && source === 'riot' && !status.apiKeyConfigured" class="panel" style="border-color: rgba(240, 168, 60, 0.4)">
      Aucune clé API Riot n'est configurée. Ajoute <code>RIOT_API_KEY</code> dans <code>backend/.env</code>.
    </p>

    <div v-if="!sets?.length" class="empty">
      <div class="icon">🃏</div>
      <p style="margin: 0">Aucune carte dans le catalogue pour l'instant.</p>
      <p class="small" style="margin: 0.3rem 0 0">
        <template v-if="status?.canImport">Clique sur « Mettre à jour le catalogue » pour importer toutes les cartes.</template>
        <template v-else>Un administrateur doit d'abord importer le catalogue.</template>
      </p>
    </div>

    <div class="grid sets">
      <NuxtLink
        v-for="(set, i) in sets"
        :key="set.id"
        :to="`/sets/${encodeURIComponent(set.id)}`"
        class="panel set-tile fade-up"
        :class="{ glow: set.completion >= 100 }"
        :style="{ animationDelay: `${i * 60}ms` }"
      >
        <span class="code">{{ set.id }}</span>
        <div class="top">
          <ProgressRing :value="set.completion" :size="74" :stroke="7" />
          <div class="stack" style="gap: 0.2rem; min-width: 0">
            <span class="name">{{ set.name }}</span>
            <span class="small muted">{{ set.ownedCards }} / {{ set.totalCards }} cartes</span>
            <span class="tiny faint">{{ set.totalCopies }} exemplaire{{ set.totalCopies > 1 ? 's' : '' }}</span>
          </div>
        </div>
        <ProgressBar :value="set.completion" style="margin-top: 1rem" />
      </NuxtLink>
    </div>

    <p v-if="status?.lastImport" class="tiny faint" style="margin-top: 2rem; text-align: center">
      Catalogue mis à jour le {{ new Date(status.lastImport).toLocaleString('fr-FR') }}
    </p>
  </div>
</template>
