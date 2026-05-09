import * as THREE from 'three';
import type { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type { GalaxyWorld } from './World.js';
import type { Fog } from './Fog.js';
import type { PlanView } from './PlanView.js';
import type { Hud } from './HUD.js';
import type { Picker } from './Picker.js';
import { updateOrbitHover, updateCloseupHover } from './Hover.js';

const IDLE_ROTATION_PER_FRAME = 0.0004;

export type RenderLoopDeps = {
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
  scene: THREE.Scene;
  hud: Hud;
  fog: Fog;
  planView: PlanView;
  picker: Picker;
  canvas: HTMLCanvasElement;
  starTooltip: HTMLElement;
  perspectiveCamera: THREE.PerspectiveCamera;
  perspectiveControls: { update(): void; target: THREE.Vector3 };
  orthoCamera: THREE.OrthographicCamera;
  orthoControls: { update(): void; target: THREE.Vector3; enabled: boolean };
  orthoCamY: number;
  /** Live ref to the current galaxy world — refreshed by the regen pipeline. */
  getCurrentWorld: () => GalaxyWorld;
};

/**
 * Boots the render loop. Reads the current galaxy world via `getCurrentWorld()`
 * each frame so a regen swap is picked up without restarting the loop.
 */
export function startRenderLoop(deps: RenderLoopDeps): void {
  const {
    renderer, labelRenderer, scene, hud, fog, planView, picker, canvas, starTooltip,
    perspectiveCamera, perspectiveControls, orthoCamera, orthoControls, orthoCamY,
    getCurrentWorld,
  } = deps;

  const playerWorldCenter = new THREE.Vector3();
  const tStart = performance.now();
  const activeCamera = () => planView.active ? orthoCamera : perspectiveCamera;
  const activeControls = () => planView.active ? orthoControls : perspectiveControls;

  function frame(): void {
    const t = (performance.now() - tStart) / 1000;
    const world = getCurrentWorld();
    const { closeup, galaxyData, galaxyScene, player, hoverWire } = world;
    closeup.update(t);

    if (fog.active && !closeup.isActive()) {
      const c = galaxyData.grid.cubeToWorldCenter(player.cube.i, player.cube.j, player.cube.k);
      playerWorldCenter.set(c.x, c.y, c.z);
      galaxyScene.object3D.updateMatrixWorld();
      playerWorldCenter.applyMatrix4(galaxyScene.object3D.matrixWorld);
      if (planView.active) {
        orthoControls.target.set(playerWorldCenter.x, 0, playerWorldCenter.z);
        orthoCamera.position.set(playerWorldCenter.x, orthoCamY, playerWorldCenter.z);
      } else {
        perspectiveControls.target.copy(playerWorldCenter);
      }
    }

    activeControls().update();
    if (planView.active) {
      // Wheel-driven ortho zoom changes — re-apply each frame so sprites track
      // (cheap, 4 uniforms).
      galaxyScene.setOrthoSize(orthoCamera.zoom);
    }

    if (closeup.isActive()) {
      updateCloseupHover({ picker, hud, closeup, starTooltip });
    } else {
      updateOrbitHover({
        picker, hud, fog, canvas,
        hoverWire: world.hoverWire,
        hoverLabel: world.hoverLabel,
        galaxyData, galaxyScene, player,
        activeCamera: activeCamera(),
      });
    }

    // Idle slow-rotation only when the user isn't hovering a clickable cube and
    // no dynamic mode is active.
    if (!hoverWire.visible && !closeup.isActive() && !fog.active && !planView.active) {
      galaxyScene.object3D.rotation.y += IDLE_ROTATION_PER_FRAME;
    }

    const cam = activeCamera();
    renderer.render(scene, cam);
    labelRenderer.render(scene, cam);
    hud.tick();
    requestAnimationFrame(frame);
  }
  frame();
}
