# GalexJS

Génération procédurale **déterministe** d'un plateau galactique. Une lib, trois cibles :

- **Backend Node** — pure data, ni Three, ni DOM.
- **Vanilla Three.js** — factories impératives qui montent les couches dans un `THREE.Group`.
- **Vue 3 + TresJS** — composable réactif + composant drop-in `<GalaxyScene>`.

Pour le même `(seed, opts)`, la lib produit des `Float32Array` **byte-à-byte identiques** sur V8, SpiderMonkey et JavaScriptCore. Donc le serveur (Node) et le client (Chrome / Firefox / Safari) voient la même galaxie sans payload de structure sur le réseau — seules les actions joueur transitent.

## Pourquoi déterministe

Les jeux multi avec carte massive partagent traditionnellement la map en envoyant un dump des positions / cubes / contenus à la connexion. Avec GalexJS le serveur dérive la map depuis `(seed, opts)` ; le client la dérive aussi côté navigateur, à partir du même seed reçu en plaintext. Tous les bytes sont identiques cross-engine, donc :

- **Pas de protocole de sync** pour la structure du monde
- **Validation serveur** sans recharger d'état (le serveur reconstruit le cube cible à la volée)
- **Anti-triche** trivial : si le client envoie un `(cube, star)` qui n'existe pas sur le seed, le serveur le sait

La compatibilité cross-engine repose sur de la math transcendante bit-stable (`detSin`, `detCos`, `detPow`…) auditée par un linter statique + un test hash byte-à-byte exécuté en CI sur Chromium / Firefox / WebKit.

## Installation

```bash
npm install galex-js three
# Pour la cible Vue / TresJS :
npm install vue @tresjs/core
```

`three`, `vue` et `@tresjs/core` sont des **peer dependencies**. Vue et TresJS sont optionnelles (consommées uniquement par `view-vue/`).

## Usage par cible

### Backend Node — pure data

```ts
import { createGalaxyData } from 'galex-js/core/GalaxyData';

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });

// Valider une action joueur sans charger d'état persistant.
const cube = galaxy.grid.get(action.cube.i, 0, action.cube.k);
if (!cube) return { ok: false, reason: 'cube does not exist' };
if (!cube.starIndices.includes(action.starIndex)) {
  return { ok: false, reason: 'star not in this cube' };
}
return { ok: true };
```

### Vanilla Three — scène montée à la main

```ts
import * as THREE from 'three';
import { createGalaxyData } from 'galex-js/core/GalaxyData';
import { createGalaxyScene } from 'galex-js/view/GalaxyScene';

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });
const view = createGalaxyScene(galaxy, { gasDensity: 1.0 });
scene.add(view.object3D);

// Per-frame controls :
view.setDimming(0.5);                              // dim global (close-up)
view.setGasDim(0.45);                              // dim gaz seul (plan view)
view.setHaloVisible(false);                        // halo doux (fog of war)
view.setCoreVisible(false);                        // noyau galactique (fog of war)
view.setOrthoSize(zoom);                           // sprite size en mode ortho
view.setClipping(true, normal, point);             // plan de clipping monde
view.setVisibilityField({ focals: [cube], range: 3 });  // brouillard multi-focal
```

### Vue / TresJS — déclaratif

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

⚠️ Côté `vite.config.ts`, brancher la conf TresJS sinon `<TresCanvas>` est rendu comme un custom HTML element vide :

```ts
import { templateCompilerOptions } from '@tresjs/core';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue(templateCompilerOptions)],
});
```

## Le sandbox

`npm run dev` lance le playground complet. Il sert d'exemple de référence : tout est composé à partir des primitives lib, aucun concept de jeu n'est codé dedans.

