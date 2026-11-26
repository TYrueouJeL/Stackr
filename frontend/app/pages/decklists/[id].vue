<script setup lang="ts">
import type { Card, Copy, DecklistDetail } from '~/utils/types'

const route = useRoute()
const id = computed(() => Number(route.params.id))
const { data: deck, refresh } = await useFetch<DecklistDetail>(() => `/api/v1/decklists/${id.value}`)
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
    <NuxtLink to="/decklists" class="small">← Decklists</NuxtLink>
    <div v-if="!editing" class="row between">
      <h1>{{ deck.name }}</h1>
      <div class="row">
        <button class="small" @click="editing = true">Renommer</button>
        <button class="small danger" @click="removeDeck">Supprimer</button>
      </div>
    </div>
    <form v-else class="stack panel" style="margin-bottom: 1rem" @submit.prevent="save">
      <label>Nom <input v-model="form.name" /></label>
      <label>Description <textarea v-model="form.description" style="min-height: 4rem; font-family: inherit" /></label>
      <div class="row"><button class="primary">Enregistrer</button><button type="button" @click="editing = false">Annuler</button></div>
    </form>
    <p v-if="deck.description && !editing" class="muted" style="white-space: pre-line">{{ deck.description }}</p>

    <div class="panel stack" style="margin-bottom: 1rem">
      <div class="row between">
        <strong>{{ deck.assignedCopies }} / {{ deck.totalCards }} exemplaires affectés</strong>
        <span v-if="deck.missingCards" class="tag warn">{{ deck.missingCards }} manquant(s)</span>
        <span v-else-if="deck.totalCards" class="tag ok">Deck complet</span>
      </div>
      <ProgressBar :value="deck.totalCards ? (deck.assignedCopies / deck.totalCards) * 100 : 0" />
      <div class="row">
        <button class="primary" @click="autoAssign">Affecter automatiquement les exemplaires libres</button>
        <button @click="release">Libérer tous les exemplaires</button>
        <button @click="showImport = !showImport">Importer une liste</button>
        <button @click="exportList">Copier la liste</button>
      </div>
    </div>

    <div v-if="showImport" class="panel stack" style="margin-bottom: 1rem">
      <span class="muted small">Une carte par ligne : « 3 Nom de la carte » ou « 2x ID-de-carte ».</span>
      <textarea v-model="importText" placeholder="3 Nom de la carte" />
      <div class="row">
        <label class="row" style="flex-direction: row"><input v-model="replace" type="checkbox" /> Remplacer la liste actuelle</label>
        <button class="primary" @click="runImport">Importer</button>
      </div>
    </div>

    <CardPicker @pick="addCard" />

    <div v-if="!deck.entries.length" class="panel empty" style="margin-top: 1rem">La decklist est vide. Ajoute des cartes avec la recherche ou l'import.</div>
    <div v-else class="table-wrap panel" style="margin-top: 1rem">
      <table>
        <thead>
          <tr><th>Carte</th><th>Type</th><th>Quantité</th><th>Affectés</th><th>Libres en stock</th><th>Exemplaires</th></tr>
        </thead>
        <tbody>
          <template v-for="e in deck.entries" :key="e.card.id">
            <tr>
              <td><NuxtLink :to="`/cards/${encodeURIComponent(e.card.id)}`">{{ e.card.name }}</NuxtLink> <span class="muted small">{{ e.card.setId }} #{{ e.card.collectorNumber }}</span></td>
              <td class="small">{{ e.card.type }}</td>
              <td>
                <div class="row" style="gap: .3rem; flex-wrap: nowrap">
                  <button class="small" @click="setQuantity(e.card.id, e.quantity - 1)">−</button>
                  <strong>{{ e.quantity }}</strong>
                  <button class="small" @click="setQuantity(e.card.id, e.quantity + 1)">+</button>
                </div>
              </td>
              <td><span class="tag" :class="e.missing ? (e.available ? 'warn' : 'danger') : 'ok'">{{ e.assigned.length }} / {{ e.quantity }}</span></td>
              <td class="small">{{ e.available }}</td>
              <td><button class="small" @click="toggleRow(e.card.id)">{{ openRow === e.card.id ? 'Fermer' : 'Gérer' }}</button></td>
            </tr>
            <tr v-if="openRow === e.card.id">
              <td colspan="6" style="background: var(--panel-2)">
                <div class="stack small">
                  <div><strong>Dans ce deck :</strong></div>
                  <div v-if="!e.assigned.length" class="muted">Aucun exemplaire affecté.</div>
                  <div v-for="c in e.assigned" :key="c.id" class="row">
                    <span>#{{ c.id }} · {{ c.condition }} · {{ c.language }}<span v-if="c.foil" class="tag foil">foil</span> · {{ c.storageLocation?.name ?? 'sans rangement' }}</span>
                    <button class="small" @click="assign(c.id, null)">Retirer du deck</button>
                  </div>
                  <div><strong>Exemplaires libres :</strong></div>
                  <div v-if="!freeCopies.length" class="muted">Aucun exemplaire libre. Ajoute-en depuis la fiche de la carte.</div>
                  <div v-for="c in freeCopies" :key="c.id" class="row">
                    <span>#{{ c.id }} · {{ c.condition }} · {{ c.language }}<span v-if="c.foil" class="tag foil">foil</span> · {{ c.storageLocation?.name ?? 'sans rangement' }}</span>
                    <button class="small" :disabled="e.assigned.length >= e.quantity" @click="assign(c.id, deck.id)">Mettre dans le deck</button>
                  </div>
                  <div class="row"><span class="muted">Ajouter un nouvel exemplaire directement dans ce deck :</span></div>
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
      <div class="table-wrap panel">
        <table>
          <tbody>
            <tr v-for="c in deck.extraCopies" :key="c.id">
              <td>#{{ c.id }} {{ c.card?.name }}</td>
              <td class="small">{{ c.storageLocation?.name ?? 'sans rangement' }}</td>
              <td><button class="small" @click="assign(c.id, null)">Libérer</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
