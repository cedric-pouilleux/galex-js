import { ref, watch, onScopeDispose, toValue } from 'vue';
import type { Ref, MaybeRefOrGetter } from 'vue';
import * as THREE from 'three';
import { createGalaxyScene } from '../../view/GalaxyScene.js';
import type { GalaxyData } from '../../core/GalaxyData.js';
import type { GalaxyScene, GalaxySceneOptions } from '../../view/GalaxyScene.js';
import type { VisibilityFieldConfig } from '../../core/Visibility.js';

/** Reactive clipping plane state. `active === false` disables clipping. */
export type ClippingState =
  | { active: false }
  | { active: true; normal: THREE.Vector3; point: THREE.Vector3 };

export type GalaxyViewControls = {
  /** Global dim — multiplies the uDim uniform on every layer (0..1, default 1). */
  dimming: Ref<number>;
  /** Gas-only dim — armGlow / gasStreaks / nebulae / innerRing / centerDust (0..1, default 1). */
  gasDim: Ref<number>;
  /** Toggles the soft halo behind the disk. */
  haloVisible: Ref<boolean>;
  /** Sprite size driver for the orthographic camera. `0` falls back to perspective. */
  orthoSize: Ref<number>;
  /** Multi-focal visibility field; `null` clears it (everything visible). */
  visibilityField: Ref<VisibilityFieldConfig | null>;
  /** World-space clipping plane state. */
  clipping: Ref<ClippingState>;
};

export type GalaxyViewHandle = GalaxyViewControls & {
  /** The `THREE.Group` to mount in the TresJS scene (typically via `<TresPrimitive :object="...">`). */
  readonly object3D: THREE.Group;
  /** Underlying vanilla scene — escape hatch if a caller needs the raw API. */
  readonly scene: GalaxyScene;
  /** Releases GPU resources. Called automatically when the consuming component is unmounted. */
  dispose(): void;
};

/**
 * Reactive Vue composable that wraps `createGalaxyScene` and exposes its
 * runtime knobs as refs. Each ref change is forwarded to the underlying
 * vanilla scene via watchers — mutate the ref, the GPU updates.
 *
 * Usage in TresJS:
 * ```vue
 * <script setup>
 * const galaxy = createGalaxyData({ seed: 42, count: 15000, radius: 50 });
 * const view = useGalaxyView(galaxy);
 * view.dimming.value = 0.6;
 * </script>
 * <template>
 *   <TresCanvas>
 *     <TresPrimitive :object="view.object3D" />
 *   </TresCanvas>
 * </template>
 * ```
 *
 * The companion `<GalaxyScene>` component is the **declarative** path:
 * it consumes `useGalaxyLayers` and mounts the layers as native TresJS
 * elements but exposes no controls. Use this composable when you need
 * dynamic dimming, fog of war, plan view zoom or close-up clipping.
 */
export function useGalaxyView(
  galaxyData: MaybeRefOrGetter<GalaxyData>,
  opts: MaybeRefOrGetter<GalaxySceneOptions> = {},
): GalaxyViewHandle {
  // The scene is built once for the initial galaxyData snapshot. If the input
  // ref changes downstream, callers should re-create the composable (e.g. via
  // `<KeepAlive>` swap) — incremental updates aren't this layer's job.
  const scene = createGalaxyScene(toValue(galaxyData), toValue(opts));

  const dimming = ref(1.0);
  const gasDim = ref(1.0);
  const haloVisible = ref(true);
  const orthoSize = ref(0);
  const visibilityField = ref<VisibilityFieldConfig | null>(null);
  const clipping = ref<ClippingState>({ active: false });

  // Each watcher forwards a single concern to the vanilla scene. `flush: 'sync'`
  // would over-react during typical UI changes; the default post-flush is fine
  // since the next frame picks up the uniform mutation.
  watch(dimming, (v) => scene.setDimming(v), { immediate: false });
  watch(gasDim, (v) => scene.setGasDim(v), { immediate: false });
  watch(haloVisible, (v) => scene.setHaloVisible(v), { immediate: false });
  watch(orthoSize, (v) => scene.setOrthoSize(v), { immediate: false });
  watch(visibilityField, (v) => scene.setVisibilityField(v), { immediate: false });
  watch(clipping, (v) => {
    if (v.active) scene.setClipping(true, v.normal, v.point);
    else scene.setClipping(false);
  }, { immediate: false });

  // Auto-dispose with the surrounding effect scope (component unmount, etc.).
  onScopeDispose(() => scene.dispose());

  return {
    object3D: scene.object3D,
    scene,
    dimming,
    gasDim,
    haloVisible,
    orthoSize,
    visibilityField,
    clipping,
    dispose: () => scene.dispose(),
  };
}
