<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, shallowRef, useTemplateRef } from 'vue';
import * as THREE from 'three';
import { TresCanvas } from '@tresjs/core';
import { createGalaxyData } from '../../../../core/GalaxyData';
import { useGalaxyView } from '../../../../view-vue';
import { createCubeMarker } from '../../../../view/CubeMarker';
import type { CubeMarker } from '../../../../view/CubeMarker';
import { useLazyMount } from './useLazyMount';

// CubeMarker showcase. Three markers (player + two enemies) anchored on cube
// centers, with a plan-view toggle that flips their blending mode.
const props = withDefaults(defineProps<{
  seed?: number;
  count?: number;
  height?: number;
}>(), {
  seed: 42,
  count: 8000,
  height: 380,
});

const root = useTemplateRef<HTMLElement>('root');
const { active } = useLazyMount(root);

const galaxy = computed(() => createGalaxyData({ seed: props.seed, count: props.count, radius: 50 }));
const view = useGalaxyView(galaxy);

type MarkerSpec = { cube: { i: number; k: number }; color: number; bodyColor: number };
const specs: MarkerSpec[] = [
  { cube: { i: 0, k: 0 }, color: 0x7fff9f, bodyColor: 0x55ee70 },
  { cube: { i: -4, k: 3 }, color: 0xff4060, bodyColor: 0xff5070 },
  { cube: { i: 6, k: -2 }, color: 0x60a0ff, bodyColor: 0x80b8ff },
];

const markers = shallowRef<CubeMarker[]>([]);
const planView = ref(false);

onMounted(() => {
  const cubeSize = galaxy.value.opts.cubeSize;
  markers.value = specs.map((spec) => {
    const m = createCubeMarker(cubeSize, { color: spec.color, bodyColor: spec.bodyColor });
    const c = galaxy.value.grid.cubeToWorldCenter(spec.cube.i, 0, spec.cube.k);
    m.object3D.position.set(c.x, c.y, c.z);
    return m;
  });
});

watch(planView, (active) => {
  for (const m of markers.value) m.setPlanView(active);
});

const cameraPos = computed<[number, number, number]>(() =>
  planView.value ? [0, 95, 0.01] : [0, 70, 70],
);
const cameraFov = computed(() => (planView.value ? 35 : 55));

const rotY = ref(0);
let raf = 0;
function tick() {
  if (!planView.value) rotY.value += 0.001;
  raf = requestAnimationFrame(tick);
}
onMounted(() => { raf = requestAnimationFrame(tick); });
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  for (const m of markers.value) {
    m.object3D.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
  }
});
</script>

<template>
  <div ref="root" class="demo-frame" :style="{ height: height + 'px' }">
    <div class="demo-modeswitch">
      <button :class="{ active: !planView }" @click="planView = false">orbite</button>
      <button :class="{ active: planView }" @click="planView = true">plan</button>
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
          <primitive
            v-for="(m, i) in markers"
            :key="i"
            :object="m.object3D"
          />
        </TresGroup>
      </TresCanvas>
    </ClientOnly>
    <div class="demo-caption">
      3 cube markers — bascule {{ planView ? 'plan' : 'orbite' }}
    </div>
  </div>
</template>
