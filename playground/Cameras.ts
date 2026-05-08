import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ORTHO_HALF_HEIGHT = 60;
const ORTHO_CAM_Y = 300;

export type CameraSetup<TCamera extends THREE.Camera = THREE.Camera> = {
  camera: TCamera;
  controls: OrbitControls;
};

export type PlaygroundCameras = {
  perspective: CameraSetup<THREE.PerspectiveCamera>;
  ortho: CameraSetup<THREE.OrthographicCamera>;
  orthoHalfHeight: number;
  orthoCamY: number;
  resize(width: number, height: number): void;
};

/**
 * Builds the two cameras used by the playground (free-orbit + ortho top-down)
 * with their OrbitControls. The ortho controls start disabled — the caller
 * toggles them when entering plan view.
 */
export function createCameras(canvas: HTMLElement): PlaygroundCameras {
  const aspect = window.innerWidth / window.innerHeight;

  const perspectiveCamera = new THREE.PerspectiveCamera(55, aspect, 0.1, 2000);
  perspectiveCamera.position.set(0, 70, 70);

  const perspectiveControls = new OrbitControls(perspectiveCamera, canvas);
  perspectiveControls.enableDamping = true;
  perspectiveControls.dampingFactor = 0.08;
  perspectiveControls.minDistance = 4;
  perspectiveControls.maxDistance = 280;
  perspectiveControls.target.set(0, 0, 0);

  const orthoCamera = new THREE.OrthographicCamera(
    -ORTHO_HALF_HEIGHT * aspect, ORTHO_HALF_HEIGHT * aspect,
    ORTHO_HALF_HEIGHT, -ORTHO_HALF_HEIGHT,
    0.1, 1000,
  );
  orthoCamera.up.set(0, 0, -1);
  orthoCamera.position.set(0, ORTHO_CAM_Y, 0);
  orthoCamera.lookAt(0, 0, 0);

  const orthoControls = new OrbitControls(orthoCamera, canvas);
  orthoControls.enableDamping = true;
  orthoControls.dampingFactor = 0.08;
  orthoControls.enableRotate = false;
  orthoControls.screenSpacePanning = true;
  orthoControls.minZoom = 0.4;
  orthoControls.maxZoom = 8;
  orthoControls.zoomSpeed = 1.2;
  orthoControls.target.set(0, 0, 0);
  orthoControls.enabled = false;

  function resize(width: number, height: number): void {
    const a = width / height;
    perspectiveCamera.aspect = a;
    perspectiveCamera.updateProjectionMatrix();
    orthoCamera.left = -ORTHO_HALF_HEIGHT * a;
    orthoCamera.right = ORTHO_HALF_HEIGHT * a;
    orthoCamera.top = ORTHO_HALF_HEIGHT;
    orthoCamera.bottom = -ORTHO_HALF_HEIGHT;
    orthoCamera.updateProjectionMatrix();
  }

  return {
    perspective: { camera: perspectiveCamera, controls: perspectiveControls },
    ortho: { camera: orthoCamera, controls: orthoControls },
    orthoHalfHeight: ORTHO_HALF_HEIGHT,
    orthoCamY: ORTHO_CAM_Y,
    resize,
  };
}
