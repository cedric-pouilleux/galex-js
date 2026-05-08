import * as THREE from 'three';
import type { GalaxyData } from '../core/GalaxyData.js';
import type { GalaxyScene } from '../view/GalaxyScene.js';
import type { CubeMarker } from '../view/CubeMarker.js';
import type { Cube } from '../core/CubeGrid.js';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Fog } from './Fog.js';
import type { Hud } from './HUD.js';
import type { Closeup } from './Closeup.js';

const GAS_PLAN_DIM = 0.45;
const GRID_OPACITY_NORMAL = 0.22;
const GRID_OPACITY_PLAN = 0.6;

export type PlanViewWorld = {
  galaxyData: GalaxyData;
  galaxyScene: GalaxyScene;
  player: { cube: Cube };
  playerMarker: CubeMarker;
  occupiedLines: THREE.LineSegments;
  closeup: Closeup;
};

export type PlanViewCameras = {
  perspectiveCamera: THREE.PerspectiveCamera;
  perspectiveControls: OrbitControls;
  orthoCamera: THREE.OrthographicCamera;
  orthoControls: OrbitControls;
  orthoCamY: number;
};

export type PlanView = {
  active: boolean;
  set(active: boolean, world: PlanViewWorld, cameras: PlanViewCameras, fog: Fog, hud: Hud): void;
};

/**
 * Top-down 2D plan view toggle. Owns the active flag and orchestrates the
 * camera swap, the orthographic framing and the visual adjustments needed
 * for the gas/grid layers to read correctly when seen from above.
 */
export function createPlanView(): PlanView {
  const view: PlanView = { active: false, set };

  function set(active: boolean, world: PlanViewWorld, cameras: PlanViewCameras, fog: Fog, hud: Hud): void {
    if (view.active === active) return;
    if (world.closeup.isActive()) world.closeup.exit({ instant: true });
    view.active = active;

    if (active) {
      // Stop the slow rotation idle so the disk is presented flat.
      world.galaxyScene.object3D.rotation.y = 0;

      // Frame the ortho camera on the player when the fog is on, otherwise on
      // the world centre.
      const center = fog.active
        ? world.galaxyData.grid.cubeToWorldCenter(world.player.cube.i, world.player.cube.j, world.player.cube.k)
        : { x: 0, y: 0, z: 0 };
      cameras.orthoControls.target.set(center.x, 0, center.z);
      cameras.orthoCamera.position.set(center.x, cameras.orthoCamY, center.z);
      cameras.orthoCamera.zoom = 1;
      cameras.orthoCamera.updateProjectionMatrix();
      cameras.orthoControls.enablePan = !fog.active;

      cameras.perspectiveControls.enabled = false;
      cameras.orthoControls.enabled = true;
      world.galaxyScene.setOrthoSize(cameras.orthoCamera.zoom);
      setGridBoost(true, world.occupiedLines);
      fog.setPlanViewBoost(true);
      // Top-down view: gas dominates visually because perspective no longer
      // occludes it; fade it so the stars and grid stay readable.
      world.galaxyScene.setGasDim(GAS_PLAN_DIM);
      world.playerMarker.setPlanView(true);
      hud.setMode('plateau 2D');
    } else {
      cameras.perspectiveControls.enabled = true;
      cameras.orthoControls.enabled = false;
      world.galaxyScene.setOrthoSize(0);
      setGridBoost(false, world.occupiedLines);
      fog.setPlanViewBoost(false);
      world.galaxyScene.setGasDim(1.0);
      world.playerMarker.setPlanView(false);
      hud.setMode(world.closeup.isActive() ? 'gros plan' : 'orbite');
    }
  }

  /**
   * Boosts the cube wireframe opacity from above — the dark default lines get
   * lost in the background otherwise.
   */
  function setGridBoost(active: boolean, occupiedLines: THREE.LineSegments | null): void {
    if (!occupiedLines) return;
    (occupiedLines.material as THREE.LineBasicMaterial).opacity = active ? GRID_OPACITY_PLAN : GRID_OPACITY_NORMAL;
  }

  return view;
}
