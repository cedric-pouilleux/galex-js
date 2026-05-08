# Référence API

Vue d'ensemble des entrées publiques de la lib, classées par cible.

## Backend Node / Vanilla — `core/`

| Symbole | Rôle |
|---|---|
| [`createGalaxyData`](./galaxy-data) | Entrée principale côté données. Déterministe pour un `(seed, opts)`. |
| `mulberry32`, `deriveSubseed` | PRNG seedé + dérivation de subseeds par label (utile pour étendre le pipeline). |
| `detSin`, `detCos`, `detLog`, `detExp`, `detPow` | Math transcendantes bit-stables cross-engine. |
| `computeVisibilityField`, `tierMapForVisibilityField` | Helpers purs de visibilité (pour décisions gameplay côté serveur). |
| `blackbodyRGB`, `spectralClass`, `sampleTemperature` | Couleur d'étoile par température. |

## Vanilla Three — `view/`

| Symbole | Rôle |
|---|---|
| [`createGalaxyScene`](./galaxy-scene) | Compose toutes les couches visuelles dans un `THREE.Group` + expose les contrôles per-frame. |
| `createCubeMarker` | Marqueur autour d'un cube (cf. [primitives/cube-marker](../primitives/cube-marker)). |
| `createCubeWireframe`, `createOccupiedGridLines`, `createVisibilityFieldLines` | Helpers grille (cf. [primitives/visibility-field](../primitives/visibility-field)). |
| `prepareCloseupField`, `createHoverRing` | Primitives close-up (cf. [primitives/closeup](../primitives/closeup)). L'orchestration tween/dim/clip vit côté caller. |
| `nameStarInCube` | Nommage Bayer-style d'une étoile dans un cube. |

### Couches `view/effects/`

Chaque factory expose 3 niveaux d'API (voir [Architecture](../architecture/)) :

| Couche | `buildXBuffers` | `createXMaterialDef` | `createX` (mount Three) |
|---|---|---|---|
| Star field | — (utilise les buffers de `GalaxyData`) | `createStarFieldMaterialDef` | `createStarField` |
| Halo | — (utilise `CircleGeometry`) | `createHaloMaterialDef` | `createHalo` |
| Nébuleuses | `buildNebulaeBuffers` | `createNebulaeMaterialDef` | `createNebulae` |
| Streaks gaz | `buildGasStreaksBuffers` | `createGasStreaksMaterialDef` | `createGasStreaks` |
| Halo de bras | `buildArmGlowBuffers` | `createArmGlowMaterialDef` | `createArmGlow` |
| Anneau interne | `buildInnerRingBuffers` | `createInnerRingMaterialDef` | `createInnerRing` |
| Bulbe central | `buildCenterDustBuffers` + `createCenterDiscGeometry` | `createCenterDiscMaterialDef` + `createCenterDustMaterialDef` | `createCenterDust` |

## Vue / TresJS — `view-vue/`

| Symbole | Rôle |
|---|---|
| [`useGalaxyLayers`](./use-galaxy-layers) | Composable réactif → buffers + materialDefs prêts pour TresJS (déclaratif). |
| [`useGalaxyView`](./use-galaxy-view) | Composable réactif → `THREE.Group` + refs pour les contrôles dynamiques. |
| `<GalaxyScene>` | Composant drop-in qui consomme `useGalaxyLayers`. |

Voir aussi la page [Intégration Vue / TresJS](../integrations/vue-tres) pour les patterns d'usage.
