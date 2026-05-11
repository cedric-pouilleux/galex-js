# Close-up — primitives & orchestration

La lib expose **trois primitives neutres** pour bâtir une vue rapprochée d'un cube. L'orchestrateur (qui décide quand entrer/sortir, quelle caméra animer, à quelle distance, avec quel dim) est laissé au caller — c'est de l'UX, pas du domaine lib.

## Primitives lib (`view/closeup/`)

| Symbole | Rôle |
|---|---|
| `prepareCloseupField(cubes, galaxyData, highlight?)` | Construit un sous-buffer (positions/colors/sizes/temps + noms Bayer + `aSeed` dérivé du seed galaxie + `globalIndices`) et le matérialise en `THREE.Points` avec le shader haute fidélité. Accepte un cube unique ou un tableau (sélection multiple — voir [PaintSelection](./paint-selection)). Retourne `null` si la sélection est vide. |
| `createHoverRing()` | Anneau de sélection : billboard auto-redimensionné, **anneau fin + glow radial doux**, pulsation discrète (appeler `update(time)` chaque frame). Teinté par température (`blackbodyRGB`), bord doux pour ne pas masquer l'étoile. Compose `createSelectionRing` en interne. |
| `createSelectionRing(options?)` | Primitive partagée : quad billboard piloté par un shader (anneau Gaussien + glow radial additif). Couleur libre, pulsation optionnelle. Réutilisé par le hover ring (pulsé, teinté par température) et par les markers "locked" du caller (statique, couleur d'accent). |
| `STAR_VERT` / `STAR_FRAG` | Shader GLSL haute fidélité (giant boost, spikes, halo, body tightness, core fleck, variabilité Cepheid). 6 traits décorrélés par étoile depuis `aSeed`. |

::: code-group

```ts [Vanilla Three]
import { prepareCloseupField } from 'galex-js/view/closeup/Buffers';
import { createHoverRing } from 'galex-js/view/closeup/HoverRing';

const field = prepareCloseupField(cube, galaxyData, highlight);
if (field) galaxyScene.object3D.add(field.points);

const hoverRing = createHoverRing();
galaxyScene.object3D.add(hoverRing.object);
hoverRing.showOn(field.points, starIndex, camera, field.temps[starIndex]);
```

```vue [Vue / TresJS]
<script setup lang="ts">
import { ref, watch } from 'vue';
import { prepareCloseupField } from 'galex-js/view/closeup/Buffers';
import { createHoverRing } from 'galex-js/view/closeup/HoverRing';

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

Si `highlight.index` n'est pas dans la sélection (l'union de `starIndices` de chaque cube), aucune étoile n'est mise en évidence (comportement silencieux).

## Sélection multi-cubes

Quand la sélection contient plusieurs cubes, leurs étoiles sont concaténées dans un seul `THREE.Points`. Le tableau `globalIndices` (typage `Int32Array`) trace, pour chaque sommet local, l'index global dans `galaxyData.data` — c'est la traduction local→global à utiliser après un raycast (mesures de distance, highlight, etc.). Le caller décide du cadrage caméra (bounding-box des centres de cubes) — la lib ne fait que produire les buffers.

Le playground compose ça avec [PaintSelection](./paint-selection) (drag-démarré-sur-cube → peinture) ; le close-up multi-cubes s'ouvre au relâcher.

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

## Hover ring branché sur le raycaster

Le hover ring exposé par `createHoverRing` est purement visuel : c'est au caller de raycaster les `THREE.Points` et d'appeler `showOn / hide`. Pour que le hit-testing fonctionne sur des sprites, on règle `raycaster.params.Points.threshold` proportionnellement à la taille moyenne d'étoile.

::: info Pulsation
Le ring respire grâce à un shader paramétré par le temps. **Appeler `hoverRing.update(time)` une fois par frame** dans la boucle de rendu (sinon il reste figé, sans clignotement). Le `time` peut être issu d'un `THREE.Clock` ou de l'argument du `requestAnimationFrame` (converti en secondes).
:::

::: code-group

```ts [Vanilla Three]
import { prepareCloseupField } from 'galex-js/view/closeup/Buffers';
import { createHoverRing } from 'galex-js/view/closeup/HoverRing';

const field = prepareCloseupField(cube, galaxyData);
if (!field) throw new Error('empty cube');
galaxyScene.object3D.add(field.points);

const hoverRing = createHoverRing();
galaxyScene.object3D.add(hoverRing.object);

const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 0.3 };   // tune to sprite radius
const ndc = new THREE.Vector2();

