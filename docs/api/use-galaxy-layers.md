# `useGalaxyLayers(galaxyData, opts?)`

Composable Vue **déclaratif** : transforme un `GalaxyData` en un `ComputedRef<GalaxyLayers>` contenant les buffers + material defs réactifs prêts à monter dans un template TresJS.

```ts
import { useGalaxyLayers } from 'galex-js/view-vue';

const layers = useGalaxyLayers(() => galaxyData);
```

## Signature

```ts
function useGalaxyLayers(
  galaxyData: MaybeRefOrGetter<GalaxyData>,
  opts?: MaybeRefOrGetter<GalaxyLayersOptions>,
): ComputedRef<GalaxyLayers>;

type GalaxyLayersOptions = {
  gasDensity?: number;     // 1.0
};
```

L'input accepte un `Ref`, un getter, ou une valeur statique — Vue gère via `toValue`. Si tu passes un `Ref`, le composable régénère les buffers à chaque changement (recompute via `computed`).

## Output `GalaxyLayers`

```ts
type GalaxyLayers = {
  field: StarLayer;
  halo: HaloLayer;
  armGlow: PointsLayer<ArmGlowBuffers>;
  gasStreaks: PointsLayer<GasStreaksBuffers>;
  nebulae: PointsLayer<NebulaeBuffers>;
  innerRing: PointsLayer<InnerRingBuffers>;
  centerDust: CenterDustLayer | null;   // null si fillCenter === false
};

type StarLayer = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  visibility: Float32Array;
  materialDef: ShaderMaterialDef;
};

type PointsLayer<TBuffers> = {
  buffers: TBuffers;            // positions, colors, sizes, tangents, stretches, visibility, count
  materialDef: ShaderMaterialDef;
};

type HaloLayer = {
  geometry: THREE.CircleGeometry;
  materialDef: ShaderMaterialDef;
};

type CenterDustLayer = {
  disc: { geometry: THREE.CircleGeometry; materialDef: ShaderMaterialDef };
  dust: { buffers: CenterDustBuffers; materialDef: ShaderMaterialDef };
};
```

## Pattern de montage TresJS

Pour chaque couche `Points`, monter via `<TresPoints>` + `<TresBufferGeometry>` + `<TresShaderMaterial>` :

```vue
<TresPoints :frustum-culled="false" name="armGlow">
  <TresBufferGeometry
    :position="[layers.armGlow.buffers.positions, 3]"
    :a-color="[layers.armGlow.buffers.colors, 3]"
    :a-size="[layers.armGlow.buffers.sizes, 1]"
    :a-tangent="[layers.armGlow.buffers.tangents, 2]"
    :a-stretch="[layers.armGlow.buffers.stretches, 1]"
    :a-visibility="[layers.armGlow.buffers.visibility, 1]"
  />
  <TresShaderMaterial v-bind="layers.armGlow.materialDef" />
</TresPoints>
```

Pour les couches `Mesh` (halo, centerDisc) : `<TresMesh :geometry="...">` + `<TresShaderMaterial>`.

Le composant [`<GalaxyScene>`](../integrations/vue-tres) montre l'assemblage complet — utilise-le directement si tu veux toutes les couches d'un coup.

## Quand utiliser ce composable

Pure rendu déclaratif sans contrôles dynamiques. Pour piloter `dimming`, `gasDim`, le fog of war, le clipping ou la vue plateau, voir [`useGalaxyView`](./use-galaxy-view) à la place.

Un changement de `galaxyData` recrée tous les buffers — c'est cohérent avec le contrat « lib = structure statique ». L'état dynamique (positions de flottes, ressources) reste au-dessus, à la charge du caller.

## Garantie de déterminisme cross-target

Pour le même `(seed, opts)`, les buffers retournés sont **byte-identiques** à ceux produits par `createGalaxyScene` (path vanilla impératif). Vérifié par les tests `view-vue/composables/UseGalaxyLayers.test.ts` — un client Vue et un client vanilla regardant la même galaxie voient strictement la même chose.
