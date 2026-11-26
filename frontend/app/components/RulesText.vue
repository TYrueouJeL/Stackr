<script setup lang="ts">
/**
 * Affiche le texte de règles en remplaçant les symboles (:rb_energy_2:, :rb_might:…)
 * et en mettant en valeur les mots-clés entre crochets.
 */
const props = defineProps<{ text: string }>()

type Part =
  | { kind: 'text'; value: string }
  | { kind: 'energy'; value: string }
  | { kind: 'might' }
  | { kind: 'exhaust' }
  | { kind: 'rune'; color: string; name: string }
  | { kind: 'keyword'; value: string }

const RUNES: Record<string, string> = {
  fury: '#ef5b4c',
  calm: '#4cc38a',
  mind: '#4c8ff0',
  body: '#f39a3c',
  chaos: '#b067f0',
  order: '#f0d24c',
}

const parts = computed<Part[]>(() => {
  const out: Part[] = []
  const regex = /:rb_([a-z]+)(?:_([a-z0-9]+))?:|\[([^\]]+)\]/gi
  let last = 0
  for (const match of props.text.matchAll(regex)) {
    if (match.index > last) out.push({ kind: 'text', value: props.text.slice(last, match.index) })
    last = match.index + match[0].length
    if (match[3]) {
      out.push({ kind: 'keyword', value: match[3] })
      continue
    }
    const [, symbol, arg] = match
    if (symbol === 'energy') out.push({ kind: 'energy', value: arg ?? '' })
    else if (symbol === 'might') out.push({ kind: 'might' })
    else if (symbol === 'exhaust') out.push({ kind: 'exhaust' })
    else if (symbol === 'rune') {
      const name = (arg ?? '').toLowerCase()
      out.push({ kind: 'rune', name, color: RUNES[name] ?? 'rainbow' })
    } else out.push({ kind: 'text', value: match[0] })
  }
  if (last < props.text.length) out.push({ kind: 'text', value: props.text.slice(last) })
  return out
})
</script>

<template>
  <span class="rules-text">
    <template v-for="(p, i) in parts" :key="i">
      <template v-if="p.kind === 'text'">{{ p.value }}</template>
      <span v-else-if="p.kind === 'keyword'" class="kw">{{ p.value }}</span>
      <span v-else-if="p.kind === 'energy'" class="sym energy" :title="`${p.value} énergie`">{{ p.value }}</span>
      <span v-else-if="p.kind === 'might'" class="sym might" title="Puissance">⚔</span>
      <span v-else-if="p.kind === 'exhaust'" class="sym exhaust" title="Épuiser">↻</span>
      <span
        v-else-if="p.kind === 'rune'"
        class="sym rune"
        :class="{ rainbow: p.color === 'rainbow' }"
        :style="p.color !== 'rainbow' ? { background: p.color } : {}"
        :title="`Rune ${p.name}`"
      />
    </template>
  </span>
</template>

<style scoped>
.kw {
  font-weight: 700;
  color: var(--gold-2);
  padding: 0 0.3rem;
  border-radius: 4px;
  background: rgba(227, 180, 95, 0.12);
}
.sym {
  display: inline-grid;
  place-items: center;
  vertical-align: -0.15em;
  margin: 0 0.1em;
}
.energy {
  width: 1.25em;
  height: 1.25em;
  border-radius: 50%;
  font-size: 0.82em;
  font-weight: 800;
  color: #10131f;
  background: radial-gradient(circle at 35% 30%, #fff, #cfd6ea 60%, #8d97b5);
}
.might { color: #f0605c; font-size: 0.95em; }
.exhaust { color: var(--teal); font-weight: 800; }
.rune {
  width: 0.8em;
  height: 0.8em;
  transform: rotate(45deg);
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.3);
}
.rune.rainbow { background: conic-gradient(#ef5b4c, #f39a3c, #f0d24c, #4cc38a, #4c8ff0, #b067f0, #ef5b4c); }
</style>
