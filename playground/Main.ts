import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { createHud } from './HUD.js';
import { setThickLineResolution } from '../view/GridHelper.js';
import { createCameras } from './Cameras.js';
import { createPicker } from './Picker.js';
import { setupGenPanel } from './GenPanel.js';
import { createFog } from './Fog.js';
import { createPlanView } from './PlanView.js';
import { createGalaxyWorld, disposeGalaxyWorld } from './World.js';
import type { GalaxyWorld, GalaxyWorldOptions } from './World.js';
import { updateOrbitHover, updateCloseupHover } from './Hover.js';
import { PLAYER_HIGHLIGHT_RGB } from './Player.js';

function elementById<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`main: missing element #${id}`);
  return el as T;
}

// ─── DOM + renderer setup ───────────────────────────────────────────────────

const canvas = elementById<HTMLCanvasElement>('view');
const starTooltip = elementById<HTMLElement>('starTooltip');
const seedEl = elementById<HTMLElement>('seedValue');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0x04060b, 1);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.id = 'labels';
document.body.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x04060b, 0.0035);

const cameras = createCameras(canvas);
const { camera, controls } = cameras.perspective;
const { camera: orthoCamera, controls: orthoControls } = cameras.ortho;
const camerasBag = {
  perspectiveCamera: camera,
  perspectiveControls: controls,
  orthoCamera,
  orthoControls,
  orthoCamY: cameras.orthoCamY,
};

const fog = createFog();
const planView = createPlanView();
let restorePlanViewAfterCloseup = false;
const activeCamera = () => planView.active ? orthoCamera : camera;
const activeControls = () => planView.active ? orthoControls : controls;

const hud = createHud();
hud.setMode('orbite');

// ─── Galaxy world (rebuilt on regen) ────────────────────────────────────────

const urlSeed = new URLSearchParams(location.search).get('seed');
let currentWorld: GalaxyWorld = createGalaxyWorld(
  {
    count: 15000,
    radius: 50,
    cubeSize: 2,
    innerRadius: 4.5,
    minDistance: 0.25,
    seed: urlSeed ? Number(urlSeed) : null,
  },
  { scene, camera, controls, hud, seedEl },
);

if (!urlSeed) {
  const params = new URLSearchParams(location.search);
  params.set('seed', String(currentWorld.galaxyData.seed));
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

// ─── Closeup transition hooks ───────────────────────────────────────────────

function closeupOnShown(): void {
  // Closeup.enter dims the galaxy via setDimming. Hide the wireframes so the
  // inspected cube is the only thing in focus.
  currentWorld.occupiedLines.visible = false;
  fog.setGridVisible(false);
  currentWorld.hoverWire.visible = false;
  currentWorld.hoverLabel.visible = false;
  currentWorld.playerMarker.object3D.visible = false;
  hud.setMode('gros plan');
  hud.setHover(null);
  toggleGridEl.disabled = true;
}

function closeupOnHidden(): void {
  if (fog.active) {
    currentWorld.occupiedLines.visible = false;
    fog.setGridVisible(true);
  } else {
    currentWorld.occupiedLines.visible = toggleGridEl.checked;
  }
  currentWorld.playerMarker.object3D.visible = true;
  hud.setMode('orbite');
  hud.setStarName(null);
  starTooltip.style.display = 'none';
  toggleGridEl.disabled = false;

  // If closeup was opened from plan view, restore it on exit.
  if (restorePlanViewAfterCloseup) {
    restorePlanViewAfterCloseup = false;
    togglePlanViewEl.checked = true;
    planView.set(true, currentWorld, camerasBag, fog, hud);
  }
}

// ─── DOM event listeners ────────────────────────────────────────────────────

seedEl.addEventListener('click', async () => {
  const url = `${location.origin}${location.pathname}?seed=${currentWorld.galaxyData.seed}`;
  try {
    await navigator.clipboard.writeText(url);
    seedEl.classList.add('copied');
    const prev = seedEl.textContent;
    seedEl.textContent = 'copié !';
    setTimeout(() => {
      seedEl.classList.remove('copied');
      seedEl.textContent = prev;
    }, 1100);
  } catch {
    location.search = `?seed=${currentWorld.galaxyData.seed}`;
  }
});

const toggleGridEl = elementById<HTMLInputElement>('toggleGrid');
toggleGridEl.addEventListener('change', () => {
  if (!fog.active) currentWorld.occupiedLines.visible = toggleGridEl.checked;
});

const fogRangeEl = elementById<HTMLInputElement>('fogRange');
const fogRangeValueEl = elementById<HTMLElement>('fogRangeValue');
const fogRangeRowEl = elementById<HTMLElement>('fogRangeRow');
fog.range = Number(fogRangeEl.value);
fogRangeValueEl.textContent = String(fog.range);

const toggleFogEl = elementById<HTMLInputElement>('toggleFog');
toggleFogEl.addEventListener('change', () => {
  if (currentWorld.closeup.isActive()) {
    currentWorld.closeup.exit({ instant: true });
    closeupOnHidden();
  }
  if (toggleFogEl.checked) {
    fog.enable(currentWorld, camerasBag, planView.active);
    fogRangeRowEl.classList.add('active');
  } else {
    fog.disable(currentWorld, camerasBag, toggleGridEl.checked);
    fogRangeRowEl.classList.remove('active');
  }
});

const togglePlanViewEl = elementById<HTMLInputElement>('togglePlanView');
togglePlanViewEl.addEventListener('change', () => {
  planView.set(togglePlanViewEl.checked, currentWorld, camerasBag, fog, hud);
});

fogRangeEl.addEventListener('input', () => {
  fog.range = Number(fogRangeEl.value);
  fogRangeValueEl.textContent = String(fog.range);
  fog.rebuild(currentWorld, planView.active);
});

window.addEventListener('resize', () => {
  cameras.resize(window.innerWidth, window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  setThickLineResolution(window.innerWidth, window.innerHeight);
});
setThickLineResolution(window.innerWidth, window.innerHeight);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && currentWorld.closeup.isActive()) {
    currentWorld.closeup.exit();
    closeupOnHidden();
  }
});

