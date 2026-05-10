import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { GalaxyData } from '../core/GalaxyData.js';
import type { Cube } from '../core/CubeGrid.js';
import type { GalaxyScene } from '../view/GalaxyScene.js';
import { tweenCamera } from './CloseupTween.js';
import { prepareCloseupField } from '../view/closeup/Buffers.js';
import type { CloseupHighlight, CloseupField } from '../view/closeup/Buffers.js';
import { createHoverRing } from '../view/closeup/HoverRing.js';

export type { CloseupHighlight } from '../view/closeup/Buffers.js';

const ENTER_TWEEN_MS = 700;
const EXIT_TWEEN_MS = 500;
/** Single-cube reference framing distance, expressed in cube sizes. */
const SINGLE_CUBE_FRAME_FACTOR = 1.8;
/** Multi-cube framing distance scales with the selection's bbox radius. */
const MULTI_CUBE_FRAME_FACTOR = 2.4;
/** Galaxy dim ratio while a close-up is active. */
const CLOSEUP_DIM_RATIO = 0.03;

export type CloseupDeps = {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  galaxyData: GalaxyData;
  galaxyScene: GalaxyScene;
};

/**
 * Hit from raycasting against the close-up's point cloud. `index` is local to
 * the merged field; `globalIndex` is the corresponding `galaxyData.data` index
 * — the only stable identifier when several cubes are merged in one close-up.
 */
export type CloseupStarHit = {
  index: number;
  globalIndex: number;
  name: string;
  temp: number | null;
};

export type Closeup = {
  isActive(): boolean;
  /** The cubes currently inspected (1+), or an empty array when no close-up is open. */
  activeCubes(): readonly Cube[];
  /** Opens a close-up for a single cube or a marquee-selected set of cubes. */
  enter(cubes: Cube | readonly Cube[], opts?: { highlight?: CloseupHighlight | null }): void;
  exit(opts?: { instant?: boolean }): void;
  update(time: number): void;
  starAtPointer(pointer: THREE.Vector2): CloseupStarHit | null;
  showHoverRing(starIndex: number): void;
  hideHoverRing(): void;
};

type SelectionBounds = {
  /** Centre of the cube bounding-box in galaxy-local space. */
  localCenter: THREE.Vector3;
  /** Same point composed with the galaxy-scene world matrix. */
  worldCenter: THREE.Vector3;
  /** Half the bbox's longest axis, in world units. */
  worldRadius: number;
};

type ActiveState = {
  cubes: readonly Cube[];
  worldCenter: THREE.Vector3;
  worldRadius: number;
  field: CloseupField | null;
  savedCamPos: THREE.Vector3;
  savedTarget: THREE.Vector3;
  savedMin: number;
  savedMax: number;
};

/**
 * Playground orchestrator that composes the lib's neutral close-up primitives
 * (`prepareCloseupField`, `createHoverRing`) with a perspective camera + orbit
 * controls + the galaxy-scene dimming/clipping setters. Lives in the caller
 * because the camera flow (tween, dim ratio, clipping distance) is UX, not lib.
 *
 * A real game (e.g. an MMO 4X with its own RTS camera) writes its own version
 * by composing the same primitives.
 */
