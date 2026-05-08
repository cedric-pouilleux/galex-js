# `createGalaxyScene(galaxyData, viewOpts?)`

Construit la scène Three impérative à partir d'un `GalaxyData`. Compose toutes les couches visuelles (étoiles, halo, halo de bras, streaks de gaz, nébuleuses, anneau interne, bulbe central) dans un `THREE.Group` prêt à attacher à la scène. Expose les contrôles per-frame.

::: code-group

```ts [Vanilla Three]
import * as THREE from 'three';
import { createGalaxyScene } from 'stellex-galaxy-sandbox/view/GalaxyScene';
import type { GalaxyScene, GalaxySceneOptions } from 'stellex-galaxy-sandbox/view/GalaxyScene';

const view = createGalaxyScene(galaxy, { gasDensity: 1.0 });
scene.add(view.object3D);

// Per-frame controls
view.setDimming(0.5);
view.setGasDim(0.45);
```

```vue [Vue / TresJS]
<script setup lang="ts">
import { useGalaxyView } from 'stellex-galaxy-sandbox/view-vue';

// Wraps createGalaxyScene + exposes its setters as reactive refs.
const view = useGalaxyView(galaxy, { gasDensity: 1.0 });

view.dimming.value = 0.5;   // forwards to scene.setDimming(0.5)
view.gasDim.value = 0.45;
</script>

<template>
  <TresCanvas window-size>
    <TresPerspectiveCamera make-default />
    <TresPrimitive :object="view.object3D" />
  </TresCanvas>
</template>
```

:::

`useGalaxyView` est un composable Vue qui wrap `createGalaxyScene` — chaque setter devient une `Ref<T>` réactive, mutable depuis n'importe quel handler. Cf. [useGalaxyView](./use-galaxy-view) pour l'API complète.

## Options

```ts
type GalaxySceneOptions = {
  gasDensity?: number;     // 1.0 — multiplicateur sur les couches gaz/nébuleuses
};
```

## API retournée

```ts
type GalaxyScene = {
  readonly object3D: THREE.Group;

  // Per-frame controls — mute les uniforms via la closure.
  setDimming(factor: number): void;
  setGasDim(factor: number): void;
  setHaloVisible(visible: boolean): void;
  setOrthoSize(zoom: number): void;
  setClipping(active: boolean, normal?: THREE.Vector3, point?: THREE.Vector3): void;
  setVisibilityField(config: VisibilityFieldConfig | null): void;

  // Cleanup.
  dispose(): void;
};
```

## Contrôles

### `setDimming(factor)`

Multiplie le `uDim` uniform sur **toutes** les couches (étoiles + halo + gaz). Utile pour atténuer la galaxie de fond pendant un gros plan.

::: code-group

```ts [Vanilla Three]
view.setDimming(0.05);   // very dimmed
view.setDimming(1.0);    // restore
```

```ts [Vue / TresJS]
view.dimming.value = 0.05;
view.dimming.value = 1.0;
```

:::

### `setGasDim(factor)`

Comme `setDimming`, mais **uniquement** sur les couches gaz : armGlow, gasStreaks, nebulae, innerRing, centerDust. Les étoiles et le halo restent à pleine intensité. Utilisé en vue plateau 2D où le gaz écrase visuellement le reste.

### `setHaloVisible(boolean)`

Toggle le halo doux (cercle XZ derrière le disque). Le cacher est typique quand on active un fog of war centré sur le joueur — sinon le halo extérieur reste visible alors que le reste s'éteint.

### `setOrthoSize(zoom)`

Driver pour la taille des sprites en caméra orthographique. Passer `0` pour revenir à la formule perspective. Les facteurs par couche (étoiles ×1.9, gaz ×2.6) sont calibrés pour matcher visuellement la perspective.

### `setClipping(active, normal?, point?)`

Plan de clipping monde. Tous les fragments où `dot(normal, worldPos) + constant < 0` sont discardés. Utilisé pendant un gros plan pour cacher les étoiles entre la caméra et le cube cible.

::: code-group

```ts [Vanilla Three]
view.setClipping(true, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 5));
view.setClipping(false);
```

```ts [Vue / TresJS]
view.clipping.value = {
  active: true,
  normal: new THREE.Vector3(0, 0, 1),
  point: new THREE.Vector3(0, 0, 5),
};
view.clipping.value = { active: false };
```

:::

### `setVisibilityField(config)`

Pilote l'opacité par-particule basée sur un champ de visibilité multi-focal. Voir [primitives/visibility-field](../primitives/visibility-field) pour le détail du modèle.

::: code-group

```ts [Vanilla Three]
view.setVisibilityField({
  focals: [{ i: -2, k: 4 }, { i: 6, k: -1 }],
  range: 3,
  fadedOpacity: 0.18,
});
view.setVisibilityField(null);   // clear
```

```ts [Vue / TresJS]
view.visibilityField.value = {
  focals: [{ i: -2, k: 4 }, { i: 6, k: -1 }],
  range: 3,
  fadedOpacity: 0.18,
};
view.visibilityField.value = null;
```

:::

## Encapsulation

Les couches internes (`field`, `halo`, `armGlow`, etc.) sont **privées** dans la closure — pas exposées sur le retour. Les seules manipulations externes possibles sont via les `setX(...)`. Si un nouveau besoin de granularité émerge, on ajoute une méthode dédiée à l'API plutôt que de remonter un `as any`.

## Cleanup

```ts
scene.remove(view.object3D);
view.dispose();    // libère geometries + materials
```

`dispose()` traverse `object3D` et libère toutes les ressources GPU. Le `GalaxyData` sous-jacent n'est pas affecté (il survit, ré-utilisable pour reconstruire une scène).

## Cycle typique pour une régénération

```ts
// Old generation
scene.remove(oldView.object3D);
oldView.dispose();

// New generation
const newGalaxy = createGalaxyData({ ...opts, seed: newSeed });
const newView = createGalaxyScene(newGalaxy, { gasDensity });
scene.add(newView.object3D);
```
