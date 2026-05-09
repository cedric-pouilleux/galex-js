<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, useTemplateRef } from 'vue';
import * as THREE from 'three';
import { TresCanvas } from '@tresjs/core';
import { createGalaxyData } from '../../../../core/GalaxyData';
import { useGalaxyView } from '../../../../view-vue';
import { useLazyMount } from './useLazyMount';

// 3-mode galaxy showcase: orbit / plan / closeup. Each mode rewires camera +
// dim / clipping uniforms via useGalaxyView. The galaxy itself is built once
// and reused across mode swaps — switching modes is purely a uniform update.
const props = withDefaults(defineProps<{
  seed?: number;
  count?: number;
  height?: number;
  closeupCube?: { i: number; k: number };
}>(), {
  seed: 42,
  count: 8000,
  height: 380,
  closeupCube: () => ({ i: 0, k: 0 }),
});

type Mode = 'orbit' | 'plan' | 'closeup';
const mode = ref<Mode>('orbit');

const root = useTemplateRef<HTMLElement>('root');
const { active } = useLazyMount(root);

// Build galaxy + view eagerly: it's CPU-only (no WebGL context yet). The
// canvas itself is lazy-mounted via `active`, so GPU resources stay scoped
// to the demo being on screen.
const galaxy = computed(() => createGalaxyData({ seed: props.seed, count: props.count, radius: 50 }));
const view = useGalaxyView(galaxy);

// Orbit and plan only differ in camera position + the orthoSize uniform.
const cameraPos = computed<[number, number, number]>(() => {
  if (mode.value === 'plan') return [0, 95, 0.01];
  return [0, 70, 70];
});
const cameraFov = computed(() => (mode.value === 'plan' ? 35 : 55));

// Idle rotation only in orbit mode.
const rotY = ref(0);
let raf = 0;
function tick() {
  if (mode.value === 'orbit') rotY.value += 0.0015;
  raf = requestAnimationFrame(tick);
}
onMounted(() => { raf = requestAnimationFrame(tick); });
onBeforeUnmount(() => cancelAnimationFrame(raf));

// Reactively forward mode → uniforms via the composable refs.
watch(mode, (m) => {
  if (m === 'closeup') {
    view.dimming.value = 0.04;
    const c = galaxy.value.grid.cubeToWorldCenter(props.closeupCube.i, 0, props.closeupCube.k);
    view.clipping.value = {
      active: true,
      normal: new THREE.Vector3(0, 0, 1),
      point: new THREE.Vector3(c.x, c.y, c.z + 5),
    };
  } else {
    view.dimming.value = 1.0;
    view.clipping.value = { active: false };
  }
});

const captionByMode: Record<Mode, string> = {
  orbit: 'Orbite — perspective 3/4',
  plan: 'Plan — orthographique vue de dessus',
  closeup: 'Close-up — galaxie de fond clippée + dim',
};
</script>

<template>
  <div ref="root" class="demo-frame" :style="{ height: height + 'px' }">
    <div class="demo-modeswitch">
      <button :class="{ active: mode === 'orbit' }" @click="mode = 'orbit'">orbite</button>
      <button :class="{ active: mode === 'plan' }" @click="mode = 'plan'">plan</button>
      <button :class="{ active: mode === 'closeup' }" @click="mode = 'closeup'">close-up</button>
    </div>
    <ClientOnly>
      <TresCanvas v-if="active" clear-color="#04060b">
        <TresPerspectiveCamera
          :position="cameraPos"
          :look-at="[0, 0, 0]"
          :fov="cameraFov"
          make-default
        />
        <TresGroup :rotation="[0, rotY, 0]">
          <primitive :object="view.object3D" />
        </TresGroup>
      </TresCanvas>
    </ClientOnly>
    <div class="demo-caption">{{ captionByMode[mode] }}</div>
  </div>
</template>
