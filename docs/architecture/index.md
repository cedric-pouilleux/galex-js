# Architecture

## Vue d'ensemble

La codebase est organisée en quatre zones de niveau égal à la racine du dépôt, **100 % TypeScript strict** :

```
core/                           # Données pures, déterministes, runtime-agnostic
├── GalaxyData.ts               # createGalaxyData (entrée publique côté données)
├── DetMath.ts, Visibility.ts
├── Random.ts, StarColor.ts, StarGenerator.ts, CubeGrid.ts
├── StarNames.ts                # nameStarInCube — identifiant canonique persistable
└── *.test.ts

view/                           # Three.js impératif
├── GalaxyScene.ts              # createGalaxyScene (entrée publique côté rendu)
├── CubeMarker.ts, GridHelper.ts
├── closeup/                    # Primitives neutres pour vue rapprochée
│   ├── Buffers.ts              # prepareCloseupField (sous-buffer + shader)
│   ├── HoverRing.ts            # createHoverRing (compose SelectionRing)
│   ├── SelectionRing.ts        # createSelectionRing (anneau shader partagé)
│   └── StarShader.ts           # GLSL haute fidélité
├── paths/                      # Primitives "chemin entre deux points"
│   └── DashedPath.ts           # createDashedPath (statique ou animé via options)
└── effects/                    # Factories par couche : buffers + materialDef + mount
    ├── Nebulae.ts, Halo.ts, CenterDust.ts, InnerRing.ts, GasStreaks.ts, ArmGlow.ts
    ├── ArmCadence.ts, Shaders.ts
    └── Effects.test.ts

view-vue/                       # Bindings Vue / TresJS
├── composables/UseGalaxyLayers.ts   # Composable réactif → buffers + materialDefs
├── components/GalaxyScene.vue       # Composant drop-in qui monte tout en TresJS
└── index.ts                          # Barrel public

playground/                     # Caller de référence vanilla Three (sandbox)
├── Main.ts                     # Entry, animation loop, glue
├── World.ts, Player.ts, Hover.ts
├── HUD.ts                      # DOM-spécifique au sandbox
├── Cameras.ts, Labels.ts, Picker.ts, GenPanel.ts
├── Closeup.ts, CloseupTween.ts # Orchestrateur close-up + tween caméra
└── Fog.ts, PlanView.ts
```

Pas de `src/` artificiel. `core/`, `view/`, `view-vue/` sont des dossiers frères avec des règles propres ; `playground/`, `tools/` et `docs/` les complètent. Les exemples Vue / TresJS vivent désormais dans la doc en code-groups (cf. [Quick start](../quick-start)).

## Trois cibles consommables

La lib expose trois entry points indépendants — un consommateur prend ce dont il a besoin sans payer le reste.

| Cible | Entry | Deps requises |
|---|---|---|
| **Backend Node** | `galex-js/core/*` | aucune (pas de Three, pas de DOM) |
| **Vanilla Three** | `galex-js/view/*`, `galex-js/view/effects/*` | `three` (peer) |
| **Vue / TresJS** | `galex-js/view-vue` | `three`, `vue`, `@tresjs/core` (peers, deux derniers optionnels) |

Validés respectivement par : `npm run example:server` (Node), `npm run dev` (vanilla browser), et `npm test` qui couvre la chaîne Vue de bout en bout via les tests `view-vue/composables/*.test.ts`.

## Choix de conception

### Pas de classe — factories + closures

JavaScript n'est pas un langage à classes. Toutes les anciennes classes (`GalaxyData`, `CubeGrid`, `GalaxyScene`, `Closeup`, `HUD`, `Picker`, `Fog`, `PlanView`, etc.) sont des fonctions `createX(opts)` qui retournent un objet d'API publique. L'état privé vit dans la closure ; pas de `this`, pas de `new`, pas de chaîne de prototypes à maintenir.

```ts
// core/CubeGrid.ts
export type CubeGrid = { /* shape publique */ };

export function createCubeGrid(opts: CubeGridOptions = {}): CubeGrid {
  const cubes = new Map<string, Cube>();   // état privé fermé dans la closure
  // ... fonctions internes ...
  return { cubeSize, origin, cubes, /* ... */ };
}
```

### Deux niveaux d'API par couche visuelle

Chaque couche de `view/effects/` expose deux niveaux pour pouvoir être consommée par Three impératif **ou** TresJS :

```ts
// 1. Pure data — runtime-agnostic, consommable depuis n'importe où
const buffers = buildNebulaeBuffers(opts);

// 2. Material def — constructor params (uniforms + shaders), pas d'instance Three
const materialDef = createNebulaeMaterialDef();
```

Le mount Three impératif (`THREE.Points`, `THREE.Mesh`) est centralisé dans `createGalaxyScene` — il consomme déjà 1 + 2 via le composer. Un client qui voudrait monter manuellement une sous-couche reste libre de combiner les deux niveaux ci-dessus :

