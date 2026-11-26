<script setup lang="ts">
import { CONDITIONS } from '~/utils/types'

const props = defineProps<{ cardId: string; decklistId?: number | null }>()
const emit = defineEmits<{ added: [] }>()
const { locations, refresh } = useRefs()
const { show } = useToast()

const form = reactive({
  quantity: 1,
  storageLocationId: null as number | null,
  foil: false,
  condition: 'NM',
  language: 'fr',
})
const busy = ref(false)

onMounted(() => {
  if (!locations.value.length) refresh().catch(() => {})
})

async function submit() {
  busy.value = true
  try {
    await api('/copies', {
      method: 'POST',
      body: { cardId: props.cardId, decklistId: props.decklistId ?? null, ...form },
    })
    show(`${form.quantity} exemplaire(s) ajouté(s)`)
    form.quantity = 1
    emit('added')
  } catch (e) {
    show(apiError(e), 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="row" @submit.prevent="submit">
    <label>Quantité <input v-model.number="form.quantity" type="number" min="1" max="100" style="width: 5rem" /></label>
    <label>Rangement
      <select v-model="form.storageLocationId">
        <option :value="null">Sans rangement</option>
        <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
    </label>
    <label>État
      <select v-model="form.condition"><option v-for="c in CONDITIONS" :key="c">{{ c }}</option></select>
    </label>
    <label>Langue <input v-model="form.language" style="width: 4rem" /></label>
    <label class="inline" style="align-self: end; padding-bottom: 0.55rem"><input v-model="form.foil" type="checkbox" /> Foil ✦</label>
    <button class="primary" :disabled="busy" style="align-self: end">Ajouter</button>
  </form>
</template>
