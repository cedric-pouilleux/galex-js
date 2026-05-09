import * as THREE from 'three';
import type { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import type { GalaxyData } from '../core/GalaxyData.js';
import type { GalaxyScene } from '../view/GalaxyScene.js';
import { setLabel } from './Labels.js';
import { spectralClass } from '../core/StarColor.js';
import type { Picker } from './Picker.js';
import type { Hud } from './HUD.js';
import type { Fog } from './Fog.js';
import type { Closeup } from './Closeup.js';
import type { Player } from './Player.js';

export type OrbitHoverContext = {
  picker: Picker;
  hud: Hud;
  fog: Fog;
  canvas: HTMLElement;
  hoverWire: LineSegments2;
  hoverLabel: CSS2DObject;
  galaxyData: GalaxyData;
  galaxyScene: GalaxyScene;
  player: Player;
  activeCamera: THREE.Camera;
};

/**
 * Updates the cube wireframe + label that follows the cursor in orbit/plan
 * view. Hides everything when the pointer leaves the canvas, when the picked
 * cube is masked by fog, or when no cube is hit.
 */
export function updateOrbitHover(ctx: OrbitHoverContext): void {
  const { picker, hud, fog, canvas, hoverWire, hoverLabel, galaxyData, galaxyScene, player, activeCamera } = ctx;
  if (!picker.pointerActive) {
    hoverWire.visible = false;
    hoverLabel.visible = false;
    hud.setHover(null);
    canvas.style.cursor = '';
    return;
  }
  const cube = picker.pickCube(activeCamera, galaxyScene.object3D, galaxyData.grid);
  if (!cube || fog.status(cube, player) !== 'visible') {
    hoverWire.visible = false;
    hoverLabel.visible = false;
    hud.setHover(null);
    canvas.style.cursor = '';
    return;
  }
  canvas.style.cursor = '';
  const { i, j, k } = cube;
  const count = cube.starIndices.length;
  const center = galaxyData.grid.cubeToWorldCenter(i, j, k);
  hoverWire.position.set(center.x, center.y, center.z);
  hoverWire.visible = true;
  hoverLabel.visible = true;
  setLabel(hoverLabel, i, k, count);
  hud.setHover({ i, k, count });
}

export type CloseupHoverContext = {
  picker: Picker;
  hud: Hud;
  closeup: Closeup;
  starTooltip: HTMLElement;
};

/**
 * Updates the star-name tooltip + hover ring during a close-up. Drives the
 * tooltip position from the raw client coordinates so it tracks the pointer
 * even when the canvas is offset on the page.
 */
export function updateCloseupHover(ctx: CloseupHoverContext): void {
  const { picker, hud, closeup, starTooltip } = ctx;
  if (!picker.pointerActive) {
    starTooltip.style.display = 'none';
    closeup.hideHoverRing();
    hud.setStarName(null);
    return;
  }
  const star = closeup.starAtPointer(picker.pointer);
  if (!star) {
    starTooltip.style.display = 'none';
    closeup.hideHoverRing();
    hud.setStarName(null);
    return;
  }
  const tempStr = star.temp
    ? `<div class="star-tooltip-temp">${spectralClass(star.temp)} · ${Math.round(star.temp).toLocaleString('fr-FR')} K</div>`
    : '';
  starTooltip.innerHTML =
    `<div class="star-tooltip-name">${star.name}</div>${tempStr}`;
  starTooltip.style.left = `${picker.pointerClientX}px`;
  starTooltip.style.top  = `${picker.pointerClientY}px`;
  starTooltip.style.display = 'block';
  closeup.showHoverRing(star.index);
  hud.setStarName(star.name);
}
