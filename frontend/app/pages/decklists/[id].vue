<script setup lang="ts">
import type { Card, Copy, DecklistDetail } from '~/utils/types'

const route = useRoute()
const id = computed(() => Number(route.params.id))
const { data: deck, refresh } = await useApiFetch<DecklistDetail>(() => `/decklists/${id.value}`)
const { show } = useToast()
const { refresh: refreshRefs } = useRefs()
onMounted(() => refreshRefs())

const importText = ref('')
const replace = ref(false)
const showImport = ref(false)
const editing = ref(false)
const form = reactive({ name: '', description: '' })
const openRow = ref<string | null>(null)
const freeCopies = ref<Copy[]>([])

watch(deck, (d) => { if (d) { form.name = d.name; form.description = d.description ?? '' } }, { immediate: true })

async function call<T>(path: string, options: any, message?: (r: T) => string) {
  try {
    const r = await api<T>(path, options)
    if (message) show(message(r))
    await refresh()
    return r
  } catch (e) {
    show(apiError(e), 'error')
  }
}

const setQuantity = (cardId: string, quantity: number) =>
  call(`/decklists/${id.value}/entries`, { method: 'PUT', body: { cardId, quantity: Math.max(0, quantity) } })

const addCard = (card: Card) => {
  const current = deck.value?.entries.find((e) => e.card.id === card.id)?.quantity ?? 0
  setQuantity(card.id, current + 1)
}

const autoAssign = () =>
  call<{ assigned: number }>(`/decklists/${id.value}/auto-assign`, { method: 'POST' }, (r) => `${r.assigned} exemplaire(s) affecté(s)`)

async function release() {
  if (!confirm('Libérer tous les exemplaires de cette decklist ?')) return
  await call<{ released: number }>(`/decklists/${id.value}/release`, { method: 'POST' }, () => 'Exemplaires libérés')
}

async function runImport() {
  const r = await call<{ imported: number; notFound: string[] }>(
    `/decklists/${id.value}/import`,
    { method: 'POST', body: { text: importText.value, replace: replace.value } },
    (r) => `${r.imported} carte(s) importée(s)${r.notFound.length ? `, ${r.notFound.length} introuvable(s)` : ''}`
  )
  if (r) {
    importText.value = r.notFound.join('\n')
    if (!r.notFound.length) showImport.value = false
  }
}

async function exportList() {
  const text = await api<string>(`/decklists/${id.value}/export`, { responseType: 'text' })
  await navigator.clipboard.writeText(text)
  show('Liste copiée dans le presse-papier')
}

async function save() {
  await call(`/decklists/${id.value}`, { method: 'PUT', body: form }, () => 'Decklist enregistrée')
  editing.value = false
}

async function removeDeck() {
  if (!confirm('Supprimer cette decklist ? Les exemplaires seront libérés.')) return
  await api(`/decklists/${id.value}`, { method: 'DELETE' })
  await navigateTo('/decklists')
}

async function toggleRow(cardId: string) {
  if (openRow.value === cardId) { openRow.value = null; return }
  openRow.value = cardId
  freeCopies.value = await api<Copy[]>('/copies', { query: { cardId, decklistId: 'none' } })
}

async function assign(copyId: number, decklistId: number | null) {
  await call('/copies', { method: 'PATCH', body: { ids: [copyId], decklistId } })
  if (openRow.value) freeCopies.value = await api<Copy[]>('/copies', { query: { cardId: openRow.value, decklistId: 'none' } })
}
</script>

