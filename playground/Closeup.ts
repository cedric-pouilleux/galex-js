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

export type CloseupDeps = {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  galaxyData: GalaxyData;
  galaxyScene: GalaxyScene;
};

export type Closeup = {
  isActive(): boolean;
  enter(cube: Cube, opts?: { highlight?: CloseupHighlight | null }): void;
  exit(opts?: { instant?: boolean }): void;
  update(time: number): void;
  starAtPointer(pointer: THREE.Vector2): { index: number; name: string; temp: number | null } | null;
  showHoverRing(starIndex: number): void;
  hideHoverRing(): void;
};

type ActiveState = {
  cube: Cube;
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
export function createCloseup({
  camera,
  controls,
  galaxyData,
  galaxyScene,
}: CloseupDeps): Closeup {
  let active: ActiveState | null = null;

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points!.threshold = 0.18;

  const hoverRing = createHoverRing();

  function isActive(): boolean {
    return active !== null;
  }

  function enter(cube: Cube, { highlight = null }: { highlight?: CloseupHighlight | null } = {}): void {
    if (active) exit({ instant: true });

    const { cubeSize } = galaxyData.opts;
    const center = galaxyData.grid.cubeToWorldCenter(cube.i, cube.j, cube.k);

    const field = prepareCloseupField(cube, galaxyData, highlight);
    if (field) galaxyScene.object3D.add(field.points);

    const savedCamPos = camera.position.clone();
    const savedTarget = controls.target.clone();
    const savedMin = controls.minDistance;
    const savedMax = controls.maxDistance;

    // Camera positions are in world space — compose with the galaxy group
    // matrix so the tween lands on the actual on-screen cube.
    const worldCenter = new THREE.Vector3(center.x, center.y, center.z);
    galaxyScene.object3D.updateMatrixWorld();
    worldCenter.applyMatrix4(galaxyScene.object3D.matrixWorld);

    const dirToCam = camera.position.clone().sub(worldCenter);
    const len = dirToCam.length();
    if (len > 1e-4) dirToCam.divideScalar(len);
    else dirToCam.set(0, 1, 0);
    const camTo = worldCenter.clone().addScaledVector(dirToCam, cubeSize * 1.8);

    controls.minDistance = 0.5;
    controls.maxDistance = cubeSize * 10;

    tweenCamera(camera, controls, camTo, worldCenter, 700);

    galaxyScene.setDimming(0.03);

    galaxyScene.object3D.add(hoverRing.object);
    hoverRing.hide();

    active = { cube, field, savedCamPos, savedTarget, savedMin, savedMax };
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
      tweenCamera(camera, controls, a.savedCamPos, a.savedTarget, 500);
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
      if (mat.uniforms && mat.uniforms.uTime) {
        mat.uniforms.uTime.value = time;
      }
    }

    // Clipping plane: anything closer to the camera than the cube's front face
    // is discarded — keeps foreground stars from masking the inspected cube.
    const cube = active.cube;
    const c = galaxyData.grid.cubeToWorldCenter(cube.i, cube.j, cube.k);
    const worldCenter = new THREE.Vector3(c.x, c.y, c.z);
    galaxyScene.object3D.updateMatrixWorld();
    worldCenter.applyMatrix4(galaxyScene.object3D.matrixWorld);

    const dir = worldCenter.clone().sub(camera.position);
    const len = dir.length();
    if (len < 1e-4) return;
    dir.divideScalar(len);

    const cs = galaxyData.opts.cubeSize;
    const planePoint = worldCenter.clone().addScaledVector(dir, -cs * 0.6);
    galaxyScene.setClipping(true, dir, planePoint);
  }

  function starAtPointer(pointer: THREE.Vector2): { index: number; name: string; temp: number | null } | null {
    if (!active || !active.field) return null;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(active.field.points, false);
    if (hits.length === 0) return null;
    const idx = hits[0].index!;
    return {
      index: idx,
      name: active.field.names[idx],
      temp: active.field.temps[idx],
    };
  }

  function showHoverRing(starIndex: number): void {
    if (!active || !active.field) return;
    const temp = active.field.temps[starIndex];
    hoverRing.showOn(active.field.points, starIndex, camera, temp);
  }

  function hideHoverRing(): void {
    hoverRing.hide();
  }

  return {
    isActive,
    enter,
    exit,
    update,
    starAtPointer,
    showHoverRing,
    hideHoverRing,
  };
}