export function createCloseup({ camera, controls, galaxyData, galaxyScene }: CloseupDeps): Closeup {
  let active: ActiveState | null = null;

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points!.threshold = 0.18;

  const hoverRing = createHoverRing();

  function isActive(): boolean {
    return active !== null;
  }

  function enter(
    cubes: Cube | readonly Cube[],
    { highlight = null }: { highlight?: CloseupHighlight | null } = {},
  ): void {
    if (active) exit({ instant: true });

    const cubeList = Array.isArray(cubes) ? cubes : [cubes as Cube];
    if (cubeList.length === 0) return;

    const bounds = selectionBounds(cubeList);
    const field = prepareCloseupField(cubeList, galaxyData, highlight);
    if (field) galaxyScene.object3D.add(field.points);

    const savedCamPos = camera.position.clone();
    const savedTarget = controls.target.clone();
    const savedMin = controls.minDistance;
    const savedMax = controls.maxDistance;

    frameCameraOnBounds(bounds);

    galaxyScene.setDimming(CLOSEUP_DIM_RATIO);
    galaxyScene.object3D.add(hoverRing.object);
    hoverRing.hide();

    active = {
      cubes: cubeList,
      worldCenter: bounds.worldCenter,
      worldRadius: bounds.worldRadius,
      field,
      savedCamPos, savedTarget, savedMin, savedMax,
    };
  }

  function exit({ instant = false }: { instant?: boolean } = {}): void {
    if (!active) return;
    const a = active;

    if (a.field) {
      galaxyScene.object3D.remove(a.field.points);
      a.field.points.geometry.dispose();
      (a.field.points.material as THREE.Material).dispose();
    }

    controls.minDistance = a.savedMin;
    controls.maxDistance = a.savedMax;

    if (instant) {
      camera.position.copy(a.savedCamPos);
      controls.target.copy(a.savedTarget);
    } else {
      tweenCamera(camera, controls, a.savedCamPos, a.savedTarget, EXIT_TWEEN_MS);
    }

    galaxyScene.setDimming(1.0);
    galaxyScene.setClipping(false);
    galaxyScene.object3D.remove(hoverRing.object);
    hoverRing.hide();

    active = null;
  }

  function update(time: number): void {
    if (!active) return;

    if (active.field) {
      const mat = active.field.points.material as THREE.ShaderMaterial;
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = time;
    }

    updateFrontClippingPlane(active.worldCenter, active.worldRadius);
  }

  function starAtPointer(pointer: THREE.Vector2): CloseupStarHit | null {
    if (!active?.field) return null;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(active.field.points, false);
    if (hits.length === 0) return null;
    const idx = hits[0].index!;
    const field = active.field;
    return {
      index: idx,
      globalIndex: field.globalIndices[idx],
      name: field.names[idx],
      temp: field.temps[idx],
    };
  }

  function showHoverRing(starIndex: number): void {
    if (!active?.field) return;
    const temp = active.field.temps[starIndex];
    hoverRing.showOn(active.field.points, starIndex, camera, temp);
  }

  function hideHoverRing(): void {
    hoverRing.hide();
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  /**
   * Tightest box around the cube centres in galaxy-local space, expanded by
   * half a cube on each side so the frame contains the wireframe edges. Also
   * resolves the world-space centre (after applying the galaxy-scene rotation)
   * and the bbox's bounding-radius — both fed into the camera framing.
   */
  function selectionBounds(cubeList: readonly Cube[]): SelectionBounds {
    const { cubeSize } = galaxyData.opts;
    const bbox = new THREE.Box3();
    const tmp = new THREE.Vector3();
    for (const cube of cubeList) {
      const c = galaxyData.grid.cubeToWorldCenter(cube.i, cube.j, cube.k);
      bbox.expandByPoint(tmp.set(c.x, c.y, c.z));
    }
    bbox.expandByScalar(cubeSize * 0.5);

    const localCenter = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const worldRadius = Math.max(size.x, size.y, size.z) * 0.5;

    const worldCenter = localCenter.clone();
    galaxyScene.object3D.updateMatrixWorld();
    worldCenter.applyMatrix4(galaxyScene.object3D.matrixWorld);

    return { localCenter, worldCenter, worldRadius };
  }

  /**
   * Tweens the camera toward the selection so the bbox fits comfortably in the
   * FOV. Direction is preserved (we slide along the current camera ray), so
   * the swing only changes distance — no jarring re-orientation.
   */
  function frameCameraOnBounds(bounds: SelectionBounds): void {
    const { cubeSize } = galaxyData.opts;
    const dirToCam = camera.position.clone().sub(bounds.worldCenter);
    const len = dirToCam.length();
    if (len > 1e-4) dirToCam.divideScalar(len);
    else dirToCam.set(0, 1, 0);

    const distance = Math.max(
      cubeSize * SINGLE_CUBE_FRAME_FACTOR,
      bounds.worldRadius * MULTI_CUBE_FRAME_FACTOR,
    );
    const camTo = bounds.worldCenter.clone().addScaledVector(dirToCam, distance);

    controls.minDistance = 0.5;
    controls.maxDistance = Math.max(cubeSize * 10, bounds.worldRadius * 8);
    tweenCamera(camera, controls, camTo, bounds.worldCenter, ENTER_TWEEN_MS);
  }

  /**
   * Sets a galaxy-wide clipping plane in front of the selection so foreground
   * stars don't mask the inspected cubes. Plane offset scales with bbox radius
   * to handle the multi-cube case without clipping the back rows.
   */
  function updateFrontClippingPlane(worldCenter: THREE.Vector3, worldRadius: number): void {
    const dir = worldCenter.clone().sub(camera.position);
    const len = dir.length();
    if (len < 1e-4) return;
    dir.divideScalar(len);

    const offset = Math.max(galaxyData.opts.cubeSize * 0.6, worldRadius * 1.05);
    const planePoint = worldCenter.clone().addScaledVector(dir, -offset);
    galaxyScene.setClipping(true, dir, planePoint);
  }

  return {
    isActive,
    activeCubes: () => active?.cubes ?? [],
    enter,
    exit,
    update,
    starAtPointer,
    showHoverRing,
    hideHoverRing,
  };
}
