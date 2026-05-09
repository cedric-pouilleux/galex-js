<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, useTemplateRef } from 'vue';
import * as THREE from 'three';
import { TresCanvas } from '@tresjs/core';
import { createGalaxyData } from '../../../../core/GalaxyData';
import { prepareCloseupField } from '../../../../view/closeup/Buffers';
import { createHoverRing } from '../../../../view/closeup/HoverRing';
import type { CloseupField } from '../../../../view/closeup/Buffers';
import type { Cube } from '../../../../core/CubeGrid';
import { useLazyMount } from './useLazyMount';

// Close-up demo on a single cube. The hover ring auto-cycles through the
// cube's stars so the visual reads without user interaction. We use a
// synthetic camera object (only `.position` matters to `showOn`).
const props = withDefaults(defineProps<{
  seed?: number;
  height?: number;
}>(), {
  seed: 42,
  height: 380,
});

const root = useTemplateRef<HTMLElement>('root');
const { active } = useLazyMount(root);

const galaxy = computed(() =>
  createGalaxyData({ seed: props.seed, count: 12000, radius: 50 }),
);

const closeupField = shallowRef<CloseupField | null>(null);
const cubeCenter = ref<[number, number, number]>([0, 0, 0]);
const hoverRing = createHoverRing();

// Pick the first populated cube — guarantees a non-empty close-up.
function firstPopulatedCube(): Cube | null {
  for (const c of galaxy.value.grid.cubes.values()) {
    if (c.starIndices.length >= 3) return c;
  }
  return null;
}

const cameraPos = ref<[number, number, number]>([0, 0, 0]);

onMounted(() => {
  const cube = firstPopulatedCube();
  if (!cube) return;
  closeupField.value = prepareCloseupField(cube, galaxy.value);
  const c = galaxy.value.grid.cubeToWorldCenter(cube.i, cube.j, cube.k);
  cubeCenter.value = [c.x, c.y, c.z];
  cameraPos.value = [c.x + 4, c.y + 2, c.z + 4];
});

onBeforeUnmount(() => {
  const f = closeupField.value;
  if (!f) return;
  f.points.geometry.dispose();
  (f.points.material as THREE.ShaderMaterial).dispose();
});

// Synthetic camera-like object: hoverRing.showOn only reads .position.
const cameraStub = new THREE.Object3D();
let raf = 0;
let starCursor = 0;
let lastSwap = 0;
function tick(t: number) {
  const f = closeupField.value;
  if (f && t - lastSwap > 1400) {
    const N = (f.points.geometry.attributes.position.array as Float32Array).length / 3;
    if (N > 0) {
      starCursor = (starCursor + 1) % N;
      cameraStub.position.set(cameraPos.value[0], cameraPos.value[1], cameraPos.value[2]);
      hoverRing.showOn(f.points, starCursor, cameraStub as unknown as THREE.Camera, f.temps[starCursor]);
    }
    lastSwap = t;
  }
  raf = requestAnimationFrame(tick);
}
onMounted(() => { raf = requestAnimationFrame(tick); });
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <div ref="root" class="demo-frame" :style="{ height: height + 'px' }">
    <ClientOnly>
      <TresCanvas v-if="active" clear-color="#04060b">
        <TresPerspectiveCamera
          :position="cameraPos"
          :look-at="cubeCenter"
          :fov="40"
          make-default
        />
        <primitive v-if="closeupField" :object="closeupField.points" />
        <primitive :object="hoverRing.object" />
      </TresCanvas>
    </ClientOnly>
    <div class="demo-caption">
      Close-up — sous-buffer + hover ring auto-cycle
    </div>
  </div>
</template>