// ─── Picker + click ─────────────────────────────────────────────────────────

const picker = createPicker(canvas);
canvas.addEventListener('pointerleave', () => {
  starTooltip.style.display = 'none';
});
picker.bindPointerEvents({ onClick: handleCanvasClick });

function handleCanvasClick(): void {
  const { closeup, galaxyScene, galaxyData, player } = currentWorld;
  if (closeup.isActive()) return;
  const cube = picker.pickCube(activeCamera(), galaxyScene.object3D, galaxyData.grid);
  if (!cube) return;
  // Fog: only fully-visible cubes are clickable.
  if (fog.status(cube, player) !== 'visible') return;
  // Closeup uses the perspective camera. From plan view, swap first, then open
  // — restored on closeup exit (see closeupOnHidden).
  if (planView.active) {
    restorePlanViewAfterCloseup = true;
    planView.set(false, currentWorld, camerasBag, fog, hud);
  }
  closeup.enter(cube, {
    highlight: {
      index: player.star,
      color: PLAYER_HIGHLIGHT_RGB,
      label: `${player.name} (vous)`,
    },
  });
  closeupOnShown();
}

// ─── Generation panel ───────────────────────────────────────────────────────

const genPanel = setupGenPanel({ onRequestRegen: regenerateGalaxy });

let regenInProgress = false;
function regenerateGalaxy({ newSeed = false }: { newSeed?: boolean } = {}): void {
  if (regenInProgress) return;
  regenInProgress = true;
  const wasFog = fog.active;
  const wasPlanView = planView.active;
  // Exit dynamic modes before tearing down — restored after rebuild.
  if (wasPlanView) planView.set(false, currentWorld, camerasBag, fog, hud);
  if (wasFog) {
    fog.disable(currentWorld, camerasBag, toggleGridEl.checked);
    fogRangeRowEl.classList.remove('active');
  }

  const opts: GalaxyWorldOptions = genPanel.readOpts();
  opts.seed = newSeed ? null : currentWorld.galaxyData.seed;

  genPanel.setBusy(true);
  genPanel.setStatus('génération…');

  // Yield to the browser so the status text paints before the blocking work.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const t0 = performance.now();
    fog.disposeGrid(currentWorld.galaxyScene);
    disposeGalaxyWorld(currentWorld, scene);
    currentWorld = createGalaxyWorld(opts, { scene, camera, controls, hud, seedEl });
    const dt = Math.round(performance.now() - t0);

    const params = new URLSearchParams(location.search);
    params.set('seed', String(currentWorld.galaxyData.seed));
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);

    currentWorld.occupiedLines.visible = toggleGridEl.checked;
    if (wasFog) {
      toggleFogEl.checked = true;
      fog.enable(currentWorld, camerasBag, planView.active);
      fogRangeRowEl.classList.add('active');
    }
    if (wasPlanView) {
      togglePlanViewEl.checked = true;
      planView.set(true, currentWorld, camerasBag, fog, hud);
    }

    genPanel.setStatus(`${currentWorld.galaxyData.data.count.toLocaleString('fr-FR')} étoiles · ${dt} ms`);
    genPanel.setBusy(false);
    regenInProgress = false;
  }));
}

// ─── Render loop ────────────────────────────────────────────────────────────

const playerWorldCenter = new THREE.Vector3();
const tStart = performance.now();

function animate(): void {
  const t = (performance.now() - tStart) / 1000;
  const { closeup, galaxyData, galaxyScene, player, hoverWire } = currentWorld;
  closeup.update(t);

  if (fog.active && !closeup.isActive()) {
    const c = galaxyData.grid.cubeToWorldCenter(player.cube.i, player.cube.j, player.cube.k);
    playerWorldCenter.set(c.x, c.y, c.z);
    galaxyScene.object3D.updateMatrixWorld();
    playerWorldCenter.applyMatrix4(galaxyScene.object3D.matrixWorld);
    if (planView.active) {
      orthoControls.target.set(playerWorldCenter.x, 0, playerWorldCenter.z);
      orthoCamera.position.set(playerWorldCenter.x, camerasBag.orthoCamY, playerWorldCenter.z);
    } else {
      controls.target.copy(playerWorldCenter);
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
      hoverWire: currentWorld.hoverWire,
      hoverLabel: currentWorld.hoverLabel,
      galaxyData, galaxyScene, player,
      activeCamera: activeCamera(),
    });
  }

  // Idle slow-rotation only when the user isn't hovering a clickable cube and
  // no dynamic mode is active.
  if (!hoverWire.visible && !closeup.isActive() && !fog.active && !planView.active) {
    galaxyScene.object3D.rotation.y += 0.0004;
  }

  const cam = activeCamera();
  renderer.render(scene, cam);
  labelRenderer.render(scene, cam);
  hud.tick();
  requestAnimationFrame(animate);
}
animate();
