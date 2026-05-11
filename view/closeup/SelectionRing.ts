import * as THREE from 'three';

/** Half-size of the billboard quad in local units (the shader clips into a disc). */
const QUAD_HALF_SIZE = 0.5;

export type SelectionRingOptions = {
  /** Initial ring tint. Default white. */
  color?: THREE.ColorRepresentation;
  /** Subtle opacity breathing driven by `update(time)`. Default `true`. */
  pulse?: boolean;
};

export type SelectionRing = {
  /** The Three mesh — add it to the scene graph. */
  readonly object: THREE.Mesh;
  /** Re-tint the ring (e.g. star temperature, locked accent). */
  setColor(color: THREE.ColorRepresentation | readonly [number, number, number]): void;
  /** Set world position of the ring centre. */
  setPosition(x: number, y: number, z: number): void;
  /** Uniform scale in world units. Use `base × distance(mesh, camera)` for constant apparent size. */
  setSize(scale: number): void;
  /** Make the mesh visible. */
  show(): void;
  /** Hide without disposing — the mesh stays in the scene graph. */
  hide(): void;
  /**
   * Per-frame hook: re-orients the billboard towards the camera and propagates
   * time to the pulse uniform. Call once per frame from the render loop.
   */
  update(camera: THREE.Camera, time: number): void;
};

/**
 * Soft thin-ring billboard with a faint radial glow, drawn entirely by a
 * fragment shader on a unit-quad. Shared visual primitive behind the close-up
 * hover indicator (animated, tinted by star temperature) and the measure-tool
 * A-marker (static, cyan accent).
 *
 * The shader-based approach (vs `RingGeometry + MeshBasicMaterial`) avoids the
 * hard-edged "sticker" look: bands fade smoothly, additive blending blends the
 * ring into the starfield, and the glow never masks the star at the centre.
 *
 * Sizing is delegated to the caller: pass `setSize(base × distanceToCamera)`
 * from a per-frame hook to keep the ring at a constant apparent size on screen.
 */
export function createSelectionRing(options: SelectionRingOptions = {}): SelectionRing {
  const { color = 0xffffff, pulse = true } = options;

  const geometry = new THREE.PlaneGeometry(QUAD_HALF_SIZE * 2, QUAD_HALF_SIZE * 2);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor:    { value: new THREE.Color(color) },
      uTime:     { value: 0 },
      uPulseAmp: { value: pulse ? 0.08 : 0.0 },
    },
    vertexShader: SELECTION_RING_VERT,
    fragmentShader: SELECTION_RING_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;
  mesh.renderOrder = 1500;

  function setColor(next: THREE.ColorRepresentation | readonly [number, number, number]): void {
    const target = material.uniforms.uColor.value as THREE.Color;
    if (Array.isArray(next)) {
      const [r, g, b] = next as readonly [number, number, number];
      target.setRGB(r, g, b);
    } else {
      target.set(next as THREE.ColorRepresentation);
    }
  }

  function setPosition(x: number, y: number, z: number): void {
    mesh.position.set(x, y, z);
  }

  function setSize(scale: number): void {
    mesh.scale.setScalar(scale);
  }

  function show(): void {
    mesh.visible = true;
  }

  function hide(): void {
    mesh.visible = false;
  }

  function update(camera: THREE.Camera, time: number): void {
    material.uniforms.uTime.value = time;
    mesh.lookAt(camera.position);
  }

  return { object: mesh, setColor, setPosition, setSize, show, hide, update };
}

// ─── Shaders ─────────────────────────────────────────────────────────────────

export const SELECTION_RING_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/**
 * Two contributions: a thin Gaussian-profile ring at r = RING_R and a wide
 * radial glow that fades to zero by r = 1. Both modulated by an optional
 * breathing pulse (amplitude controlled by `uPulseAmp`, set to 0 for static).
 */
export const SELECTION_RING_FRAG = /* glsl */`
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime;
uniform float uPulseAmp;

const float RING_R         = 0.62;
const float RING_THICKNESS = 0.060;
const float GLOW_FALLOFF   = 4.0;

void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  if (r > 1.0) discard;

  float pulse = 1.0 - uPulseAmp + uPulseAmp * sin(uTime * 1.6);

  float ringDist = r - RING_R;
  float ring = exp(-(ringDist * ringDist) / (RING_THICKNESS * RING_THICKNESS)) * 0.85;
  float glow = exp(-r * r * GLOW_FALLOFF) * 0.18;

  float alpha = (ring + glow) * pulse;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(uColor * alpha, alpha);
}`;
