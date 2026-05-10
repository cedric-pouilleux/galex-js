# Quick start

La lib expose **trois cibles consommables**. Choisis ton onglet et copie-colle :

## Backend Node — pure data

Pas de Three, pas de DOM. Le serveur charge `core/` et déduit la structure d'une galaxie depuis un seed.

```ts
import { createGalaxyData } from 'galex-js/core/GalaxyData';

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });

// Cross-engine déterministe : V8, SpiderMonkey, JavaScriptCore produisent
// les mêmes Float32Array byte-à-byte pour le même (seed, opts).
console.log(galaxy.data.count, galaxy.grid.size());

// Validation d'une action client contre la structure dérivée du seed.
function validate(action: { cube: { i: number; k: number }; starIndex: number }) {
  const cube = galaxy.grid.get(action.cube.i, 0, action.cube.k);
  if (!cube) return { ok: false, reason: 'cube does not exist' };
  if (!cube.starIndices.includes(action.starIndex)) {
    return { ok: false, reason: 'star not in this cube' };
  }
  return { ok: true };
}
```

## Rendu navigateur — Vanilla Three vs Vue / TresJS

Même galaxie, deux façons de la monter dans un canvas. Les deux produisent un visuel **identique** pour un même `(seed, opts)`.

::: code-group

```ts [Vanilla Three]
import * as THREE from 'three';
import { createGalaxyData } from 'galex-js/core/GalaxyData';
import { createGalaxyScene } from 'galex-js/view/GalaxyScene';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 70, 70);
camera.lookAt(0, 0, 0);

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });
const view = createGalaxyScene(galaxy, { gasDensity: 1.0 });
scene.add(view.object3D);

function animate() {
  view.object3D.rotation.y += 0.0015;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
```

```vue [Vue / TresJS]
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { TresCanvas } from '@tresjs/core';
import { createGalaxyData } from 'galex-js/core/GalaxyData';
import { GalaxyScene } from 'galex-js/view-vue';

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });

// Idle rotation Y pour faire respirer le disque sans OrbitControls.
const rotY = ref(0);
let raf = 0;
function tick() {
  rotY.value += 0.0015;
  raf = requestAnimationFrame(tick);
}
onMounted(() => { raf = requestAnimationFrame(tick); });
onUnmounted(() => cancelAnimationFrame(raf));
</script>

<template>
  <TresCanvas window-size clear-color="#04060b">
    <TresPerspectiveCamera :position="[0, 70, 70]" :look-at="[0, 0, 0]" make-default />
    <TresGroup :rotation="[0, rotY, 0]">
      <GalaxyScene :galaxy-data="galaxy" :gas-density="1.0" />
    </TresGroup>
  </TresCanvas>
</template>
```

:::

::: tip Setup côté Vue
Le plugin Vue de Vite doit être configuré avec `templateCompilerOptions` de `@tresjs/core` — sinon `<TresCanvas>` est traité comme un custom HTML element vide. Cf. [Intégration Vue / TresJS](./integrations/vue-tres) pour le détail.
:::

## Installation

```bash
npm install galex-js three
# Pour la cible Vue / TresJS uniquement :
npm install vue @tresjs/core
```

`three`, `vue` et `@tresjs/core` sont des **peer dependencies**. Vue et TresJS sont **optionnelles** — tu ne paies que si tu utilises `view-vue/`.

## Et ensuite ?

- [Architecture](./architecture/) — frontières `core/` ↔ `view/` ↔ `view-vue/`, règles par zone.
- [Primitives de plateau](./primitives/) — marqueurs, visibilité, gros plan : le vocabulaire neutre que ton jeu compose.
- [Référence API](./api/) — entrées publiques par cible.
- [Compatibilité cross-engine](./compatibility/) — pourquoi le déterminisme tient et comment c'est audité.
- [Intégration Vue / TresJS](./integrations/vue-tres) — détails spécifiques (peer deps, useGalaxyView, contrôles réactifs).