<template>
  <div v-if="deck">
    <NuxtLink to="/decklists" class="back">← Mes decklists</NuxtLink>

    <section class="hero fade-up" style="padding: 1.6rem 1.8rem">
      <div class="hero-inner">
        <div class="stack" style="gap: 0.5rem; flex: 1; min-width: 260px">
          <span class="eyebrow">Decklist</span>
          <template v-if="!editing">
            <h1>{{ deck.name }}</h1>
            <p v-if="deck.description" class="muted" style="white-space: pre-line; margin: 0">{{ deck.description }}</p>
          </template>
          <form v-else class="stack" @submit.prevent="save">
            <label>Nom <input v-model="form.name" /></label>
            <label>Description <textarea v-model="form.description" style="min-height: 4rem; font-family: inherit" /></label>
            <div class="row"><button class="primary">Enregistrer</button><button type="button" class="ghost" @click="editing = false">Annuler</button></div>
          </form>
          <div class="row" style="margin-top: 0.4rem">
            <span v-if="deck.missingCards" class="tag warn">{{ deck.missingCards }} carte{{ deck.missingCards > 1 ? 's' : '' }} manquante{{ deck.missingCards > 1 ? 's' : '' }}</span>
            <span v-else-if="deck.totalCards" class="tag ok">✓ Deck complet</span>
            <span class="tag">{{ deck.totalCards }} cartes</span>
          </div>
        </div>
        <ProgressRing :value="deck.totalCards ? (deck.assignedCopies / deck.totalCards) * 100 : 0" :size="130" :stroke="10">
          <strong style="font-size: 1.5rem">{{ deck.assignedCopies }}<span class="faint" style="font-size: 0.6em">/{{ deck.totalCards }}</span></strong>
          <div class="tiny muted">en place</div>
        </ProgressRing>
      </div>
    </section>

    <div class="toolbar">
      <button class="primary" @click="autoAssign">✦ Affecter les exemplaires libres</button>
      <button @click="showImport = !showImport">Importer une liste</button>
      <button @click="exportList">Copier la liste</button>
      <span class="spacer" />
      <button class="ghost" @click="release">Libérer les exemplaires</button>
      <button v-if="!editing" class="ghost" @click="editing = true">Renommer</button>
      <button class="ghost danger" @click="removeDeck">Supprimer</button>
    </div>

    <Transition name="page">
      <div v-if="showImport" class="panel stack" style="margin-bottom: 1.2rem">
        <span class="muted small">Une carte par ligne : « 3 Nom de la carte » ou « 2x ID-de-carte ».</span>
        <textarea v-model="importText" placeholder="3 Nom de la carte" />
        <div class="row">
          <label class="inline"><input v-model="replace" type="checkbox" /> Remplacer la liste actuelle</label>
          <span class="spacer" />
          <button class="primary" @click="runImport">Importer</button>
        </div>
      </div>
    </Transition>

    <CardPicker @pick="addCard" />

    <div v-if="!deck.entries.length" class="empty" style="margin-top: 1.2rem"><div class="icon">🃏</div>La decklist est vide. Ajoute des cartes avec la recherche ou l'import.</div>
    <div v-else class="panel table-wrap" style="margin-top: 1.2rem">
      <table>
        <thead>
          <tr><th>Carte</th><th>Type</th><th>Quantité</th><th>En place</th><th>Libres</th><th /></tr>
        </thead>
        <tbody>
          <template v-for="e in deck.entries" :key="e.card.id">
            <tr :class="{ 'deck-row-open': openRow === e.card.id }">
              <td>
                <NuxtLink :to="`/cards/${encodeURIComponent(e.card.id)}`" class="card-cell">
                  <img v-if="e.card.thumbnailUrl" :src="e.card.thumbnailUrl" class="thumb" alt="" loading="lazy" />
                  <span class="stack" style="gap: 0">
                    <span style="color: var(--text); font-weight: 500">{{ e.card.name }}</span>
                    <span class="tiny faint">{{ e.card.setId }} #{{ e.card.collectorNumber }}</span>
                  </span>
                </NuxtLink>
              </td>
              <td class="small muted">{{ e.card.type }}</td>
              <td>
                <div class="row" style="gap: 0.35rem; flex-wrap: nowrap">
                  <button class="icon small" @click="setQuantity(e.card.id, e.quantity - 1)">−</button>
                  <strong style="min-width: 1.2rem; text-align: center">{{ e.quantity }}</strong>
                  <button class="icon small" @click="setQuantity(e.card.id, e.quantity + 1)">+</button>
                </div>
              </td>
              <td><span class="tag" :class="e.missing ? (e.available ? 'warn' : 'danger') : 'ok'">{{ e.assigned.length }} / {{ e.quantity }}</span></td>
              <td class="small">{{ e.available }}</td>
              <td style="text-align: right"><button class="small" @click="toggleRow(e.card.id)">{{ openRow === e.card.id ? 'Fermer' : 'Exemplaires' }}</button></td>
            </tr>
            <tr v-if="openRow === e.card.id" class="deck-row-open">
              <td colspan="6">
                <div class="stack small" style="padding: 0.3rem 0">
                  <span class="eyebrow">Dans ce deck</span>
                  <div v-if="!e.assigned.length" class="muted">Aucun exemplaire en place.</div>
                  <div v-for="c in e.assigned" :key="c.id" class="copy-line">
                    <span>#{{ c.id }} · {{ c.condition }} · {{ c.language }}</span>
                    <span v-if="c.foil" class="tag foil">FOIL</span>
                    <span class="muted">📦 {{ c.storageLocation?.name ?? 'sans rangement' }}</span>
                    <span class="spacer" />
                    <button class="small ghost" @click="assign(c.id, null)">Retirer du deck</button>
                  </div>
                  <span class="eyebrow" style="margin-top: 0.5rem">Exemplaires libres</span>
                  <div v-if="!freeCopies.length" class="muted">Aucun exemplaire libre.</div>
                  <div v-for="c in freeCopies" :key="c.id" class="copy-line">
                    <span>#{{ c.id }} · {{ c.condition }} · {{ c.language }}</span>
                    <span v-if="c.foil" class="tag foil">FOIL</span>
                    <span class="muted">📦 {{ c.storageLocation?.name ?? 'sans rangement' }}</span>
                    <span class="spacer" />
                    <button class="small primary" :disabled="e.assigned.length >= e.quantity" @click="assign(c.id, deck.id)">Mettre dans le deck</button>
                  </div>
                  <span class="eyebrow" style="margin-top: 0.5rem">Nouvel exemplaire directement dans ce deck</span>
                  <AddCopiesForm :card-id="e.card.id" :decklist-id="deck.id" @added="refresh()" />
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <template v-if="deck.extraCopies.length">
      <h2>Exemplaires affectés hors liste</h2>
      <div class="stack">
        <div v-for="c in deck.extraCopies" :key="c.id" class="copy-line">
          <span>#{{ c.id }} {{ c.card?.name }}</span>
          <span class="muted small">📦 {{ c.storageLocation?.name ?? 'sans rangement' }}</span>
          <span class="spacer" />
          <button class="small" @click="assign(c.id, null)">Libérer</button>
        </div>
      </div>
    </template>
  </div>
</template>
