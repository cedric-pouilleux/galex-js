import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { createHud } from './HUD.js';
import { setThickLineResolution } from '../view/GridHelper.js';
import { createCameras } from './Cameras.js';
import { createPicker } from './Picker.js';
import { setupGenPanel } from './GenPanel.js';
import { createFog } from './Fog.js';
import { createPlanView } from './PlanView.js';
import { createGalaxyWorld } from './World.js';
import type { GalaxyWorld } from './World.js';
import { PLAYER_HIGHLIGHT_RGB } from './Player.js';
import { startRenderLoop } from './RenderLoop.js';
import { createRegenerate } from './Regenerate.js';
import { createMeasureTool } from './MeasureTool.js';
import { createRectSelection } from './RectSelection.js';
import type { Cube } from '../core/CubeGrid.js';

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

function currentHudMode(): string {
  if (measureTool.isEnabled()) {
    return currentWorld.closeup.isActive() ? 'mesure étoiles' : 'mesure';
  }
  if (currentWorld.closeup.isActive()) return 'gros plan';
  if (planView.active) return 'plateau';
  return 'orbite';
}

/** Crosshair wherever precise pointing matters (closeup star picking, measure tool). */
function updateCanvasCursor(): void {
  const precise = currentWorld.closeup.isActive() || measureTool.isEnabled();
  canvas.classList.toggle('crosshair', precise);
}

function closeupOnShown(): void {
  // Closeup.enter dims the galaxy via setDimming. Hide the wireframes so the
  // inspected cube is the only thing in focus.
  currentWorld.occupiedLines.visible = false;
  fog.setGridVisible(false);
  currentWorld.hoverWire.visible = false;
  currentWorld.hoverLabel.visible = false;
  currentWorld.playerMarker.object3D.visible = false;
  hud.setMode(currentHudMode());
  hud.setHover(null);
  toggleGridEl.disabled = true;
  updateCanvasCursor();
}

function closeupOnHidden(): void {
  if (fog.active) {
    currentWorld.occupiedLines.visible = false;
    fog.setGridVisible(true);
  } else {
    currentWorld.occupiedLines.visible = toggleGridEl.checked;
  }
  currentWorld.playerMarker.object3D.visible = true;
  hud.setMode(currentHudMode());
  hud.setStarName(null);
  // The live A↔hover segment is scoped to the close-up — drop the hover B
  // when leaving so it doesn't freeze on the last hovered star.
  measureTool.setHoveredStar(currentWorld.galaxyData, null);
  starTooltip.style.display = 'none';
  toggleGridEl.disabled = false;
  updateCanvasCursor();

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
    fog.disable(currentWorld, toggleGridEl.checked, camerasBag);
    fogRangeRowEl.classList.remove('active');
  }
});

const togglePlanViewEl = elementById<HTMLInputElement>('togglePlanView');
togglePlanViewEl.addEventListener('change', () => {
  planView.set(togglePlanViewEl.checked, currentWorld, camerasBag, fog, hud);
});

// ─── Distance measurement tool ──────────────────────────────────────────────

function isStarInVisibleCube(starIndex: number): boolean {
  const { galaxyData, player } = currentWorld;
  const { positions } = galaxyData.data;
  const { i, j, k } = galaxyData.grid.worldToCube(
    positions[starIndex * 3], positions[starIndex * 3 + 1], positions[starIndex * 3 + 2],
  );
  return fog.status(galaxyData.grid.get(i, j, k), player) === 'visible';
}

const measureTool = createMeasureTool({
  onPathComputed: (cubes) => currentWorld.closeup.isActive() && currentWorld.closeup.setTrajectoryCubes(cubes),
  onPathCleared:  ()      => currentWorld.closeup.isActive() && currentWorld.closeup.setTrajectoryCubes([]),
  isStarMeasurable: isStarInVisibleCube,
  onFocusTrajectory: (info) => {
    if (currentWorld.closeup.isActive()) currentWorld.closeup.refocus(info.cubes);
    else openCloseupForCubes(info.cubes);
  },
});
// Parented to galaxyScene so the markers track the galaxy's idle rotation —
// re-parented after every regen (see setCurrentWorld below).
currentWorld.galaxyScene.object3D.add(measureTool.object3D);
measureTool.setResolution(window.innerWidth, window.innerHeight);

const toggleMeasureEl = elementById<HTMLInputElement>('toggleMeasure');
const measureOptionsEl = elementById<HTMLElement>('measureOptionsRow');
const measureRangeEl = elementById<HTMLInputElement>('measureRange');
const measureRangeValueEl = elementById<HTMLElement>('measureRangeValue');
const measureRangeRowEl = elementById<HTMLElement>('measureRangeRow');
const measureModeRadios = Array.from(
  document.querySelectorAll<HTMLInputElement>('input[name="measureMode"]'),
);

function syncMeasureRangeUi(): void {
  const value = Number(measureRangeEl.value);
  measureRangeValueEl.textContent = `${value} al`;
  // The slider is only meaningful in 'path' sub-mode; dim it otherwise.
  const inPathMode = measureTool.starMode() === 'path';
  measureRangeRowEl.classList.toggle('disabled', !inPathMode);
}

toggleMeasureEl.addEventListener('change', () => {
  measureTool.setEnabled(toggleMeasureEl.checked);
  measureOptionsEl.classList.toggle('active', toggleMeasureEl.checked);
  hud.setMode(currentHudMode());
  updateCanvasCursor();
});

for (const radio of measureModeRadios) {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    measureTool.setStarMode(radio.value === 'path' ? 'path' : 'direct');
    syncMeasureRangeUi();
  });
}