```ts
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(buffers.positions, 3));
// … autres attributes …
const points = new THREE.Points(geo, new THREE.ShaderMaterial(materialDef));
```

Le client Vue/TresJS consomme **1 + 2** dans son template :
```vue
<TresPoints>
  <TresBufferGeometry :position="[buffers.positions, 3]" :a-color="[buffers.colors, 3]" />
  <TresShaderMaterial v-bind="materialDef" />
</TresPoints>
```

### TypeScript strict

`tsconfig.json` racine, `strict: true`, scope `core/ + view/ + view-vue/ + playground/ + tools/`. Imports inter-fichiers en `.js` (résolution Bundler — Vite, tsx, tsc et vue-tsc savent remonter au `.ts` correspondant).

## Règles par zone

### `core/` — déterministe, sans Three

- ❌ Aucun `import 'three'`
- ❌ Aucun appel à `Math.{sin,cos,tan,asin,acos,atan,atan2,exp,expm1,log,log2,log10,log1p,pow,hypot,cbrt}`
- ❌ Aucun import depuis `view/` ou `playground/` (la zone de plus bas niveau ne remonte pas)
- ✅ `+ - * / sqrt floor round fround imul`, bitops, constantes spec (`Math.PI`, `Math.LN2`, `Math.SQRT2`, …)
- ✅ Math transcendantes : passer par [det-math](../compatibility/deterministic-math)

Auditable via `npm run test:determinism` — auto-discovery sur `core/*.ts` (hors fichiers `*.test.ts`).

### Rendu (Three.js)

- ✅ Math natif autorisé — la dérive d'1 ulp est invisible à l'écran
- ✅ Imports Three libres
- Convention : exposer des primitives **neutres** (cube, marker, visibility, closeup) — pas de fuite domaine jeu (cf. [Primitives](../primitives/))
- Chaque factory `effects/*.ts` expose `buildXBuffers` + `createXMaterialDef` + `createX` (contrat 3 niveaux).

### `view-vue/` — bindings Vue / TresJS

- ✅ Imports `vue` et `@tresjs/core` autorisés (peer deps optionnels)
- ❌ Aucune logique métier — wraps les helpers `view/` dans des composables réactifs et un composant drop-in
- Reactive sur l'input : passer `Ref<GalaxyData>` régénère les buffers automatiquement.

### `playground/` — caller de référence vanilla

C'est le sandbox visuel Three classique. Composé de modules thématiques :

| Fichier | Rôle |
|---|---|
| `Main.ts` | Entry, animation loop, glue |
| `Cameras.ts` | Factory perspective + ortho + leur `OrbitControls` |
| `Labels.ts` | CSS2D helpers pour les labels de cube |
| `Picker.ts` | Raycaster + état pointeur + détection click |
| `GenPanel.ts` | Panneau de sliders pour régénérer en live |
| `Fog.ts` | Visibility field state machine (côté gameplay du sandbox) |
| `PlanView.ts` | Toggle vue plateau 2D (camera ortho + boost grille/gaz) |
| `Closeup.ts` + `CloseupTween.ts` | Orchestrateur vue rapprochée (compose les primitives lib `prepareCloseupField` + `createHoverRing` avec OrbitControls + tween easeOutCubic) |
| `HUD.ts` | Liaisons DOM du HUD |

Le playground importe **librement** la lib (core/ + rendu) et incarne le concept **joueur** (nom, couleur, marker) en composant les primitives neutres. C'est un caller jetable, indépendant de la lib — on peut le remplacer ou s'en passer sans toucher à `core/`, `view/` ou `view-vue/`.

## Frontières des dépendances

```
playground/  ──→  view/  ──→  core/
view-vue/    ──→  view/  ──→  core/
                   ↓             ↑
                   └─────────────┘
                  (view peut lire core)
```

Trois interdits enforcés par `tools/CheckDeterminism.ts` :
1. `core/` n'utilise aucune Math transcendante (sin/cos/exp/log/pow/...).
2. `core/` n'importe pas `'three'`.
3. `core/` n'importe ni `view/` ni `playground/`.

## Pipeline

| Commande | Effet |
|---|---|
| `npm run dev` | Vite sur `index.html` → playground vanilla en navigateur |
| `npm run build` | Build statique sous `dist/` |
| `npm run example:server` | Démo backend (Node + tsx, `tools/server-example/`) |
| `npm test` | `vue-tsc --noEmit` (strict) + lint déterministe + 56 tests unitaires (tsx) |
| `npm run typecheck` | `vue-tsc --noEmit` seul |
| `npm run test:cross` | Hash determinism sur Chromium / Firefox / WebKit |
| `npm run docs:dev` | VitePress dev server sur `docs/` |
