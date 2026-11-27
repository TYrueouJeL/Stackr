<script setup lang="ts">
import type { Copy } from '~/utils/types'
import { CONDITIONS } from '~/utils/types'

const props = defineProps<{ copy: Copy; showCard?: boolean; selectable?: boolean; selected?: boolean }>()
const emit = defineEmits<{ changed: []; toggle: [id: number] }>()
const { locations, decklists } = useRefs()
const { show } = useToast()

async function patch(changes: Partial<Copy>) {
  try {
    await api(`/copies/${props.copy.id}`, { method: 'PATCH', body: changes })
    emit('changed')
  } catch (e) {
    show(apiError(e), 'error')
  }
}

async function remove() {
  if (!confirm('Supprimer cet exemplaire de ton stock ?')) return
  await api(`/copies/${props.copy.id}`, { method: 'DELETE' })
  show('Exemplaire supprimé')
  emit('changed')
}
</script>

<template>
  <tr>
    <td v-if="selectable"><input type="checkbox" :checked="selected" @change="emit('toggle', copy.id)" /></td>
    <td class="faint small">#{{ copy.id }}</td>
    <td v-if="showCard && copy.card">
      <NuxtLink :to="`/cards/${encodeURIComponent(copy.card.id)}`" class="card-cell">
        <img v-if="copy.card.thumbnailUrl" :src="copy.card.thumbnailUrl" class="thumb" alt="" loading="lazy" />
        <span class="stack" style="gap: 0">
          <span style="color: var(--text); font-weight: 500">{{ copy.card.name }}</span>
          <span class="tiny faint">{{ copy.card.setId }} #{{ copy.card.collectorNumber }}</span>
        </span>
      </NuxtLink>
    </td>
    <td>
      <select :value="copy.storageLocationId" @change="patch({ storageLocationId: ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null })">
        <option value="">Sans rangement</option>
        <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
      <span v-if="copy.binderPage" class="tag tiny" style="margin-left: 0.35rem" title="Emplacement dans le classeur">p.{{ copy.binderPage }} · {{ copy.binderSlot }}</span>
    </td>
    <td>
      <select :value="copy.decklistId" @change="patch({ decklistId: ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null })">
        <option value="">Libre</option>
        <option v-for="d in decklists" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
    </td>
    <td>
      <select :value="copy.condition" @change="patch({ condition: ($event.target as HTMLSelectElement).value })">
        <option v-for="c in CONDITIONS" :key="c">{{ c }}</option>
      </select>
    </td>
    <td><label class="inline"><input type="checkbox" :checked="copy.foil" @change="patch({ foil: ($event.target as HTMLInputElement).checked })" /><span v-if="copy.foil" class="tag foil">FOIL</span></label></td>
    <td class="small">{{ copy.language }}</td>
    <td><button class="small ghost danger" title="Supprimer cet exemplaire" @click="remove">Supprimer</button></td>
  </tr>
</template>
