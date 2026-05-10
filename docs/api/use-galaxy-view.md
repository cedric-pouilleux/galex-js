# `useGalaxyView(galaxyData, opts?)`

Composable Vue **impératif réactif** : wrap `createGalaxyScene` (vanilla) et expose chaque contrôle comme `Ref<T>` Vue. Mute la ref → la scène met à jour à la frame suivante. Cleanup automatique à l'unmount via `onScopeDispose`.

```ts
import { useGalaxyView } from 'galex-js/view-vue';

const view = useGalaxyView(galaxyData);
view.dimming.value = 0.3;
```

## Signature

```ts
function useGalaxyView(
  galaxyData: MaybeRefOrGetter<GalaxyData>,
  opts?: MaybeRefOrGetter<GalaxySceneOptions>,
): GalaxyViewHandle;
```

::: warning Cycle de vie
La scène est construite **une fois** sur le snapshot initial du `galaxyData`. Changer la ref downstream ne reconstruit pas la scène — pour swap de seed, re-mount le composant qui consomme le composable (`<KeepAlive>` swap, `:key="seed"`, etc.). C'est un choix conscient : la reconstruction est destructive (libère GPU) et doit être pilotée par le cycle de vie du composant, pas par un changement de ref.
:::

## Output `GalaxyViewHandle`

```ts
type GalaxyViewHandle = {
  // Refs réactives — mute pour piloter la scène.
  dimming: Ref<number>;
  gasDim: Ref<number>;
  haloVisible: Ref<boolean>;
  orthoSize: Ref<number>;
  visibilityField: Ref<VisibilityFieldConfig | null>;
  clipping: Ref<ClippingState>;

  // Three group à monter via <TresPrimitive>.
  readonly object3D: THREE.Group;

  // Scène vanilla sous-jacente (échappatoire — pour des reads avancés).
  readonly scene: GalaxyScene;

  // Cleanup manuel (l'auto-cleanup via onScopeDispose suffit dans 99% des cas).
  dispose(): void;
};

type ClippingState =
  | { active: false }
  | { active: true; normal: THREE.Vector3; point: THREE.Vector3 };
```

## Effets des refs

| Ref | Type | Effet sur la scène |
|---|---|---|
| `dimming` | `Ref<number>` | `scene.setDimming(v)` — multiplicateur global (0..1) sur toutes les couches |
| `gasDim` | `Ref<number>` | `scene.setGasDim(v)` — gas-only (armGlow, gasStreaks, nebulae, innerRing, centerDust) |
| `haloVisible` | `Ref<boolean>` | `scene.setHaloVisible(v)` — toggle du halo doux |
| `coreVisible` | `Ref<boolean>` | `scene.setCoreVisible(v)` — toggle du noyau galactique (anneau interne + bulbe) |
| `orthoSize` | `Ref<number>` | `scene.setOrthoSize(v)` — sprite size en mode ortho ; `0` = perspective |
| `visibilityField` | `Ref<VisibilityFieldConfig \| null>` | `scene.setVisibilityField(v)` — fog of war multi-focal |
| `clipping` | `Ref<ClippingState>` | `scene.setClipping(...)` — plan de clipping monde |

Watcher Vue interne (post-flush par défaut) : pas de surcoût pendant les changements UI typiques, et la frame suivante pickup la mutation d'uniform.

## Pattern complet

```vue
<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import * as THREE from 'three';
import { createGalaxyData } from 'galex-js/core/GalaxyData';
import { useGalaxyView } from 'galex-js/view-vue';

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });
const view = useGalaxyView(galaxy);

// Fog of war centré sur le joueur
function activateFog(playerCube: { i: number; k: number }) {
  view.visibilityField.value = { focals: [playerCube], range: 3 };
  view.haloVisible.value = false;
}
function deactivateFog() {
  view.visibilityField.value = null;
  view.haloVisible.value = true;
}

// Vue plateau 2D
function enterPlanView(zoom: number) {
  view.orthoSize.value = zoom;
  view.gasDim.value = 0.45;
}
function exitPlanView() {
  view.orthoSize.value = 0;
  view.gasDim.value = 1.0;
}

// Gros plan sur un cube
function enterCloseup(cubeWorldCenter: THREE.Vector3, camPos: THREE.Vector3) {
  view.dimming.value = 0.05;
  const dir = cubeWorldCenter.clone().sub(camPos).normalize();
  const planePoint = cubeWorldCenter.clone().addScaledVector(dir, -1.2);
  view.clipping.value = { active: true, normal: dir, point: planePoint };
}
function exitCloseup() {
  view.dimming.value = 1.0;
  view.clipping.value = { active: false };
}
</script>

<template>
  <TresCanvas window-size clear-color="#04060b">
    <TresPerspectiveCamera :position="[0, 70, 70]" make-default />
    <!-- TresJS adopts the prebuilt THREE.Group — no remount on uniform changes. -->
    <TresPrimitive :object="view.object3D" />
  </TresCanvas>
</template>
```

## Quand utiliser ce composable plutôt que `useGalaxyLayers` ?

| Besoin | API |
|---|---|
| Affichage statique, granularité par couche, pure template Vue | [`useGalaxyLayers`](./use-galaxy-layers) |
| Affichage + contrôles dynamiques | `useGalaxyView` |
| Sim côté client (sans rendu) | [`createGalaxyData`](./galaxy-data) seul |

Tu peux mixer dans le même composant — par exemple `useGalaxyView` pour le rendu principal, et un `createGalaxyData` séparé pour la sim qui partage le même `(seed, opts)` (déterminisme garantit l'alignement).