measureTool.setPathRangeLightYears(currentWorld.galaxyData, Number(measureRangeEl.value));
measureRangeEl.addEventListener('input', () => {
  const value = Number(measureRangeEl.value);
  measureRangeValueEl.textContent = `${value} al`;
  measureTool.setPathRangeLightYears(currentWorld.galaxyData, value);
});
syncMeasureRangeUi();

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
  measureTool.setResolution(window.innerWidth, window.innerHeight);
});
setThickLineResolution(window.innerWidth, window.innerHeight);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && currentWorld.closeup.isActive()) {
    currentWorld.closeup.exit();
    closeupOnHidden();
  }
});

// ─── Pointer interactions ───────────────────────────────────────────────────

const picker = createPicker(canvas);
canvas.addEventListener('pointerleave', () => {
  starTooltip.style.display = 'none';
});
// Right-button drives orbit rotation — suppress the native context menu so
// the drag isn't cut short.
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
picker.bindPointerEvents({ onClick: handleCanvasClick });

/**
 * Wires the player home star as a highlight inside any close-up. Silent when
 * the home star isn't part of the selection (handled by `prepareCloseupField`).
 */
function playerHighlight() {
  const { player } = currentWorld;
  return {
    index: player.star,
    color: PLAYER_HIGHLIGHT_RGB,
    label: `${player.name} (vous)`,
  };
}

/**
 * Shared entry point for the single-cube click and the rect-selection release.
 * Forces a swap back to the perspective camera (close-up is perspective-only)
 * before opening; plan view is restored on close-up exit (see closeupOnHidden).
 */
function openCloseupForCubes(cubes: readonly Cube[]): void {
  if (cubes.length === 0) return;
  if (planView.active) {
    restorePlanViewAfterCloseup = true;
    planView.set(false, currentWorld, camerasBag, fog, hud);
  }
  currentWorld.closeup.enter(cubes, { highlight: playerHighlight() });
  closeupOnShown();
}

/** A short tap routes here from the picker — never used for drags. */
function handleCanvasClick(): void {
  const { closeup, galaxyScene, galaxyData, player } = currentWorld;

  // In close-up, clicks pick individual stars for the measurement tool.
  if (closeup.isActive()) {
    if (!measureTool.isEnabled()) return;
    const star = closeup.starAtPointer(picker.pointer);
    if (star) measureTool.pickStar(galaxyData, star.globalIndex);
    return;
  }

  const cube = picker.pickCube(activeCamera(), galaxyScene.object3D, galaxyData.grid);
  if (!cube) return;
  // Fog: only fully-visible cubes are interactive.
  if (fog.status(cube, player) !== 'visible') return;

  // Cube-to-cube measurement (orbit / plan view).
  if (measureTool.isEnabled()) {
    measureTool.pickCube(galaxyData, cube);
    return;
  }

  openCloseupForCubes([cube]);
}

/**
 * Drag started on a selectable cube → rectangular selection (anchor + current
 * highlighted bright, rectangle outline highlighted faint, close-up opened on
 * release for every cube inside the rectangle). Drag started on empty space
 * falls through to the orbit controls.
 */
const rectSelection = createRectSelection({
  canvas,
  controls,
  cubeSize: currentWorld.galaxyData.opts.cubeSize,
  parent: currentWorld.galaxyScene.object3D,
  pickCubeAt: (x, y) => {
    if (currentWorld.closeup.isActive()) return null;
    if (measureTool.isEnabled()) return null;
    const { galaxyScene, galaxyData, player } = currentWorld;
    const cube = picker.pickCubeAt(x, y, activeCamera(), galaxyScene.object3D, galaxyData.grid);
    if (!cube) return null;
    return fog.status(cube, player) === 'visible' ? cube : null;
  },
  cubeCenterAt: (i, j, k) => currentWorld.galaxyData.grid.cubeToWorldCenter(i, j, k),
  getSelectableCube: (i, j, k) => {
    const cube = currentWorld.galaxyData.grid.get(i, j, k);
    if (!cube) return null;
    return fog.status(cube, currentWorld.player) === 'visible' ? cube : null;
  },
});
rectSelection.bind({
  // The composable already suppresses the picker's click when the gesture
  // started on a cube — release is the single entry point even for one cube.
  onRelease: openCloseupForCubes,
});

// ─── Generation panel ───────────────────────────────────────────────────────

const genPanel = setupGenPanel({
  onRequestRegen: (arg) => {
    // Move long-lived overlays out of galaxyScene before the old world is disposed:
    // disposeObject3DTree would otherwise traverse and free their GPU resources.
    scene.attach(measureTool.object3D);
    rectSelection.clear();
    regenerate(arg);
  },
});

const regenerate = createRegenerate({
  scene,
  perspectiveCamera: camera,
  perspectiveControls: controls,
  orthoCamera,
  orthoControls,
  orthoCamY: cameras.orthoCamY,
  hud, seedEl, fog, planView, genPanel,
  toggleGridEl, toggleFogEl, togglePlanViewEl, fogRangeRowEl,
  getCurrentWorld: () => currentWorld,
  setCurrentWorld: (w) => {
    currentWorld = w;
    // Star indices from the previous galaxy are stale — drop any in-flight measurement,
    // then re-parent to the fresh galaxyScene so markers keep tracking the rotation.
    measureTool.clear();
    w.galaxyScene.object3D.add(measureTool.object3D);
    rectSelection.setParent(w.galaxyScene.object3D);
  },
});

// ─── Render loop ────────────────────────────────────────────────────────────

startRenderLoop({
  renderer, labelRenderer, scene, hud, fog, planView, picker, canvas, starTooltip,
  perspectiveCamera: camera,
  perspectiveControls: controls,
  orthoCamera,
  orthoControls,
  orthoCamY: cameras.orthoCamY,
  measureTool,
  getCurrentWorld: () => currentWorld,
});
