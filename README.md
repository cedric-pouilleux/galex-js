# Stellex Galaxy

Génération procédurale **déterministe** d'un plateau galactique. Une seule lib, trois cibles consommables :

- **Backend Node** — pure data, pas de Three, pas de DOM.
- **Vanilla Three.js** — factories impératives qui montent les couches dans un `THREE.Group`.
- **Vue 3 + TresJS** — composable réactif + composant drop-in `<GalaxyScene>`.

Pour le même `(seed, opts)`, la lib produit des `Float32Array` **byte-à-byte identiques** sur V8, SpiderMonkey et JavaScriptCore — donc le serveur (Node) et le client (Chrome/Firefox/Safari) voient la même galaxie sans payload de structure sur le réseau.

## Cibles

| Cible | Entry | Exemple |
|---|---|---|
| Backend Node | `stellex-galaxy-sandbox/core/GalaxyData` | `tools/server-example/Index.ts` |
| Vanilla Three | `stellex-galaxy-sandbox/view/GalaxyScene` | `playground/Main.ts` |
| Vue / TresJS | `stellex-galaxy-sandbox/view-vue` | [Quick start](docs/quick-start.md) (code-group Vue) |

## Installation

```bash
npm install stellex-galaxy-sandbox three
# Pour la cible Vue / TresJS :
npm install vue @tresjs/core
```

`three`, `vue` et `@tresjs/core` sont des **peer dependencies**. Vue et TresJS sont optionnelles (utilisées uniquement par `view-vue/`).

## Usage rapide

### Backend Node

```ts
import { createGalaxyData } from 'stellex-galaxy-sandbox/core/GalaxyData';

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });

// Validate a client action against the seed-derived structure.
const cube = galaxy.grid.get(action.cube.i, 0, action.cube.k);
if (!cube) return { ok: false, reason: 'cube does not exist' };
if (!cube.starIndices.includes(action.starIndex)) {
  return { ok: false, reason: 'star not in this cube' };
}
return { ok: true };
```

### Vanilla Three

```ts
import * as THREE from 'three';
import { createGalaxyData } from 'stellex-galaxy-sandbox/core/GalaxyData';
import { createGalaxyScene } from 'stellex-galaxy-sandbox/view/GalaxyScene';

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });
const view = createGalaxyScene(galaxy, { gasDensity: 1.0 });
scene.add(view.object3D);

// Per-frame controls available:
view.setDimming(0.5);            // global dim
view.setGasDim(0.45);            // gas-only dim (top-down view trick)
view.setOrthoSize(zoom);         // sprite size for ortho camera
view.setClipping(true, normal, point);
view.setVisibilityField({ focals: [{ i, k }], range: 3 });
```

### Vue / TresJS

```vue
<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import { createGalaxyData } from 'stellex-galaxy-sandbox/core/GalaxyData';
import { GalaxyScene } from 'stellex-galaxy-sandbox/view-vue';

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });
</script>

<template>
  <TresCanvas window-size clear-color="#04060b">
    <TresPerspectiveCamera :position="[0, 70, 70]" :look-at="[0, 0, 0]" make-default />
    <GalaxyScene :galaxy-data="galaxy" :gas-density="1.0" />
  </TresCanvas>
</template>
```

⚠️ Côté `vite.config.ts`, **utiliser la conf TresJS** sinon `<TresCanvas>` est rendu comme un custom HTML element vide :

```ts
import { templateCompilerOptions } from '@tresjs/core';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue(templateCompilerOptions)],
});
```

Voir [docs/integrations/vue-tres.md](docs/integrations/vue-tres.md) pour le détail.

## Garanties

- **Déterminisme cross-engine** : audité par `tools/CheckDeterminism.ts` (lint statique) + tests Node + Playwright sur Chromium / Firefox / WebKit.
- **TypeScript strict** : tout le repo passe `vue-tsc --noEmit`.
- **Domaine jeu hors lib** : aucun identifiant `player` / `team` / `fleet` / `fog of war` dans `core/`, `view/`, `view-vue/`. Les primitives sont neutres ; le client jeu compose ses concepts par-dessus.

## Scripts

```bash
npm run dev               # Vanilla Three playground
npm run example:server    # Backend Node example
npm run build             # Build statique
npm test                  # Typecheck strict + lint déterminisme + 56 tests
npm run test:cross        # Hash determinism sur Chromium / Firefox / WebKit
npm run docs:dev          # VitePress doc site
```

## Documentation

- [Quick start](docs/quick-start.md)
- [Architecture](docs/architecture/index.md)
- [Compatibilité cross-engine](docs/compatibility/index.md)
- [Primitives de plateau](docs/primitives/index.md)
- [Intégration Vue / TresJS](docs/integrations/vue-tres.md)

## Licence

Privée — sandbox interne.
