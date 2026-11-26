<script setup lang="ts">
const props = withDefaults(defineProps<{ value: number; size?: number; stroke?: number }>(), {
  size: 72,
  stroke: 6,
})
const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const mounted = ref(false)
onMounted(() => requestAnimationFrame(() => (mounted.value = true)))
const offset = computed(() => {
  const v = mounted.value ? Math.min(100, Math.max(0, props.value)) : 0
  return circumference.value * (1 - v / 100)
})
const id = useId()
</script>

<template>
  <div class="ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size">
      <defs>
        <linearGradient :id="`ring-${id}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" :stop-color="value >= 100 ? '#9cf0c4' : '#f7dc9b'" />
          <stop offset="1" :stop-color="value >= 100 ? '#2e9e6a' : '#a87a2c'" />
        </linearGradient>
      </defs>
      <circle class="track" :cx="size / 2" :cy="size / 2" :r="radius" fill="none" :stroke-width="stroke" />
      <circle
        class="bar"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="`url(#ring-${id})`"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
      />
    </svg>
    <div class="label">
      <slot>
        <strong :style="{ fontSize: `${size / 4.6}px` }">{{ Math.round(value) }}<small style="font-size: 0.6em">%</small></strong>
      </slot>
    </div>
  </div>
</template>
