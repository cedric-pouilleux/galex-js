# `starNeighbors`

Helpers de proximité spatiale entre étoiles. Toutes les fonctions sont pures, sans dépendance Three / DOM, et exploitent la `CubeGrid` déjà construite par [`createGalaxyData`](./galaxy-data) — pas de scan O(N) sur la galaxie entière.

```ts
import {
  starDistance,
  starDistanceSq,
  nearestStars,
  starsWithinRadius,
} from 'galex-js/core/StarNeighbors';
```

## Pourquoi côté lib ?

L'index d'une étoile dans `data.positions` est une connaissance interne à la lib (les buffers sont plats XYZ). Demander aux consommateurs de dériver eux-mêmes la position puis de chercher les voisins :

1. duplique la logique d'indexation (offset `i * 3`),
2. force chacun à réinventer un parcours spatial,
3. fait perdre le bénéfice de la grille de cubes déjà indexée.

Ces utilitaires gardent la responsabilité de la structure des données au même endroit que la génération.

## Distance brute

Deux étoiles, même buffer de positions — calcul direct via `+ - * sqrt`. Pas de `detMath` nécessaire : ces opérations sont IEEE-correct depuis ES2017, donc déjà bit-stables cross-engine.

```ts
const d  = starDistance(galaxy.data.positions, a, b);    // euclidienne
const d2 = starDistanceSq(galaxy.data.positions, a, b);  // carrée — pour les comparaisons
```

> Préférer la version carrée quand on ne fait que comparer (ex. seuil de proximité). Économise un `sqrt` par appel.

## k plus proches voisins — `nearestStars`

```ts
type NearestStarsOptions = {
  k: number;
  maxDistance?: number;   // plafond de recherche (unités monde) — Infinity par défaut
  includeSelf?: boolean;  // inclure l'étoile source — false par défaut
};

type StarNeighbor = { index: number; distance: number };

const closest = nearestStars(galaxy, starIndex, { k: 5 });
// → [{ index, distance }, …] trié par distance croissante
```

**Algorithme.** Expansion par couches de cubes (Chebyshev rings) autour du cube de l'étoile source. À chaque ring, on met à jour les `k` meilleurs candidats. On s'arrête dès que le prochain ring est *prouvablement* plus loin que le k-ième candidat actuel :

> Après avoir traité tous les cubes à distance Chebyshev ≤ `r`, chaque cube non visité est à au moins `r * cubeSize` du point source. La source occupe au plus une largeur de cube sur chaque axe ; il reste donc `r * cubeSize` d'écart sur l'axe pointant vers le prochain shell, et la distance euclidienne ne peut qu'être supérieure.

En pratique, sur une galaxie type (15 000 étoiles, `cubeSize = 2`), une requête `k=10` visite généralement ≤ 3 rings (≈ 125 cubes inspectés, dont une majorité vides).

## Voisinage par rayon — `starsWithinRadius`

```ts
type StarsWithinRadiusOptions = { includeSelf?: boolean };

const inRange = starsWithinRadius(galaxy, starIndex, 8);
// → [{ index, distance }, …] toutes les étoiles à ≤ 8 unités, triées
```

Box-scan : on calcule l'AABB cube de la sphère, on visite uniquement les cubes qu'elle traverse, et on filtre les étoiles individuelles par distance carrée.

## Cas d'usage de jeu

| Mécanique | Fonction adaptée |
|---|---|
| Routes commerciales / hyperlanes | `nearestStars(s, { k: 3 })` sur chaque système → graphe k-NN |
| Portée d'une flotte / scan | `starsWithinRadius(s, range)` |
| Pathfinding stellaire | `nearestStars` pour construire un graphe sparse, puis A* dessus |
| Influence de faction | `starsWithinRadius` autour de chaque système possédé |
| Événement de proximité (supernova…) | `starsWithinRadius(epicenter, blastRadius)` |

## Conversion en années-lumière

Les distances retournées par ces fonctions sont en **unités monde** — le même repère que `data.positions`. Pour les afficher en années-lumière, voir [`Astronomy`](./astronomy) :

```ts
import { worldUnitsToLightYears } from 'galex-js/core/Astronomy';

const distLy = worldUnitsToLightYears(galaxy.opts.cubeSize, starDistance(galaxy.data.positions, a, b));
```

## Déterminisme

Aucune randomisation, aucune fonction transcendante : pour un même `(galaxy, starIndex, opts)`, le résultat est byte-identique cross-engine. Sans danger côté serveur pour valider une action client.

## Performance

- `starsWithinRadius` : O(neighbors) en pratique, indépendant de `count`.
- `nearestStars` : O(neighbors · log k) — `k` typiquement petit (< 50), donc proche du linéaire en nombre de candidats visités.

Si tu interroges la même étoile de manière répétée, mémoïse côté caller — la lib n'introduit pas de cache implicite (KISS, et évite des invalidations cachées si tu régénères la galaxie).
