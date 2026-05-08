# Visibility field

Pilote l'opacité par-particule autour d'un ou plusieurs **cubes focaux**, avec un **anneau intérieur** entièrement visible et un **anneau extérieur** atténué.

C'est la primitive technique derrière ce qu'un jeu appelle souvent *fog of war*, *line of sight*, *sensor range*, *spotlight*. Le sens est plug par le caller, la lib ne nomme que le mécanisme.

## Modèle

Pour chaque particule, sa visibilité est déterminée par **la distance carrée minimale au cube focal le plus proche** (Euclidienne sur le plan i/k) :

| Distance² | Visibilité |
|---|---|
| `d² ≤ (range - 1)²` | `1.0` (cœur visible) |
| `(range - 1)² < d² ≤ range²` | `fadedOpacity` (anneau extérieur) |
| `d² > range²` | `0.0` (caché) |

Avec plusieurs focals qui se chevauchent, **la visibilité maximale gagne** : un cube sur la frange d'un focal mais au cœur d'un autre est pleinement visible.

## GalaxyScene.setVisibilityField

```ts
galaxyScene.setVisibilityField(config: VisibilityFieldConfig | null): void
```

Applique le calcul à toutes les couches participants : `field` (étoiles), `armGlow`, `gasStreaks`, `nebulae`. Pour chacune, écrit l'opacité par-vertex dans l'attribut `aVisibility` que les shaders consomment.

```ts
type VisibilityFieldConfig = {
  focals: { i: number; k: number; j?: number }[]; // non-vide
  range: number;                                   // unités cube
  fadedOpacity?: number;                           // défaut 0.2
};
```

Passer `null` ou `undefined` rétablit `aVisibility = 1` partout (clear).

::: code-group

```ts [Vanilla Three]
import { createGalaxyScene } from 'stellex-galaxy-sandbox/view/GalaxyScene';

const galaxyScene = createGalaxyScene(galaxy);

galaxyScene.setVisibilityField({
  focals: [{ i: -2, k: 4 }, { i: 6, k: -1 }],
  range: 3,
  fadedOpacity: 0.18,
});

galaxyScene.setVisibilityField(null);   // clear
```

```vue [Vue / TresJS]
<script setup lang="ts">
import { useGalaxyView } from 'stellex-galaxy-sandbox/view-vue';

const view = useGalaxyView(galaxy);

function activateFog(playerCube: { i: number; k: number }, scouts: { i: number; k: number }[]) {
  view.visibilityField.value = {
    focals: [playerCube, ...scouts],
    range: 3,
    fadedOpacity: 0.18,
  };
}

function clearFog() {
  view.visibilityField.value = null;
}
</script>

<template>
  <TresCanvas window-size>
    <TresPerspectiveCamera make-default />
    <TresPrimitive :object="view.object3D" />
  </TresCanvas>
</template>
```

:::

## createVisibilityFieldLines {#createvisibilityfieldlines}

```ts
import { createVisibilityFieldLines } from 'stellex/view/GridHelper.js';

createVisibilityFieldLines(grid, focals, opts?): THREE.Group
```

Wireframe à 2 niveaux d'opacité sur les cubes couverts. Inner cubes (tier 0) ont l'opacité forte, rim cubes (tier 1) l'opacité faible. Quand plusieurs focals se chevauchent, **le tier le plus visible gagne**.

| Option | Défaut |
|---|---|
| `range` | `2` |
| `color` | `0x223044` |
| `fullOpacity` | `0.22` |
| `fadedOpacity` | `0.045` |

À utiliser conjointement avec `setVisibilityField` pour matcher visuellement le contour de la zone visible.

## computeVisibilityField {#computevisibilityfield}

Helper pur, exporté depuis `core/visibility.ts`. Aucune dépendance Three — testable en Node, utilisable côté serveur.

```ts
import { computeVisibilityField } from 'stellex/core/visibility.js';

computeVisibilityField(
  positions: Float32Array,    // flat XYZ buffer
  grid: { cubeSize, originX, originZ },
  focals: { i: number; k: number }[],
  range: number,
  fadedOpacity?: number,      // défaut 0.2
  out?: Float32Array,         // buffer réutilisé ; alloué si omis
): Float32Array
```

Bit-stable (uniquement `+ - * < / floor`). Le caller fournit `out` pour éviter une allocation en boucle de rendu.

## tierMapForVisibilityField {#tiermap}

Helper pur qui projette les focals sur la grille, retourne une `Map<cubeKey, 0 | 1>`. Utile pour piloter du rendu wireframe ou pour des décisions gameplay côté serveur (« quels cubes ce joueur peut-il voir cette frame ? »).

```ts
import { tierMapForVisibilityField } from 'stellex/core/visibility.js';

tierMapForVisibilityField(
  focals: { i: number; k: number; j?: number }[],
  range: number,
  cubeExists: (i: number, j: number, k: number) => boolean,
): Map<string, 0 | 1>
```

`cubeKey` au format `"i|j|k"`. Les cubes hors range ou pour lesquels `cubeExists` retourne `false` sont absents de la map.

## Performance

`computeVisibilityField` est `O(particules × focals)`. Pour 15 000 étoiles × 4 layers et 1 focal, environ 1 ms par appel sur V8. Avec 10 focals, ~5 ms — toujours négligeable pour un slider qui retire à 60 Hz, et nul pour des changements de tour.
