# CubeMarker

Marqueur visuel autour d'un cube. Lisible en perspective (orbite) et en vue plateau orthographique.

## Signature

```ts
import { createCubeMarker } from 'stellex/view/CubeMarker.js';

createCubeMarker(cubeSize: number, opts?: CubeMarkerOptions): {
  readonly object3D: THREE.Group;
  setPlanView(active: boolean): void;
};
```

## Options

| Option | Type | Défaut | Effet |
|---|---|---|---|
| `color` | `number` (hex) | `0x7fff9f` | Wireframe + halo plan view |
| `bodyColor` | `number` (hex) | `0x55ee70` | Mesh interne (additive blending) |
| `bodyOpacity` | `number` | `0.22` | Opacité du body en orbite |
| `planBodyOpacity` | `number` | `0.6` | Opacité du body en plan view (normal blending) |
| `planHaloOpacity` | `number` | `0.55` | Halo plat (visible plan view uniquement) |
| `wireWidth` | `number` | `2.5` | Épaisseur de l'arête en pixels |

## Composition visuelle

Trois couches :

1. **Body** — `THREE.BoxGeometry`, additive blending par défaut. Donne le volume.
2. **Wireframe** — `LineSegments2` épais via `createCubeWireframe`, depthTest off, renderOrder 1000.
3. **Halo plan view** — Plan horizontal sur la face supérieure, masqué en orbite, renderOrder 999.

`setPlanView(true)` :
- Affiche le halo plat.
- Bascule le body en blending normal avec opacité plus forte (l'additive disparaît sur fond sombre vue de dessus).

`setPlanView(false)` :
- Masque le halo.
- Revient en additive sur le body.

## Cas d'usage

::: code-group

```ts [Vanilla Three]
import { createCubeMarker } from 'stellex-galaxy-sandbox/view/CubeMarker';

// Marqueur joueur (vert classique)
const me = createCubeMarker(2, { color: 0x7fff9f });
galaxyScene.object3D.add(me.object3D);
const c = galaxyData.grid.cubeToWorldCenter(player.cube.i, 0, player.cube.k);
me.object3D.position.set(c.x, c.y, c.z);

// Cible ennemie (rouge agressif)
const enemy = createCubeMarker(2, {
  color: 0xff4060,
  bodyColor: 0xff5070,
  bodyOpacity: 0.35,
});
```

```vue [Vue / TresJS]
<script setup lang="ts">
import { computed } from 'vue';
import { createCubeMarker } from 'stellex-galaxy-sandbox/view/CubeMarker';

const props = defineProps<{ player: { cube: { i: number; k: number } } }>();

const me = createCubeMarker(2, { color: 0x7fff9f });
const center = computed(() =>
  galaxyData.grid.cubeToWorldCenter(props.player.cube.i, 0, props.player.cube.k),
);
</script>

<template>
  <!-- Le wrapper expose un THREE.Group natif → TresPrimitive l'adopte tel quel. -->
  <TresPrimitive :object="me.object3D" :position="[center.x, 0, center.z]" />
</template>
```

:::

## Vie du marqueur

Le marqueur expose un `object3D: THREE.Group` standard — la lib ne le track pas. C'est au caller de :

- L'attacher à `galaxyScene.object3D` (ou n'importe quelle scène) via `marker.object3D`.
- Le repositionner via `cubeToWorldCenter` quand le cube cible change : `marker.object3D.position.set(...)`.
- Le `dispose()` quand la galaxie est rebuilt (parcours `marker.object3D.traverse(...)` + dispose des geometries/materials).

Pour gérer N marqueurs (équipes, flottes, IA), instancier autant de fois que nécessaire et garder une `Map<cubeKey, CubeMarker>` côté caller.

## Animation

La lib n'impose pas de boucle d'animation. Si vous voulez animer le marqueur (pulsation, rotation, etc.), accédez à `marker.object3D` directement depuis votre boucle de rendu :

```ts
function animate(t: number) {
  me.object3D.rotation.y = t * 0.5;       // exemple : rotation lente
  me.object3D.scale.setScalar(1 + 0.05 * Math.sin(t * 2));  // pulsation
}
```
