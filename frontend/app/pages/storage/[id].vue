<script setup lang="ts">
import type { Copy } from '~/utils/types'

const route = useRoute()
const isNone = computed(() => route.params.id === 'none')
const { locations, refresh: refreshRefs } = useRefs()
const { show } = useToast()
onMounted(() => refreshRefs())

const { data, refresh } = await useAsyncData(
  () => `storage-${route.params.id}`,
  async () => {
    if (isNone.value) {
      const copies = await api<Copy[]>('/copies', { query: { storageLocationId: 'none' } })
      return { id: null as number | null, name: 'Sans rangement', description: null as string | null, copies }
    }
    return api<{ id: number; name: string; description: string | null; copies: Copy[] }>(`/storage-locations/${route.params.id}`)
  }
)

const q = ref('')
const selected = ref(new Set<number>())
const target = ref<number | null>(null)
const editing = ref(false)
const form = reactive({ name: '', description: '' })

const copies = computed(() =>
  (data.value?.copies ?? []).filter((c) => !q.value || c.card?.name.toLowerCase().includes(q.value.toLowerCase()))
)

function toggle(id: number) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}
function toggleAll() {
  selected.value = selected.value.size === copies.value.length ? new Set() : new Set(copies.value.map((c) => c.id))
}

async function move() {
  if (!selected.value.size) return
  await api('/copies', { method: 'PATCH', body: { ids: [...selected.value], storageLocationId: target.value } })
  show(`${selected.value.size} exemplaire(s) déplacé(s)`)
  selected.value = new Set()
  await refresh()
}

function startEdit() {
  form.name = data.value?.name ?? ''
  form.description = data.value?.description ?? ''
  editing.value = true
}
async function save() {
  await api(`/storage-locations/${route.params.id}`, { method: 'PUT', body: form })
  editing.value = false
  await refresh()
}
async function remove() {
  if (!confirm('Supprimer ce rangement ? Ses exemplaires passeront en « sans rangement ».')) return
  await api(`/storage-locations/${route.params.id}`, { method: 'DELETE' })
  await navigateTo('/storage')
}
</script>

<template>
  <div v-if="data">
    <NuxtLink to="/storage" class="small">← Rangements</NuxtLink>
    <div v-if="!editing" class="row between">
      <h1>{{ data.name }}</h1>
      <div v-if="!isNone" class="row">
        <button class="small" @click="startEdit">Modifier</button>
        <button class="small danger" @click="remove">Supprimer</button>
      </div>
    </div>
    <form v-else class="stack panel" style="margin-bottom: 1rem" @submit.prevent="save">
      <label>Nom <input v-model="form.name" /></label>
      <label>Description <input v-model="form.description" /></label>
      <div class="row"><button class="primary">Enregistrer</button><button type="button" @click="editing = false">Annuler</button></div>
    </form>
    <p v-if="data.description && !editing" class="muted">{{ data.description }}</p>

    <div class="row" style="margin-bottom: 1rem">
      <input v-model="q" placeholder="Filtrer par nom" />
      <span class="muted small">{{ copies.length }} exemplaire(s)</span>
    </div>

    <div v-if="selected.size" class="panel row" style="margin-bottom: 1rem">
      <strong>{{ selected.size }} sélectionné(s)</strong>
      <span>Déplacer vers</span>
      <select v-model="target">
        <option :value="null">Sans rangement</option>
        <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
      <button class="primary" @click="move">Déplacer</button>
    </div>

    <div v-if="!copies.length" class="panel empty">Aucun exemplaire ici.</div>
    <div v-else class="table-wrap panel">
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" :checked="selected.size === copies.length" @change="toggleAll" /></th>
            <th>N°</th><th>Carte</th><th>Rangement</th><th>Decklist</th><th>État</th><th>Foil</th><th>Langue</th><th />
          </tr>
        </thead>
        <tbody>
          <CopyRow v-for="c in copies" :key="c.id" :copy="c" show-card selectable :selected="selected.has(c.id)" @toggle="toggle" @changed="refresh()" />
        </tbody>
      </table>
    </div>
  </div>
</template>
