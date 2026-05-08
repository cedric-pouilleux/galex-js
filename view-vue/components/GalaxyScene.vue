<script setup lang="ts">
import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { GalaxyData } from '../../core/GalaxyData.js';
import { useGalaxyLayers } from '../composables/UseGalaxyLayers.js';
import type { GalaxyLayersOptions } from '../composables/UseGalaxyLayers.js';

const props = defineProps<{
  galaxyData: GalaxyData;
  gasDensity?: number;
}>();

// Reactive layers: buffers + material defs derived from the input.
const layers = useGalaxyLayers(
  () => props.galaxyData,
  computed<GalaxyLayersOptions>(() => ({ gasDensity: toValue(props.gasDensity) ?? 1.0 })),
);
</script>

<template>
  <TresGroup name="galaxy">
    <!-- Star field -->
    <TresPoints :frustum-culled="false" name="stars">
      <TresBufferGeometry
        :position="[layers.field.positions, 3]"
        :a-color="[layers.field.colors, 3]"
        :a-size="[layers.field.sizes, 1]"
        :a-visibility="[layers.field.visibility, 1]"
      />
      <TresShaderMaterial v-bind="layers.field.materialDef" />
    </TresPoints>

    <!-- Halo (flat circle, rotated -90° on X) -->
    <TresMesh
      :geometry="layers.halo.geometry"
      name="halo"
      :rotation="[-Math.PI / 2, 0, 0]"
    >
      <TresShaderMaterial v-bind="layers.halo.materialDef" />
    </TresMesh>

    <!-- Arm glow -->
    <TresPoints :frustum-culled="false" name="armGlow">
      <TresBufferGeometry
        :position="[layers.armGlow.buffers.positions, 3]"
        :a-color="[layers.armGlow.buffers.colors, 3]"
        :a-size="[layers.armGlow.buffers.sizes, 1]"
        :a-tangent="[layers.armGlow.buffers.tangents, 2]"
        :a-stretch="[layers.armGlow.buffers.stretches, 1]"
        :a-visibility="[layers.armGlow.buffers.visibility, 1]"
      />
      <TresShaderMaterial v-bind="layers.armGlow.materialDef" />
    </TresPoints>

    <!-- Gas streaks -->
    <TresPoints :frustum-culled="false" name="gasStreaks">
      <TresBufferGeometry
        :position="[layers.gasStreaks.buffers.positions, 3]"
        :a-color="[layers.gasStreaks.buffers.colors, 3]"
        :a-size="[layers.gasStreaks.buffers.sizes, 1]"
        :a-tangent="[layers.gasStreaks.buffers.tangents, 2]"
        :a-stretch="[layers.gasStreaks.buffers.stretches, 1]"
        :a-visibility="[layers.gasStreaks.buffers.visibility, 1]"
      />
      <TresShaderMaterial v-bind="layers.gasStreaks.materialDef" />
    </TresPoints>

    <!-- Nebulae -->
    <TresPoints :frustum-culled="false" name="nebulae">
      <TresBufferGeometry
        :position="[layers.nebulae.buffers.positions, 3]"
        :a-color="[layers.nebulae.buffers.colors, 3]"
        :a-size="[layers.nebulae.buffers.sizes, 1]"
        :a-visibility="[layers.nebulae.buffers.visibility, 1]"
      />
      <TresShaderMaterial v-bind="layers.nebulae.materialDef" />
    </TresPoints>

    <!-- Inner ring -->
    <TresPoints :frustum-culled="false" name="innerRing">
      <TresBufferGeometry
        :position="[layers.innerRing.buffers.positions, 3]"
        :a-color="[layers.innerRing.buffers.colors, 3]"
        :a-size="[layers.innerRing.buffers.sizes, 1]"
        :a-tangent="[layers.innerRing.buffers.tangents, 2]"
        :a-stretch="[layers.innerRing.buffers.stretches, 1]"
        :a-visibility="[layers.innerRing.buffers.visibility, 1]"
      />
      <TresShaderMaterial v-bind="layers.innerRing.materialDef" />
    </TresPoints>

    <!-- Center bulge: disc + spiraled dust (only when fillCenter) -->
    <template v-if="layers.centerDust">
      <TresMesh
        :geometry="layers.centerDust.disc.geometry"
        name="centerDisc"
        :rotation="[-Math.PI / 2, 0, 0]"
      >
        <TresShaderMaterial v-bind="layers.centerDust.disc.materialDef" />
      </TresMesh>
      <TresPoints :frustum-culled="false" name="centerDust">
        <TresBufferGeometry
          :position="[layers.centerDust.dust.buffers.positions, 3]"
          :a-color="[layers.centerDust.dust.buffers.colors, 3]"
          :a-size="[layers.centerDust.dust.buffers.sizes, 1]"
          :a-tangent="[layers.centerDust.dust.buffers.tangents, 2]"
          :a-stretch="[layers.centerDust.dust.buffers.stretches, 1]"
          :a-visibility="[layers.centerDust.dust.buffers.visibility, 1]"
        />
        <TresShaderMaterial v-bind="layers.centerDust.dust.materialDef" />
      </TresPoints>
    </template>
  </TresGroup>
</template>