| Geste / mode | Effet |
|---|---|
| Clic gauche **dans le vide** + drag | Rotation orbite |
| Clic droit + drag | Rotation orbite (alternative) |
| Clic gauche **sur un cube** + drag | Sélection rectangulaire multi-cubes (cf. [RectSelection](docs/primitives/rect-selection.md)) |
| Clic court sur un cube | Close-up sur le cube |
| Relâcher d'un rectangle | Close-up sur tous les cubes contenus dans le rectangle (champ d'étoiles fusionné) |
| Molette | Zoom |
| `Esc` | Sortir du close-up |
| `Espace` (en mode mesure) | Cadre sur le trajet courant — dim tout le reste (cf. [MeasureTool / Focus trajet](docs/primitives/measure-tool.md#focus-trajet-touche-espace)) |
| Toggle « Brouillard de guerre » | Active le visibility-field multi-focal + masque halo + noyau galactique |
| Toggle « Vue plateau 2D » | Bascule en caméra orthographique vue de dessus |
| Toggle « Mesurer une distance » | Active le [MeasureTool](docs/primitives/measure-tool.md) — cube↔cube en orbite, étoile↔étoile en close-up |
| Panneau « Génération » | Régénère la galaxie avec d'autres options (count, bras, étalement, gaz, …) |

La galaxie reste **toujours centrée** (`enablePan = false` sur les `OrbitControls`) — le pan est désactivé exprès pour éviter qu'elle dérive hors champ.

## Architecture

```
core/           # Pure data, déterministe, sans Three
  GalaxyData      # Pipeline principal seed → buffers + grid
  CubeGrid        # Indexation spatiale + raycast Amanatides & Woo
  Astronomy       # Conversion world units ↔ années-lumière
  Random          # mulberry32 + dérivation de subseeds par label
  DetMath         # Math transcendantes bit-stables (sin, cos, log, exp, pow)
  Visibility      # Helper de calcul de fog of war

view/           # Vanilla Three — couches visuelles
  GalaxyScene     # Compose tout (stars + halo + gaz + bulbe), expose les contrôles
  CubeMarker      # Marqueur cube pour le concept "joueur" / "flotte" du client
  GridHelper      # Wireframes (occupied lines, visibility tiers)
  closeup/        # Sous-buffer + shader haute fidélité pour la vue rapprochée
  effects/        # Halo, nébuleuses, arm glow, gas streaks, inner ring, center dust

view-vue/       # Vue + TresJS
  composables/    # useGalaxyView (réactif), useGalaxyLayers (déclaratif)
  components/     # <GalaxyScene> drop-in

playground/     # Sandbox de démo (consomme les briques ci-dessus)
  Main.ts, Cameras, Picker, RectSelection, MeasureTool, Fog, PlanView, Closeup…

tools/          # CLI utilitaires
  CheckDeterminism  # Lint statique : interdit Math.sin/cos/etc dans core/
  server-example    # Exemple de validation serveur Node

docs/           # VitePress
```

## Garanties

- **Déterminisme cross-engine** : audité par [`tools/CheckDeterminism.ts`](tools/CheckDeterminism.ts) (lint statique sur `core/`) + tests Node + Playwright sur Chromium / Firefox / WebKit.
- **TypeScript strict** : tout le repo passe `vue-tsc --noEmit`.
- **Domaine jeu hors lib** : aucun identifiant `player` / `team` / `fleet` / `fog of war` dans `core/`, `view/`, `view-vue/`. Les primitives sont neutres ; le client jeu compose ses concepts par-dessus (cf. [primitives/](docs/primitives/index.md)).
- **Vocabulaire de plateau** : `cube`, `grid`, `world`, `marker`, `highlight`, `selection`, `hover`, `visibility`, `focal`, `range`, `closeup`, `plan view`.

## Scripts

```bash
npm run dev               # Playground vanilla Three
npm run example:server    # Exemple backend Node (validation déterministe)
npm run build             # Build de production (Vite)
npm test                  # typecheck strict + lint déterminisme + 72 tests
npm run test:cross        # Hash determinism sur Chromium / Firefox / WebKit
npm run docs:dev          # Site VitePress en hot-reload
npm run docs:build        # Build statique des docs
```

## Documentation

- [Quick start](docs/quick-start.md) — premier usage côté Node, vanilla Three, Vue
- [Architecture](docs/architecture/index.md) — pipeline data → buffers → scène, 3 niveaux d'API
- [Compatibilité cross-engine](docs/compatibility/index.md) — pourquoi le déterminisme bit-stable tient
- [Primitives de plateau](docs/primitives/index.md) — `CubeMarker`, `VisibilityField`, `Closeup`, et les compositions sandbox ([RectSelection](docs/primitives/rect-selection.md), [MeasureTool](docs/primitives/measure-tool.md))
- [Référence API](docs/api/index.md) — entrée par symbole exporté
- [Intégration Vue / TresJS](docs/integrations/vue-tres.md) — patterns réactifs

## Licence

Privée — sandbox interne.
