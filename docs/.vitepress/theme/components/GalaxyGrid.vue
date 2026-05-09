<script setup lang="ts">
import GalaxyDemo from './GalaxyDemo.vue';

// Container that renders multiple GalaxyDemo cells in a responsive grid.
// Each cell is configured by an entry in `items` — same prop shape as
// GalaxyDemo, plus a required caption.
defineProps<{
  items: {
    seed?: number;
    count?: number;
    radius?: number;
    innerRadius?: number;
    arms?: number;
    spin?: number;
    spread?: number;
    fieldRatio?: number;
    gasDensity?: number;
    cameraTilt?: number;
    static?: boolean;
    caption: string;
  }[];
  height?: number;
}>();
</script>

<template>
  <div class="demo-grid">
    <GalaxyDemo
      v-for="(item, i) in items"
      :key="i"
      v-bind="item"
      :height="height ?? 240"
    />
  </div>
</template>
