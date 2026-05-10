# Intégration Vue / TresJS

La lib expose un dossier `view-vue/` dédié à la consommation depuis [Vue 3](https://vuejs.org) + [TresJS](https://tresjs.org). Trois éléments publiques :

- **`useGalaxyLayers(galaxyData, opts?)`** — composable qui dérive les buffers + material defs réactifs depuis un `GalaxyData`.
- **`<GalaxyScene>`** — composant drop-in qui consomme le composable et monte chaque couche dans le graphe TresJS.
- **Types associés** — `GalaxyLayers`, `StarLayer`, `PointsLayer<T>`, `HaloLayer`, `CenterDustLayer`.

## Setup côté consommateur

`vue` et `@tresjs/core` sont déclarés comme **peer dependencies optionnelles**. Si tu consommes seulement `core/` ou `view/`, tu ne paies pas leur coût d'install.

```bash
npm install three vue @tresjs/core
npm install --save-dev @vitejs/plugin-vue vue-tsc
```

Côté `vite.config.ts`, brancher le plugin Vue avec la conf TresJS :

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { templateCompilerOptions } from '@tresjs/core';

export default defineConfig({
  plugins: [vue(templateCompilerOptions)],
});
```

::: warning Whitelist TresJS
Sans `templateCompilerOptions`, le compilateur Vue traite **tous** les `<TresXxx>` comme des custom elements — y compris `<TresCanvas>` qui est en fait un vrai composant Vue. Résultat : écran noir, pas d'erreur. La whitelist fournie par TresJS distingue proprement les vrais composants des primitives.
:::

## Usage minimal

```vue
<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import { createGalaxyData } from 'galex-js/core/GalaxyData';
import { GalaxyScene } from 'galex-js/view-vue';

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });
</script>

<template>
  <TresCanvas window-size clear-color="#04060b">
    <TresPerspectiveCamera :position="[0, 70, 70]" :look-at="[0, 0, 0]" make-default />
    <GalaxyScene :galaxy-data="galaxy" :gas-density="1.0" />
  </TresCanvas>
</template>
```

## Usage avancé — réactivité sur la galaxie

Passer un `Ref<GalaxyData>` régénère les buffers automatiquement quand le seed ou les opts changent :

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { TresCanvas } from '@tresjs/core';
import { createGalaxyData } from 'galex-js/core/GalaxyData';
import { GalaxyScene } from 'galex-js/view-vue';

const seed = ref(42);
const galaxy = computed(() => createGalaxyData({ seed: seed.value, count: 15000, radius: 50 }));

function reroll() {
  seed.value = Math.floor(Math.random() * 0xffffffff);
}
</script>

<template>
  <TresCanvas window-size clear-color="#04060b">
    <TresPerspectiveCamera :position="[0, 70, 70]" make-default />
    <GalaxyScene :galaxy-data="galaxy" />
  </TresCanvas>
  <button @click="reroll">Régénérer</button>
</template>
```

## Composer avec ses propres concepts

`<GalaxyScene>` est neutre — pas de notion de joueur, faction, fog of war. Le client jeu compose ses primitives par-dessus :

```vue
<template>
  <TresCanvas window-size>
    <TresPerspectiveCamera make-default />
    <GalaxyScene :galaxy-data="galaxy" />

    <!-- Marqueur joueur (composé par le caller) -->
    <TresGroup :position="playerWorldPos">
      <TresMesh>
        <TresBoxGeometry :args="[2, 2, 2]" />
        <TresMeshBasicMaterial :color="team.color" :transparent="true" :opacity="0.3" />
      </TresMesh>
    </TresGroup>

    <!-- Flotte -->
    <FleetMarker v-for="ship in scouts" :key="ship.id" :ship="ship" />
  </TresCanvas>
</template>
```

## Contrôles réactifs — `useGalaxyView`

`<GalaxyScene>` est **purement déclaratif** : il monte les couches mais n'expose aucun contrôle dynamique (dimming, fog of war, clipping, vue plateau). Pour piloter la galaxie depuis Vue avec des `Ref`, utiliser `useGalaxyView` qui wrap l'API vanilla `createGalaxyScene` :

