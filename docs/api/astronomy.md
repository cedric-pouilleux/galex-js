# Astronomy — conversion en années-lumière

Helpers de mise à l'échelle qui traduisent les distances en unités monde vers une unité physique cohérente pour le gameplay.

```ts
import {
  LIGHT_YEARS_PER_CUBE,
  lightYearsPerUnit,
  worldUnitsToLightYears,
} from 'stellex-galaxy-sandbox/core/Astronomy';
```

## Convention

Un **cube de la grille représente toujours 50 années-lumière de côté**, quel que soit le `cubeSize` en unités monde choisi à la génération. Le diamètre de la galaxie en al en découle :

```
diamètre_al = (2 · radius / cubeSize) · 50
```

Pour les défauts (`radius = 50`, `cubeSize = 2`) : 25 cubes de rayon × 50 al = ~2 500 al de diamètre. C'est l'échelle d'un amas stellaire local — choisie pour que les trajets gameplay restent jouables sans déformer la physique stellaire (≈ 10 × la distance Terre / Proxima Centauri par cube).

## API

| Symbole | Description |
|---|---|
| `LIGHT_YEARS_PER_CUBE` | Constante `50` — la convention d'échelle. |
| `lightYearsPerUnit(cubeSize)` | Facteur multiplicatif `unité monde → al` pour un cube donné. |
| `worldUnitsToLightYears(cubeSize, distance)` | Convertit une distance (produit scalaire `distance * lightYearsPerUnit(cubeSize)`). |

## Exemple

```ts
import { starDistance } from 'stellex-galaxy-sandbox/core/StarNeighbors';
import { worldUnitsToLightYears } from 'stellex-galaxy-sandbox/core/Astronomy';

const dist = starDistance(galaxy.data.positions, a, b);
const distLy = worldUnitsToLightYears(galaxy.opts.cubeSize, dist);
console.log(`${Math.round(distLy)} al`);
```

## Déterminisme

Pure arithmétique IEEE (multiplication, division) — bit-stable cross-engine, safe à utiliser pour valider une distance gameplay côté serveur.

## Pourquoi ancrer sur le cube et non sur la galaxie ?

Le board est cube-centric : la maille définit le pas tactique du jeu (un système ≈ un cube). En gardant la taille d'un cube fixe en années-lumière, on stabilise les distances gameplay même quand le concepteur modifie le rayon procédural. Une galaxie plus grande contient plus de cubes — donc plus de territoire et de systèmes — mais le voisinage local reste calibré à 50 al, l'équivalent d'une grappe d'étoiles voisines.

L'alternative "diamètre fixe (Voie lactée à 100 000 al)" rétrécit chaque cube quand on augmente le nombre de subdivisions, ce qui rend l'unité tactique floue. L'ancrage à la maille évite cet effet.