renderer.domElement.addEventListener('pointermove', (ev) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(field.points, false);
  if (hits.length === 0) return hoverRing.hide();

  const starIndex = hits[0].index!;
  hoverRing.showOn(field.points, starIndex, camera, field.temps[starIndex]);
});
```

```vue [Vue / TresJS]
<script setup lang="ts">
import { onMounted, onBeforeUnmount, shallowRef } from 'vue';
import * as THREE from 'three';
import { useTresContext } from '@tresjs/core';
import { prepareCloseupField } from 'galex-js/view/closeup/Buffers';
import { createHoverRing } from 'galex-js/view/closeup/HoverRing';

const props = defineProps<{ cube: Cube }>();
const { camera, renderer } = useTresContext();

const field = shallowRef(prepareCloseupField(props.cube, galaxyData));
const hoverRing = createHoverRing();

const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 0.3 };
const ndc = new THREE.Vector2();

function onPointerMove(ev: PointerEvent) {
  const dom = renderer.value!.domElement;
  const rect = dom.getBoundingClientRect();
  ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera.value!);
  const f = field.value;
  if (!f) return;
  const hits = raycaster.intersectObject(f.points, false);
  if (hits.length === 0) return hoverRing.hide();

  const idx = hits[0].index!;
  hoverRing.showOn(f.points, idx, camera.value!, f.temps[idx]);
}

onMounted(() => renderer.value!.domElement.addEventListener('pointermove', onPointerMove));
onBeforeUnmount(() => renderer.value!.domElement.removeEventListener('pointermove', onPointerMove));
</script>

<template>
  <TresPrimitive v-if="field" :object="field.points" />
  <TresPrimitive :object="hoverRing.object" />
</template>
```

:::

## Orchestration côté caller

Le tween caméra, le dim global, le plan de clipping et la gestion d'état `isActive` ne sont **pas** dans la lib : ils dépendent du système caméra du jeu, de sa courbe d'animation, de sa logique de visibilité.

Un exemple complet de référence vit dans le playground :

| Fichier | Rôle |
|---|---|
| [`playground/Closeup.ts`](https://github.com/cedric-pouilleux/galex-js/blob/main/playground/Closeup.ts) | Compose les primitives + tween caméra + dim/clip via `GalaxyScene` |
| [`playground/CloseupTween.ts`](https://github.com/cedric-pouilleux/galex-js/blob/main/playground/CloseupTween.ts) | Tween rAF easeOutCubic (couplé à `OrbitControls`) |

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

### Cleanup symétrique

Le sous-buffer du close-up alloue ses propres `BufferGeometry` + `ShaderMaterial`. Si tu rebuild le field (changement de cube, exit du close-up) sans dispose, ça fuit en GPU.

::: code-group

```ts [Vanilla Three]
import type { CloseupField } from 'galex-js/view/closeup/Buffers';

let active: CloseupField | null = null;

function exit() {
  if (active) {
    galaxyScene.object3D.remove(active.points);
    active.points.geometry.dispose();
    (active.points.material as THREE.ShaderMaterial).dispose();
    active = null;
  }
  galaxyScene.setDimming(1.0);
  galaxyScene.setClipping(false);
}
```

```vue [Vue / TresJS]
<script setup lang="ts">
import { watch, onBeforeUnmount, shallowRef } from 'vue';
import * as THREE from 'three';
import { prepareCloseupField } from 'galex-js/view/closeup/Buffers';
import type { CloseupField } from 'galex-js/view/closeup/Buffers';

const props = defineProps<{ cube: Cube | null }>();
const field = shallowRef<CloseupField | null>(null);

// Dispose previous field on every cube swap to free GPU resources.
function disposeField(f: CloseupField | null) {
  if (!f) return;
  f.points.geometry.dispose();
  (f.points.material as THREE.ShaderMaterial).dispose();
}

watch(() => props.cube, (cube, _prev, onCleanup) => {
  field.value = cube ? prepareCloseupField(cube, galaxyData) : null;
  onCleanup(() => disposeField(field.value));
}, { immediate: true });

onBeforeUnmount(() => disposeField(field.value));
</script>

<template>
  <TresPrimitive v-if="field" :object="field.points" />
</template>
```

:::

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
