# `createGalaxyData(opts)`

Entrée principale côté données. Construit le squelette déterministe d'une galaxie : seed effective, options résolues, paramètres spiraux par bras, buffers d'étoiles (`Float32Array`) et grille de cubes indexée. Aucune dépendance Three / DOM — utilisable côté serveur.

```ts
import { createGalaxyData } from 'stellex-galaxy-sandbox/core/GalaxyData';
import type { GalaxyData, GalaxyDataOptions } from 'stellex-galaxy-sandbox/core/GalaxyData';

const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });
```

## Options

```ts
type GalaxyDataOptions = {
  count?: number;          // 15000 — nombre d'étoiles cible
  radius?: number;         // 50    — rayon du disque externe
  innerRadius?: number;    // 4.5   — rayon du cœur vide (clampé au minimum géométrique)
  thickness?: number;      // ⇐ cubeSize — épaisseur verticale (jitter Y)
  cubeSize?: number;       // 2     — taille d'un cube de la grille
  minDistance?: number;    // 0.25  — espacement minimum (Poisson-disk)
  arms?: number;           // 6     — nombre de bras spiraux
  spin?: number;           // 0.9   — facteur d'enroulement spiral
  spread?: number;         // 0.95  — étalement off-arm
  fieldRatio?: number;     // 0.30  — fraction d'étoiles hors bras (population âgée)
  fillCenter?: boolean;    // false — autoriser des étoiles dans innerRadius
  seed?: number | null;    // null  — null/undef = pioche un seed frais
};
```

## Sortie

```ts
type GalaxyData = {
  readonly seed: number;
  readonly opts: ResolvedGalaxyOptions;
  readonly armSpinJ: number[];      // multiplicateur de spin par bras
  readonly armPhaseJ: number[];     // décalage de phase par bras
  readonly data: GalaxyBuffers;     // Float32Arrays positions/colors/sizes/temps + count
  readonly grid: CubeGrid;          // indexation spatiale + raycast
};
```

## `data: GalaxyBuffers`

| Champ | Type | Description |
|---|---|---|
| `positions` | `Float32Array` | XYZ flat, longueur `3 * count` |
| `colors` | `Float32Array` | RGB flat (luminance déjà appliquée) |
| `sizes` | `Float32Array` | taille de sprite par étoile |
| `temps` | `Float32Array` | température en Kelvin |
| `count` | `number` | nombre d'étoiles effectivement placées |

## `grid: CubeGrid`

API spatiale pour identifier le cube d'un point ou raycaster :

```ts
const cube = galaxy.grid.get(i, 0, k);                  // Cube | undefined
const center = galaxy.grid.cubeToWorldCenter(i, j, k);  // { x, y, z }
const hit = galaxy.grid.pickCube(rayOrigin, rayDir);    // Amanatides & Woo voxel walk
const occupied = galaxy.grid.occupiedCount();
```

Voir [`CubeGrid.ts`](../../core/CubeGrid.ts) pour la liste complète.

## Garantie de déterminisme

Pour un même `(seed, opts)`, `createGalaxyData` produit des `Float32Array` **byte-identiques** sur tout moteur ES2017+. C'est la fondation du modèle client/serveur :

- Le serveur stocke uniquement `(seed, opts)` pour la structure statique.
- Le client régénère localement → pas de payload de structure réseau.
- Le serveur valide les actions du joueur en redérivant la même structure.

Cf. [Compatibilité cross-engine](../compatibility/) pour les détails.

## Pattern serveur typique

```ts
import { createGalaxyData } from 'stellex-galaxy-sandbox/core/GalaxyData';
import type { GalaxyData } from 'stellex-galaxy-sandbox/core/GalaxyData';

// One immutable instance per (seed, opts) tuple — safe to keep in RAM.
const galaxyCache = new Map<number, GalaxyData>();

function getGalaxy(seed: number, opts: GalaxyDataOptions): GalaxyData {
  let g = galaxyCache.get(seed);
  if (!g) {
    g = createGalaxyData({ ...opts, seed });
    galaxyCache.set(seed, g);
  }
  return g;
}

function validateAction(world, action) {
  const galaxy = getGalaxy(world.seed, world.galaxyOpts);
  const cube = galaxy.grid.get(action.cube.i, 0, action.cube.k);
  if (!cube) return { ok: false, reason: 'cube does not exist' };
  if (!cube.starIndices.includes(action.starIndex)) {
    return { ok: false, reason: 'star not in this cube' };
  }
  return { ok: true };
}
```
