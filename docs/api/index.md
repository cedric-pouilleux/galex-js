# Référence API

Vue d'ensemble des entrées publiques de la lib, classées par cible.

## Backend Node / Vanilla — `core/`

| Symbole | Rôle |
|---|---|
| [`createGalaxyData`](./galaxy-data) | Entrée principale côté données. Déterministe pour un `(seed, opts)`. |
| [`starDistance`, `nearestStars`, `starsWithinRadius`](./star-neighbors) | Requêtes de proximité spatiale entre étoiles via la `CubeGrid`. |
| [`LIGHT_YEARS_PER_CUBE`, `lightYearsPerUnit`, `worldUnitsToLightYears`](./astronomy) | Conversion des unités monde en années-lumière (1 cube = 50 al). |
| `mulberry32`, `deriveSubseed` | PRNG seedé + dérivation de subseeds par label (utile pour étendre le pipeline). |
| `detSin`, `detCos`, `detLog`, `detExp`, `detPow` | Math transcendantes bit-stables cross-engine. |
| `computeVisibilityField`, `tierMapForVisibilityField` | Helpers purs de visibilité (pour décisions gameplay côté serveur). |
| `blackbodyRGB`, `spectralClass`, `sampleTemperature` | Couleur d'étoile par température. |
| `nameStarInCube` | Identifiant catalogue stable pour une étoile dans un cube (format `GX-E3N7-012`), persistable côté serveur. |

## Vanilla Three — `view/`

| Symbole | Rôle |
|---|---|
| [`createGalaxyScene`](./galaxy-scene) | Compose toutes les couches visuelles dans un `THREE.Group` + expose les contrôles per-frame. |
| `createCubeMarker` | Marqueur autour d'un cube (cf. [primitives/cube-marker](../primitives/cube-marker)). |
| `createCubeWireframe`, `createOccupiedGridLines`, `createVisibilityFieldLines` | Helpers grille (cf. [primitives/visibility-field](../primitives/visibility-field)). |
| `prepareCloseupField`, `createHoverRing` | Primitives close-up (cf. [primitives/closeup](../primitives/closeup)). L'orchestration tween/dim/clip vit côté caller. |

### Couches `view/effects/`

Chaque couche expose deux niveaux d'API (voir [Architecture](../architecture/)) — la pure-data et la material-def. Le mount Three.js est centralisé dans `createGalaxyScene` (vanilla) et dans `<GalaxyScene>` / `useGalaxyLayers` (Vue) ; un caller qui voudrait composer manuellement passe par ces deux niveaux :

| Couche | `buildXBuffers` (pure-data) | `createXMaterialDef` |
|---|---|---|
| Star field | — (alias des buffers de `GalaxyData`) + `createStarFieldVisibility` | `createStarFieldMaterialDef` |
| Halo | — (`createHaloGeometry`) | `createHaloMaterialDef` |
| Nébuleuses | `buildNebulaeBuffers` | `createNebulaeMaterialDef` |
| Streaks gaz | `buildGasStreaksBuffers` | `createGasStreaksMaterialDef` |
| Halo de bras | `buildArmGlowBuffers` | `createArmGlowMaterialDef` |
| Anneau interne | `buildInnerRingBuffers` | `createInnerRingMaterialDef` |
| Bulbe central | `buildCenterDustBuffers` + `createCenterDiscGeometry` | `createCenterDiscMaterialDef` + `createCenterDustMaterialDef` |

## Vue / TresJS — `view-vue/`

| Symbole | Rôle |
|---|---|
| [`useGalaxyLayers`](./use-galaxy-layers) | Composable réactif → buffers + materialDefs prêts pour TresJS (déclaratif). |
| [`useGalaxyView`](./use-galaxy-view) | Composable réactif → `THREE.Group` + refs pour les contrôles dynamiques. |
| `<GalaxyScene>` | Composant drop-in qui consomme `useGalaxyLayers`. |

Voir aussi la page [Intégration Vue / TresJS](../integrations/vue-tres) pour les patterns d'usage.
