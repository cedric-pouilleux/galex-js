# Côté serveur

`core/` est conçu pour s'importer dans Node **sans WebGL ni DOM**. Le serveur consomme la même chaîne de génération que le client, et puisqu'elle est [bit-stable cross-engine](./), les deux côtés voient la même galaxie pour le même seed.

::: tip Démo exécutable
Un exemple Node minimal vit dans `tools/server-example/index.ts` et s'exécute via `npm run example:server`. Il monte un cache de `GalaxyData` et valide trois actions client (cube valide, étoile bogue, cube hors disque).
:::

## Surface publique

```ts
import { createGalaxyData } from 'galex-js/core/GalaxyData';
import type { GalaxyData } from 'galex-js/core/GalaxyData';
```

`createGalaxyData` est l'unique entrée serveur. Le `GalaxyData` retourné expose :

| Champ | Type | Description |
|---|---|---|
| `seed` | `number` | Seed effective (pickée si `opts.seed` était `null`) |
| `opts` | `ResolvedGalaxyOptions` | Options résolues (defaults appliqués + `innerRadius` clampé) |
| `data` | `{ positions, colors, sizes, temps, count }` | `Float32Array` produits par la génération |
| `grid` | `CubeGrid` | Indexation spatiale, raycast, `cubeToWorldCenter`, `pickCube` |
| `armSpinJ`, `armPhaseJ` | `number[]` | Paramètres spiraux par bras |

## Validation d'une opération client

Pattern type : le client envoie une action référençant un cube + une étoile. Le serveur reconstruit la galaxie à la volée (ou la cache en RAM, immutable) et valide :

```ts
import { createGalaxyData } from 'galex-js/core/GalaxyData';
import type { GalaxyData, GalaxyDataOptions } from 'galex-js/core/GalaxyData';

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
  // ... gameplay state checks (ownership, range, resources, etc.)
  return { ok: true };
}
```

Le cache est sûr car `GalaxyData` est immutable. Pour un MMO, garder un singleton par monde en RAM tient sans effort jusqu'à plusieurs centaines de milliers d'étoiles.

## Pas de payload de structure

Le client n'a **rien** à recevoir sur la structure statique — il régénère depuis le seed :

```ts
// Côté client (browser ou Node)
const galaxy = createGalaxyData({ seed: world.seed, ...world.galaxyOpts });
// galaxy.data.positions est byte-identique côté serveur, sur tout moteur JS
```

Le payload réseau initial pour un monde se réduit à `{ seed, galaxyOpts }` — quelques dizaines d'octets. Les diffs ultérieurs ne portent que **l'état dynamique** (ownership, flottes, ressources) keyés par cube ou starIndex.

## Cycle de vie

`GalaxyData` n'a pas de `dispose()` — c'est juste des `Float32Array` que le GC ramasse quand l'objet n'est plus référencé. Aucune ressource native à libérer.

Côté client, un `GalaxyScene` consomme un `GalaxyData` ; quand on régénère, on jette les deux et on reconstruit (`galaxyScene.dispose()` libère les buffers GPU).

## Test de portabilité

`npm test` lance `core/galaxy-determinism.test.ts` qui instancie `GalaxyData` dans Node et vérifie :

- Deux instances avec le même seed produisent des buffers byte-à-byte identiques.
- Le hash FNV-1a des buffers correspond à la référence figée.

`npm run test:cross` rejoue le même calcul dans Chromium/Firefox/WebKit et compare. Toute divergence rouge entre serveur (Node) et client (navigateur) ferait échouer cette suite.
