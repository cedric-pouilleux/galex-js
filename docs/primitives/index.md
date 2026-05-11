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
| `prepareCloseupField` | Sous-buffer + shader haute fidélité pour la vue rapprochée d'un ou plusieurs cubes | [→](./closeup) |
| `createHoverRing` | Anneau billboard pour survol d'étoile dans une vue rapprochée | [→](./closeup) |
| `createSelectionRing` | Anneau shader partagé (hover ring + markers locked) — couleur libre, pulsation optionnelle | [→](./closeup) |
| `createDashedPath` | Chemin pointillé A→B — défilement des tirets + pulse d'opacité optionnels, hooks d'extension caller | [→](./paths) |

## Compositions du sandbox

Ces deux modules vivent dans `playground/` (pas dans la lib), mais sont documentés ici comme **références d'orchestration** : voici comment composer les primitives lib pour produire un geste de jeu.

| Composition | Rôle | Page |
|---|---|---|
| `createPaintSelection` | Sélection multi-cubes en peinture (drag-démarré-sur-cube → highlight des cubes survolés) | [→](./paint-selection) |
| `createMeasureTool` | Mesure de distance à deux ancres — cubes en orbite, étoiles en close-up | [→](./measure-tool) |

## Exemple — incarner un joueur

Le jeu compose le concept "joueur" en bindant les primitives à ses propres données :

```ts
import { createCubeMarker } from 'galex-js/view/CubeMarker';
import { createVisibilityFieldLines } from 'galex-js/view/GridHelper';

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
