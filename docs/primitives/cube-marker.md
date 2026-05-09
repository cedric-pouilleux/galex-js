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

## Bascule plan view ↔ orbite

Quand la caméra passe en orthographique (plateau vu de dessus), appelle `setPlanView(true)` pour activer le halo plat et le blending normal. Au retour orbite, `setPlanView(false)` rétablit l'additive.

::: code-group

```ts [Vanilla Three]
const marker = createCubeMarker(2, { color: 0x7fff9f });
galaxyScene.object3D.add(marker.object3D);

// Hooked to your camera-mode store / state machine.
function onCameraModeChange(mode: 'orbit' | 'plan') {
  marker.setPlanView(mode === 'plan');
}
```

```vue [Vue / TresJS]
<script setup lang="ts">
import { watch } from 'vue';
import { createCubeMarker } from 'stellex-galaxy-sandbox/view/CubeMarker';

const props = defineProps<{ cameraMode: 'orbit' | 'plan' }>();
const marker = createCubeMarker(2, { color: 0x7fff9f });

// Reactively forward the boolean to the imperative setter.
watch(() => props.cameraMode, (mode) => {
  marker.setPlanView(mode === 'plan');
}, { immediate: true });
</script>

<template>
  <TresPrimitive :object="marker.object3D" />
</template>
```

:::

## Pool de marqueurs (équipes, flottes)

Pattern recommandé pour gérer dynamiquement N marqueurs : une `Map` indexée par `cubeKey`, montage / démontage à la frontière de `galaxyScene.object3D`.

::: code-group

```ts [Vanilla Three]
import { createCubeMarker } from 'stellex-galaxy-sandbox/view/CubeMarker';
import type { CubeMarker } from 'stellex-galaxy-sandbox/view/CubeMarker';

type Fleet = { id: string; cube: { i: number; k: number }; color: number };

const fleetMarkers = new Map<string, CubeMarker>();

function syncFleets(fleets: Fleet[]) {
  const live = new Set(fleets.map((f) => f.id));

  // Unmount disappeared fleets.
  for (const [id, marker] of fleetMarkers) {
    if (live.has(id)) continue;
    galaxyScene.object3D.remove(marker.object3D);
    disposeMarker(marker);
    fleetMarkers.delete(id);
  }

  // Create/update remaining ones.
  for (const fleet of fleets) {
    let marker = fleetMarkers.get(fleet.id);
    if (!marker) {
      marker = createCubeMarker(galaxyData.opts.cubeSize, { color: fleet.color });
      galaxyScene.object3D.add(marker.object3D);
      fleetMarkers.set(fleet.id, marker);
    }
    const c = galaxyData.grid.cubeToWorldCenter(fleet.cube.i, 0, fleet.cube.k);
    marker.object3D.position.set(c.x, c.y, c.z);
  }
}

function disposeMarker(marker: CubeMarker) {
  marker.object3D.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}
```

```vue [Vue / TresJS]
<script setup lang="ts">
import { onBeforeUnmount, watchEffect } from 'vue';
import { createCubeMarker } from 'stellex-galaxy-sandbox/view/CubeMarker';
import type { CubeMarker } from 'stellex-galaxy-sandbox/view/CubeMarker';

type Fleet = { id: string; cube: { i: number; k: number }; color: number };

const props = defineProps<{ fleets: Fleet[] }>();
const markers = new Map<string, CubeMarker>();

// Re-sync the pool whenever the reactive fleet list changes.
watchEffect(() => {
  const live = new Set(props.fleets.map((f) => f.id));
  for (const [id, m] of markers) {
    if (!live.has(id)) {
      m.object3D.removeFromParent();
      markers.delete(id);
    }
  }
  for (const f of props.fleets) {
    let m = markers.get(f.id);
    if (!m) {
      m = createCubeMarker(2, { color: f.color });
      markers.set(f.id, m);
    }
    const c = galaxyData.grid.cubeToWorldCenter(f.cube.i, 0, f.cube.k);
    m.object3D.position.set(c.x, c.y, c.z);
  }
});

onBeforeUnmount(() => markers.clear());
</script>

<template>
  <TresPrimitive
    v-for="[id, marker] in markers"
    :key="id"
    :object="marker.object3D"
  />
</template>
```

:::

## Animation

La lib n'impose pas de boucle d'animation. Si vous voulez animer le marqueur (pulsation, rotation, etc.), accédez à `marker.object3D` directement depuis votre boucle de rendu :

::: code-group

```ts [Vanilla Three]
function animate(t: number) {
  me.object3D.rotation.y = t * 0.5;                          // slow yaw
  me.object3D.scale.setScalar(1 + 0.05 * Math.sin(t * 2));   // pulsing
}
```

```vue [Vue / TresJS]
<script setup lang="ts">
import { useRenderLoop } from '@tresjs/core';
import { createCubeMarker } from 'stellex-galaxy-sandbox/view/CubeMarker';

const marker = createCubeMarker(2, { color: 0x7fff9f });

// onLoop is the per-frame hook from TresJS, equivalent to requestAnimationFrame.
const { onLoop } = useRenderLoop();
onLoop(({ elapsed }) => {
  marker.object3D.rotation.y = elapsed * 0.5;
  marker.object3D.scale.setScalar(1 + 0.05 * Math.sin(elapsed * 2));
});
</script>

<template>
  <TresPrimitive :object="marker.object3D" />
</template>
```

:::
