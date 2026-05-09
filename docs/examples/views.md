# Modes de vue

Le même `GalaxyData` se rend sous trois modes contrôlés via `useGalaxyView` (composable Vue) ou `createGalaxyScene` (vanilla). Chaque mode = un setup caméra + uniforms.

## Bascule orbite ↔ plan ↔ close-up

Clique sur les boutons pour passer d'un mode à l'autre — le `GalaxyData` est construit **une seule fois**, le swap est purement uniforms (`setDimming`, `setClipping`, position caméra).

<ViewModeDemo :seed="42" :height="420" :closeup-cube="{ i: 4, k: 0 }" />

### Comment ça marche

| Mode | Caméra | Uniforms |
|---|---|---|
| `orbit` | Perspective 3/4, idle rotation Y | aucun changement |
| `plan` | Orthographique vue de dessus | `setOrthoSize(zoom)` ajuste la taille des sprites |
| `closeup` | Perspective fixe sur le cube | `setDimming(0.04)` + `setClipping(true, normal, point)` |

Cf. [`createGalaxyScene`](../api/galaxy-scene) pour la liste complète des setters.

## Comparatif côte à côte

Trois caméras, même seed, captures statiques (pas de rotation idle) pour faciliter la comparaison.

<GalaxyGrid :height="260" :items="[
  { seed: 42, static: true, cameraTilt: 1.0, caption: 'Orbite — perspective 3/4' },
  { seed: 42, static: true, cameraTilt: 2.5, caption: 'Plan — vue plongeante' },
  { seed: 42, static: true, gasDensity: 0.3, cameraTilt: 1.2, caption: 'Galaxie atténuée (closeup-like)' },
]" />

## Pourquoi ce découplage

Le mode est **un état caller** : la lib n'a pas de notion *plan view active* — elle expose uniquement les uniforms permettant de passer d'un mode à l'autre. La machine d'état (orbit / plan / closeup), les transitions, les durées de tween, vivent dans le code applicatif.

Cf. [primitives/closeup](../primitives/closeup) pour l'orchestration complète d'un close-up.
