# Primitives en action

Démos live des trois primitives lib appliquées sur la galaxie de référence (`seed=42`). Chaque démo est une instance complète du composable Vue + composant `<TresPrimitive>`.

## CubeMarker — joueur + ennemis

Trois marqueurs colorés ancrés sur des cubes différents, avec bascule plan view qui flippe le blending. Le pattern recommandé pour gérer N marqueurs (équipes, flottes) est documenté dans [primitives/cube-marker](../primitives/cube-marker#pool-de-marqueurs-equipes-flottes).

<CubeMarkerDemo :seed="42" :height="420" />

## Visibility field — fog of war

Deux cubes focals (joueur + scout) projetant un champ de visibilité multi-focal. Bouton `range` pour étendre / réduire la portée des sondes ; toutes les particules (étoiles + gaz + nébuleuses) suivent en temps réel.

<FogDemo :seed="42" :height="420" />

Cf. [primitives/visibility-field](../primitives/visibility-field) pour le modèle mathématique (distance² → opacité) et le pattern serveur via `tierMapForVisibilityField`.

## Hover ring — close-up sur un cube

Sous-buffer construit par `prepareCloseupField`, rendu avec le shader haute fidélité. L'anneau hover cycle automatiquement à travers les étoiles du cube — dans une app réelle, c'est piloté par un `THREE.Raycaster` au pointer move.

<HoverRingDemo :seed="42" :height="420" />

Cf. [primitives/closeup](../primitives/closeup#hover-ring-branche-sur-le-raycaster) pour brancher le hover ring sur un raycaster réel.
