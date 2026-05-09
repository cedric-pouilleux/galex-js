<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, useTemplateRef } from 'vue';
import { TresCanvas } from '@tresjs/core';
import { createGalaxyData } from '../../../../core/GalaxyData';
import { useGalaxyView } from '../../../../view-vue';
import { useLazyMount } from './useLazyMount';

// Visibility-field demo. Two focals visualise a fog-of-war centred on a
// player cube + a scout cube; the slider toggles range. Per-particle opacity
// updates in real time via setVisibilityField.
const props = withDefaults(defineProps<{
  seed?: number;
  count?: number;
  height?: number;
}>(), {
  seed: 42,
  count: 10000,
  height: 380,
});

const root = useTemplateRef<HTMLElement>('root');
const { active } = useLazyMount(root);

const galaxy = computed(() => createGalaxyData({ seed: props.seed, count: props.count, radius: 50 }));
const view = useGalaxyView(galaxy);

const range = ref(4);
const fogActive = ref(true);

const focals = [
  { i: -3, k: 2 },
  { i: 5, k: -4 },
];

watch([fogActive, range], ([active, r]) => {
  view.visibilityField.value = active
    ? { focals, range: r, fadedOpacity: 0.18 }
    : null;
}, { immediate: true });

const rotY = ref(0);
let raf = 0;
function tick() {
  rotY.value += 0.0008;
  raf = requestAnimationFrame(tick);
}
onMounted(() => { raf = requestAnimationFrame(tick); });
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <div ref="root" class="demo-frame" :style="{ height: height + 'px' }">
    <div class="demo-modeswitch">
      <button :class="{ active: fogActive }" @click="fogActive = !fogActive">
        {{ fogActive ? 'fog: on' : 'fog: off' }}
      </button>
      <button v-if="fogActive" disabled style="opacity: 0.6;">range {{ range }}</button>
      <button v-if="fogActive" @click="range = Math.max(1, range - 1)">−</button>
      <button v-if="fogActive" @click="range = Math.min(8, range + 1)">+</button>
    </div>
    <ClientOnly>
      <TresCanvas v-if="active" clear-color="#04060b">
        <TresPerspectiveCamera
          :position="[0, 70, 70]"
          :look-at="[0, 0, 0]"
          :fov="55"
          make-default
        />
        <TresGroup :rotation="[0, rotY, 0]">
          <primitive :object="view.object3D" />
        </TresGroup>
      </TresCanvas>
    </ClientOnly>
    <div class="demo-caption">
      Visibility field — 2 focals, range {{ range }}
    </div>
  </div>
</template>