```vue
<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import * as THREE from 'three';
import { createGalaxyData } from 'galex-js/core/GalaxyData';
import { useGalaxyView } from 'galex-js/view-vue';

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });
const view = useGalaxyView(galaxy);

// Tout est réactif : muter la ref, le GPU se met à jour à la prochaine frame.
function dimEverything()  { view.dimming.value = 0.3; }
function fadeGasOnly()    { view.gasDim.value = 0.45; }
function hideHalo()       { view.haloVisible.value = false; }
function activateFogOfWar(playerCube: { i: number; k: number }) {
  view.visibilityField.value = { focals: [playerCube], range: 3 };
}
function activateCloseupClipping(point: THREE.Vector3, normal: THREE.Vector3) {
  view.clipping.value = { active: true, normal, point };
}
</script>

<template>
  <TresCanvas window-size clear-color="#04060b">
    <TresPerspectiveCamera :position="[0, 70, 70]" make-default />
    <!-- TresJS adopts the prebuilt THREE.Group as-is. -->
    <TresPrimitive :object="view.object3D" />
  </TresCanvas>
</template>
```

### API exposée

| Ref | Type | Effet |
|---|---|---|
| `dimming` | `Ref<number>` | Multiplicateur global (0..1) sur toutes les couches |
| `gasDim` | `Ref<number>` | Multiplicateur sur les couches gaz uniquement (armGlow, gasStreaks, nebulae, innerRing, centerDust) |
| `haloVisible` | `Ref<boolean>` | Toggle du halo doux derrière le disque |
| `orthoSize` | `Ref<number>` | Taille des sprites en mode caméra orthographique. `0` = revenir à la formule perspective |
| `visibilityField` | `Ref<VisibilityFieldConfig \| null>` | Champ de visibilité multi-focal. `null` clear (tout visible) |
| `clipping` | `Ref<ClippingState>` | Plan de clipping monde. `{ active: false }` désactive |
| `object3D` | `THREE.Group` | À monter via `<TresPrimitive>` |
| `scene` | `GalaxyScene` | Échappatoire vers l'API vanilla (lectures avancées) |
| `dispose()` | `() => void` | Libère les buffers GPU. **Appelé automatiquement à l'unmount** via `onScopeDispose`. |

### Quel composable choisir ?

| Besoin | API |
|---|---|
| Affichage simple, granularité par couche, pure template Vue | `useGalaxyLayers` + `<GalaxyScene>` |
| Affichage + contrôles dynamiques (fog of war, vue plateau, gros plan, dimming) | `useGalaxyView` |

Tu peux aussi mixer : `useGalaxyLayers` pour le rendu déclaratif **et** un `createGalaxyScene` séparé en background pour la sim — le déterminisme garantit que les deux paths produisent les mêmes buffers pour le même `(seed, opts)`.

## API bas niveau — composer avec `useGalaxyLayers`

Si `<GalaxyScene>` ne convient pas (besoin de monter chaque couche différemment, ou d'extraire seulement certaines), le composable expose les buffers + material defs directement :

```vue
<script setup lang="ts">
import { useGalaxyLayers } from 'galex-js/view-vue';

const layers = useGalaxyLayers(() => galaxyData);
</script>

<template>
  <TresPoints :frustum-culled="false">
    <TresBufferGeometry
      :position="[layers.field.positions, 3]"
      :a-color="[layers.field.colors, 3]"
      :a-size="[layers.field.sizes, 1]"
      :a-visibility="[layers.field.visibility, 1]"
    />
    <TresShaderMaterial v-bind="layers.field.materialDef" />
  </TresPoints>
  <!-- ... mount des autres layers à la carte ... -->
</template>
```

`layers` est un `ComputedRef<GalaxyLayers>` — Vue récompute uniquement quand `galaxyData` change.

## Imports possibles

```ts
// Le composant drop-in
import { GalaxyScene } from 'galex-js/view-vue';

// Le composable seul (utile si tu fais ton propre montage)
import { useGalaxyLayers } from 'galex-js/view-vue';

// Les types pour typer ton propre code
import type {
  GalaxyLayers, GalaxyLayersOptions,
  StarLayer, PointsLayer, HaloLayer, CenterDustLayer,
} from 'galex-js/view-vue';
```

## Granularité de mise à jour

Un changement de `galaxyData` recrée tous les buffers / la scène entière. C'est cohérent avec le contrat « la lib gère la structure statique du monde ». L'état dynamique (positions de flottes, ressources, ownership de cubes) vit **au-dessus** : le caller mute les buffers Three sur `view.scene` directement, ou compose ses propres `<TresPoints>` séparés.
