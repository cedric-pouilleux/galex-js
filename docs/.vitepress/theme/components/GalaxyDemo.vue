<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, useTemplateRef } from 'vue';
import { TresCanvas } from '@tresjs/core';
import { createGalaxyData } from '../../../../core/GalaxyData';
import type { GalaxyDataOptions } from '../../../../core/GalaxyData';
import { GalaxyScene } from '../../../../view-vue';
import { useLazyMount } from './useLazyMount';

// Reusable demo canvas — builds a deterministic galaxy from props and renders
// it with idle Y rotation. SSR-safe via the surrounding ClientOnly.
const props = withDefaults(defineProps<{
  seed?: number;
  count?: number;
  radius?: number;
  innerRadius?: number;
  arms?: number;
  spin?: number;
  spread?: number;
  fieldRatio?: number;
  gasDensity?: number;
  height?: number;
  caption?: string;
  /** Camera elevation factor — 1 = standard 3/4, smaller = flatter, larger = more top-down. */
  cameraTilt?: number;
  /** Disable idle rotation (useful for plan-view or static comparison shots). */
  static?: boolean;
}>(), {
  seed: 42,
  count: 8000,
  radius: 50,
  height: 320,
  gasDensity: 1.0,
  cameraTilt: 1.0,
  static: false,
});

const opts = computed<GalaxyDataOptions>(() => ({
  seed: props.seed,
  count: props.count,
  radius: props.radius,
  innerRadius: props.innerRadius,
  arms: props.arms,
  spin: props.spin,
  spread: props.spread,
  fieldRatio: props.fieldRatio,
}));

// IntersectionObserver gates canvas creation — no WebGL context until visible.
const root = useTemplateRef<HTMLElement>('root');
const { active } = useLazyMount(root);

// `createGalaxyData` is pure CPU work; only run it once the demo is visible to
// avoid burning ~25 ms × N upfront on busy pages.
const galaxy = computed(() => (active.value ? createGalaxyData(opts.value) : null));

const rotY = ref(0);
const cameraPos = computed<[number, number, number]>(() => [
  0,
  70 * props.cameraTilt,
  70,
]);

let raf = 0;
function tick() {
  if (active.value && !props.static) rotY.value += 0.0015;
  raf = requestAnimationFrame(tick);
}
onMounted(() => { raf = requestAnimationFrame(tick); });
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <div ref="root" class="demo-frame" :style="{ height: height + 'px' }">
    <ClientOnly>
      <TresCanvas v-if="active && galaxy" clear-color="#04060b">
        <TresPerspectiveCamera
          :position="cameraPos"
          :look-at="[0, 0, 0]"
          :fov="55"
          make-default
        />
        <TresGroup :rotation="[0, rotY, 0]">
          <GalaxyScene :galaxy-data="galaxy" :gas-density="gasDensity" />
        </TresGroup>
      </TresCanvas>
    </ClientOnly>
    <div v-if="caption" class="demo-caption">{{ caption }}</div>
  </div>
</template>
