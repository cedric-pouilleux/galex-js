# Primitives de plateau

La lib offre un vocabulaire **neutre** de plateau de jeu, sans concept de joueur, équipe, faction ou flotte. Le client jeu compose ces primitives pour incarner ses propres concepts.

## Règle de nommage

Tout identifiant exporté qui contiendrait *player*, *enemy*, *team*, *fog of war*, *war*, *fleet*, *empire*, *combat* est un signal de fuite domaine. Le vocabulaire autorisé décrit la **structure du plateau** :

- *cube*, *grid*, *world*
- *marker*, *highlight*, *selection*, *hover*
- *visibility*, *focal*, *range*
- *closeup*, *plan view*

## Primitives disponibles

| Primitive | Rôle | Page |
|---|---|---|
| `createCubeMarker` | Marqueur visuel autour d'un cube (filled body + thick wire + halo plan view) | [→](./cube-marker) |
| `GalaxyScene.setVisibilityField` | Pilote l'opacité par-particule autour d'un ou plusieurs cubes focaux | [→](./visibility-field) |
| `createVisibilityFieldLines` | Wireframe à 2 niveaux de transparence sur les cubes couverts | [→](./visibility-field#createvisibilityfieldlines) |
| `computeVisibilityField` | Helper pur (testable hors Three) qui calcule un buffer d'opacités | [→](./visibility-field#computevisibilityfield) |
| `tierMapForVisibilityField` | Helper pur qui projette les focals sur la grille | [→](./visibility-field#tiermap) |
| `prepareCloseupField` | Sous-buffer + shader haute fidélité pour la vue rapprochée d'un cube | [→](./closeup) |
| `createHoverRing` | Anneau billboard pour survol d'étoile dans une vue rapprochée | [→](./closeup) |

## Exemple — incarner un joueur

Le jeu compose le concept "joueur" en bindant les primitives à ses propres données :

```ts
import { createCubeMarker } from 'stellex/view/CubeMarker.js';
import { createVisibilityFieldLines } from 'stellex/view/GridHelper.js';

// 1. Marqueur sur le cube du joueur
const myMarker = createCubeMarker(galaxyData.opts.cubeSize, { color: team.color });
const c = galaxyData.grid.cubeToWorldCenter(player.cube.i, 0, player.cube.k);
myMarker.position.set(c.x, c.y, c.z);
galaxyScene.object3D.add(myMarker);

// 2. Visibilité autour du joueur (et de ses scouts)
const focals = [player.cube, ...scouts.map((s) => s.cube)];
galaxyScene.setVisibilityField({ focals, range: player.sensorRange });

// 3. Wireframe assorti
const lines = createVisibilityFieldLines(galaxyData.grid, focals, { range: player.sensorRange });
galaxyScene.object3D.add(lines);

// 4. Inspection rapprochée avec mise en évidence de mon étoile principale
//    (l'orchestration tween/dim/clip est composée côté caller — voir docs/primitives/closeup)
const field = prepareCloseupField(homeCube, galaxyData, {
  index: player.homeStarIdx,
  color: team.colorRgb,
  label: `${player.name} (capitale)`,
});
if (field) galaxyScene.object3D.add(field.points);
```

Aucun code de la lib ne sait que `player`, `team`, `scouts`, `sensorRange` existent. Tout est plug.
