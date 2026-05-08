# Close-up — primitives & orchestration

La lib expose **trois primitives neutres** pour bâtir une vue rapprochée d'un cube. L'orchestrateur (qui décide quand entrer/sortir, quelle caméra animer, à quelle distance, avec quel dim) est laissé au caller — c'est de l'UX, pas du domaine lib.

## Primitives lib (`view/closeup/`)

| Symbole | Rôle |
|---|---|
| `prepareCloseupField(cube, galaxyData, highlight?)` | Construit un sous-buffer (positions/colors/sizes/temps + noms Bayer + `aSeed` dérivé du seed galaxie) et le matérialise en `THREE.Points` avec le shader haute fidélité. Retourne `null` si le cube est vide. |
| `createHoverRing()` | Anneau billboard auto-redimensionné sur l'étoile survolée. Teinté par température (`blackbodyRGB`). |
| `STAR_VERT` / `STAR_FRAG` | Shader GLSL haute fidélité (giant boost, spikes, halo, body tightness, core fleck, variabilité Cepheid). 6 traits décorrélés par étoile depuis `aSeed`. |

::: code-group

```ts [Vanilla Three]
import { prepareCloseupField } from 'stellex-galaxy-sandbox/view/closeup/Buffers';
import { createHoverRing } from 'stellex-galaxy-sandbox/view/closeup/HoverRing';

const field = prepareCloseupField(cube, galaxyData, highlight);
if (field) galaxyScene.object3D.add(field.points);

const hoverRing = createHoverRing();
galaxyScene.object3D.add(hoverRing.object);
hoverRing.showOn(field.points, starIndex, camera, field.temps[starIndex]);
```

```vue [Vue / TresJS]
<script setup lang="ts">
import { ref, watch } from 'vue';
import { prepareCloseupField } from 'stellex-galaxy-sandbox/view/closeup/Buffers';
import { createHoverRing } from 'stellex-galaxy-sandbox/view/closeup/HoverRing';

const props = defineProps<{ cube: Cube; highlight?: CloseupHighlight }>();
const field = ref(prepareCloseupField(props.cube, galaxyData, props.highlight ?? null));
const hoverRing = createHoverRing();

// React to cube changes — rebuild the sub-buffer.
watch(() => props.cube, (cube) => {
  field.value = prepareCloseupField(cube, galaxyData, props.highlight ?? null);
});
</script>

<template>
  <TresPrimitive v-if="field" :object="field.points" />
  <TresPrimitive :object="hoverRing.object" />
</template>
```

:::

## API neutre — `highlight`

`prepareCloseupField` accepte une mise en évidence facultative pour **une étoile** du cube :

```ts
type CloseupHighlight = {
  index: number;                      // index global dans Galaxy.data.positions
  color?: [number, number, number];   // RGB normalisé ; défaut = couleur d'origine
  sizeMultiplier?: number;            // défaut 2.4
  label?: string;                     // défaut = nameStarInCube(cube, posInCube)
};
```

Si `highlight.index` n'est pas dans `cube.starIndices`, aucune étoile n'est mise en évidence (comportement silencieux).

## Composer le concept "joueur"

```ts
const field = prepareCloseupField(homeCube, galaxyData, {
  index: player.homeStarIdx,
  color: [0.55, 1.0, 0.65],
  sizeMultiplier: 2.4,
  label: `${player.name} (capitale)`,
});
```

Aucun concept *player* dans la lib — le caller compose le sens.

## Orchestration côté caller

Le tween caméra, le dim global, le plan de clipping et la gestion d'état `isActive` ne sont **pas** dans la lib : ils dépendent du système caméra du jeu, de sa courbe d'animation, de sa logique de visibilité.

Un exemple complet de référence vit dans le playground :

| Fichier | Rôle |
|---|---|
| [`playground/Closeup.ts`](https://github.com/.../playground/Closeup.ts) | Compose les primitives + tween caméra + dim/clip via `GalaxyScene` |
| [`playground/CloseupTween.ts`](https://github.com/.../playground/CloseupTween.ts) | Tween rAF easeOutCubic (couplé à `OrbitControls`) |

Squelette d'orchestrateur :

```ts
function enter(cube: Cube, highlight: CloseupHighlight | null) {
  // 1. Build sous-buffer
  const field = prepareCloseupField(cube, galaxyData, highlight);
  if (field) galaxyScene.object3D.add(field.points);

  // 2. Tween caméra (à votre sauce)
  tweenCamera(camera, controls, target, 700);

  // 3. Dim galaxie
  galaxyScene.setDimming(0.03);

  // 4. Plan de clipping (chaque frame, dans la boucle de rendu)
  galaxyScene.setClipping(true, normal, point);
}
```

À la sortie : symétrique. `setDimming(1.0)`, `setClipping(false)`, dispose du `field.points`.

## Pourquoi ce découplage ?

| Concern | Place |
|---|---|
| Sous-buffer cube | ✅ lib (déterministe + dérivé du seed) |
| Shader haute fidélité | ✅ lib (rendu pur) |
| Anneau hover | ✅ lib (géométrie neutre) |
| Tween caméra | ❌ caller (dépend du système caméra) |
| Dim ratio (0.03 ?) | ❌ caller (UX) |
| Clipping (cubeSize × 0.6 ?) | ❌ caller (UX) |
| State `isActive` | ❌ caller (machine UI) |

Un MMO 4X avec sa propre caméra RTS écrit son propre orchestrateur en consommant les mêmes primitives — la lib ne lui impose ni `OrbitControls`, ni durée de tween, ni courbe d'easing.
