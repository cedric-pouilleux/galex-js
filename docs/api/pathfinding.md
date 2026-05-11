# `findStarPath`

Pathfinding étoile à étoile, avec un **rayon de saut maximum** par étape — modélise un trajet où chaque hop est borné par la portée d'un moteur subluminique. Le chemin minimise la **distance totale parcourue**.

```ts
import { findStarPath } from 'galex-js/core/Pathfinding';
```

## Pourquoi côté lib ?

Comme [`starNeighbors`](./star-neighbors), la fonction vit dans `core/` parce qu'elle dépend des buffers internes (`data.positions`) et de la `CubeGrid` indexée par `createGalaxyData`. Côté gameplay, on consomme uniquement la liste d'étoiles à parcourir et la distance totale — le reste (rendu, animation, interpolation) est laissé au caller.

## Signature

```ts
type StarPathOptions = {
  /** Portée max d'un saut, en unités monde. */
  maxJumpDistance: number;
  /** Cut-off optionnel sur la distance totale (unités monde). */
  maxTotalDistance?: number;
  /** Filtre par étoile : `false` retire l'étoile du graphe (escales et endpoints). */
  isStarAllowed?: (starIndex: number) => boolean;
};

type StarPath = {
  /** Indices globaux dans l'ordre A → … → B (A et B inclus). Length ≥ 2. */
  stars: number[];
  /** Somme des distances de saut, unités monde. */
  totalDistance: number;
  /** Plus long saut du chemin, unités monde. */
  longestJump: number;
};

function findStarPath(
  galaxy: GalaxyData,
  fromStar: number,
  toStar: number,
  opts: StarPathOptions,
): StarPath | null;
```

## Exemple — calcul d'un trajet

```ts
import { findStarPath } from 'galex-js/core/Pathfinding';
import { lightYearsPerUnit, worldUnitsToLightYears } from 'galex-js/core/Astronomy';

const rangeLy = 5; // portée du moteur du joueur, en années-lumière
const maxJumpWorld = rangeLy / lightYearsPerUnit(galaxy.opts.cubeSize);

const path = findStarPath(galaxy, fromIdx, toIdx, { maxJumpDistance: maxJumpWorld });
if (!path) {
  console.log('Hors de portée');
} else {
  const totalLy = worldUnitsToLightYears(galaxy.opts.cubeSize, path.totalDistance);
  console.log(`Trajet : ${path.stars.length - 1} sauts, ${Math.round(totalLy)} al`);
}
```

## Algorithme

**Dijkstra** sur le graphe implicite dont les arêtes sont les paires d'étoiles à ≤ `maxJumpDistance` l'une de l'autre. Les voisins sont récupérés **à la demande** via [`starsWithinRadius`](./star-neighbors#voisinage-par-rayon-starswithinradius), donc :

- **aucun graphe précalculé** — la `CubeGrid` est la seule structure spatiale,
- **portée variable gratuite** — un changement de `maxJumpDistance` relance simplement la recherche, sans cache à invalider,
- **coût borné par les étoiles visitées**, pas par la taille de la galaxie — sur une portée serrée, Dijkstra ne diffuse que localement avant d'atteindre la cible.

Le min-heap binaire utilise la variante avec **doublons** (on ré-empile au lieu de maintenir un decrease-key) : `settled[]` filtre les entrées périmées à la sortie de la queue. Plus simple, suffisant à notre échelle (typiquement quelques centaines d'étoiles visitées pour 15 k étoiles).

## Cas limites

| Cas | Retour |
|---|---|
| `fromStar === toStar` | `{ stars: [fromStar], totalDistance: 0, longestJump: 0 }` |
| `maxJumpDistance ≤ 0` | `null` |
| Index `fromStar` / `toStar` hors plage | `null` |
| Aucun chemin (cible isolée pour la portée donnée) | `null` |
| `totalDistance > maxTotalDistance` | `null` |

## Filtre `isStarAllowed`

Permet d'exclure des étoiles du graphe sans rebuild la `GalaxyData`. Le prédicat est appelé à chaque visite de voisin, donc il doit rester **rapide** (lookup `Map` ou test arithmétique). Cas d'usage typique : fog of war — les étoiles dans les cubes non révélés ne participent pas aux mesures du joueur.

```ts
const path = findStarPath(galaxy, from, to, {
  maxJumpDistance: rangeWorld,
  isStarAllowed: (idx) => playerSeenStars.has(idx),
});
```

Comportement :
- Endpoints filtrés (`fromStar` ou `toStar`) → retour immédiat `null`.
- Voisins filtrés → ignorés dans la relaxation Dijkstra (jamais ré-empilés).

## Coût et `maxTotalDistance`

Sur une galaxie dense, Dijkstra peut explorer une grande zone si la cible est loin. `maxTotalDistance` permet de **couper l'expansion** dès qu'une distance partielle dépasse la valeur passée — utile pour borner le temps de calcul sur un check "atteignable ?" plutôt que pour calculer le trajet exact.

```ts
// Vérifie l'accessibilité sans payer pour les voyages absurdement longs.
const reachable = findStarPath(galaxy, from, to, {
  maxJumpDistance: rangeWorld,
  maxTotalDistance: rangeWorld * 30, // 30 sauts max
}) !== null;
```

## Déterminisme

L'algorithme est entièrement déterministe sur les mêmes `(galaxy, from, to, opts)`. Les égalités de distance sont départagées par l'ordre d'insertion dans le heap — qui dépend uniquement de l'itération `starsWithinRadius` (stable, basée sur le parcours cube par cube).

## Composition

Combinaisons typiques avec d'autres briques de la lib :

- [`worldUnitsToLightYears`](./astronomy) — conversion de `totalDistance` / `longestJump` en années-lumière pour l'UI,
- [`starsWithinRadius`](./star-neighbors) — utilisé en interne, mais aussi consommable directement pour afficher les étoiles à portée d'un seul saut,
- [`createDashedPath`](../primitives/paths) — un segment dashed par hop, composé dans [`createMeasurePath`](../primitives/measure-tool) (chaque hop = un `DashedPath` deux-points).
