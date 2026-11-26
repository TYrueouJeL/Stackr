<script setup lang="ts">
const props = defineProps<{ value: number }>()
const mounted = ref(false)
onMounted(() => requestAnimationFrame(() => (mounted.value = true)))
const width = computed(() => `${mounted.value ? Math.min(100, Math.max(0, props.value)) : 0}%`)
</script>

<template>
  <div class="progress" :class="{ ok: value >= 100 }"><span :style="{ width }" /></div>
</template>
