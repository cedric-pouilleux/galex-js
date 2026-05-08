import * as THREE from 'three';
import { createVisibilityFieldLines } from '../view/GridHelper.js';
import type { GalaxyData } from '../core/GalaxyData.js';
import type { Cube } from '../core/CubeGrid.js';
import type { GalaxyScene } from '../view/GalaxyScene.js';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const FOG_GRID_OPACITY_NORMAL = [0.22, 0.045];
const FOG_GRID_OPACITY_PLAN   = [0.6,  0.18];

const ENTER_TWEEN_MS = 600;

export type FogPlayer = { cube: Cube };

export type FogWorld = {
  galaxyData: GalaxyData;
  galaxyScene: GalaxyScene;
  player: FogPlayer;
  occupiedLines: THREE.LineSegments;
};

export type FogCameras = {
  perspectiveCamera: THREE.PerspectiveCamera;
  perspectiveControls: OrbitControls;
  orthoControls: OrbitControls;
};

export type FogStatus = 'visible' | 'faded' | 'hidden';

export type Fog = {
  active: boolean;
  range: number;
  enable(world: FogWorld, cameras: FogCameras, planViewActive: boolean): void;
  disable(world: FogWorld, cameras: FogCameras, occupiedLinesVisibleAfter: boolean): void;
  rebuild(world: FogWorld, planViewActive: boolean): void;
  setPlanViewBoost(active: boolean): void;
  status(cube: Cube | null | undefined, player: FogPlayer): FogStatus;
  setGridVisible(visible: boolean): void;
  disposeGrid(galaxyScene: GalaxyScene): void;
};

/**
 * Visibility-field state machine for the playground. Owns the wireframe grid
 * around the player + the camera tween that focuses on the player on enable.
 *
 * The lib itself doesn't know about "fog of war" — this composer wraps the
 * neutral `setVisibilityField` + `createVisibilityFieldLines` primitives with
 * a player-centric focal.
 */
export function createFog(): Fog {
  const state = {
    active: false,
    range: 2,
    grid: null as THREE.Group | null,
  };

  function enable(world: FogWorld, cameras: FogCameras, planViewActive: boolean): void {
    state.active = true;
    fog.active = true;
    world.galaxyScene.setHaloVisible(false);
    world.occupiedLines.visible = false;
    cameras.perspectiveControls.enablePan = false;
    cameras.orthoControls.enablePan = false;

    rebuild(world, planViewActive);
    tweenCameraToPlayer(world, cameras);
  }

  function disable(world: FogWorld, cameras: FogCameras, occupiedLinesVisibleAfter: boolean): void {
    state.active = false;
    fog.active = false;
    world.galaxyScene.setVisibilityField(null);
    world.galaxyScene.setHaloVisible(true);
    world.occupiedLines.visible = occupiedLinesVisibleAfter;
    cameras.perspectiveControls.enablePan = true;
    cameras.orthoControls.enablePan = true;
    disposeGrid(world.galaxyScene);
  }

  function rebuild(world: FogWorld, planViewActive: boolean): void {
    if (!state.active) return;
    const focals = [world.player.cube];
    world.galaxyScene.setVisibilityField({ focals, range: state.range });
    disposeGrid(world.galaxyScene);
    state.grid = createVisibilityFieldLines(world.galaxyData.grid, focals, { range: state.range });
    world.galaxyScene.object3D.add(state.grid);
    setPlanViewBoost(planViewActive);
  }

  /** Per-tier opacity boost when the orthographic plan view is active. */
  function setPlanViewBoost(active: boolean): void {
    if (!state.grid) return;
    const op = active ? FOG_GRID_OPACITY_PLAN : FOG_GRID_OPACITY_NORMAL;
    state.grid.children.forEach((seg, i) => {
      const mat = (seg as THREE.LineSegments).material as THREE.LineBasicMaterial;
      mat.opacity = op[i] ?? op[0];
    });
  }

  /** Returns 'visible' | 'faded' | 'hidden' for a given cube under the current fog. */
  function status(cube: Cube | null | undefined, player: FogPlayer): FogStatus {
    if (!state.active || !cube) return 'visible';
    const di = cube.i - player.cube.i;
    const dk = cube.k - player.cube.k;
    const d2 = di * di + dk * dk;
    const inner = state.range - 1 > 0 ? state.range - 1 : 0;
    if (d2 > state.range * state.range) return 'hidden';
    if (d2 > inner * inner) return 'faded';
    return 'visible';
  }

  function setGridVisible(visible: boolean): void {
    if (state.grid) state.grid.visible = visible;
  }

  function disposeGrid(galaxyScene: GalaxyScene): void {
    if (!state.grid) return;
    galaxyScene.object3D.remove(state.grid);
    state.grid.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) (mesh.material as THREE.Material).dispose();
    });
    state.grid = null;
  }

  /**
   * Lerps the perspective camera target toward the player cube on fog enable.
   * Pure animation — no state retained beyond the current rAF chain.
   */
  function tweenCameraToPlayer(world: FogWorld, cameras: FogCameras): void {
    const { player, galaxyData, galaxyScene } = world;
    const { perspectiveCamera, perspectiveControls } = cameras;

    const center = galaxyData.grid.cubeToWorldCenter(player.cube.i, player.cube.j, player.cube.k);
    const worldCenter = new THREE.Vector3(center.x, center.y, center.z);
    galaxyScene.object3D.updateMatrixWorld();
    worldCenter.applyMatrix4(galaxyScene.object3D.matrixWorld);

    const fromTarget = perspectiveControls.target.clone();
    const fromCamPos = perspectiveCamera.position.clone();
    const camOffset = perspectiveCamera.position.clone().sub(perspectiveControls.target).multiplyScalar(0.35);
    const toCamPos = worldCenter.clone().add(camOffset);
    const t0 = performance.now();

    function tick() {
      const t = Math.min(1, (performance.now() - t0) / ENTER_TWEEN_MS);
      const e = 1 - Math.pow(1 - t, 3);
      perspectiveControls.target.lerpVectors(fromTarget, worldCenter, e);
      perspectiveCamera.position.lerpVectors(fromCamPos, toCamPos, e);
      if (t < 1) requestAnimationFrame(tick);
    }
    tick();
  }

  const fog: Fog = {
    active: false,
    range: 2,
    enable,
    disable,
    rebuild,
    setPlanViewBoost,
    status,
    setGridVisible,
    disposeGrid,
  };
  // Keep the internal range mirrored when the host writes fog.range.
  Object.defineProperty(fog, 'range', {
    get: () => state.range,
    set: (v: number) => { state.range = v; },
    enumerable: true,
  });
  return fog;
}
