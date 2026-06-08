// Close-up star sprite — 6 per-star traits break visual uniformity:
//   - giant boost (rare ×3-4)
//   - spike intensity (25% have no rays at all)
//   - halo intensity (30% have no halo, otherwise 0 → 1.6)
//   - halo tightness (continuous, wide ↔ tight)
//   - body tightness (continuous, wide ↔ pinpoint)
//   - core fleck (present or not, 50/50)
//
// All five traits are derived per-star from the `aSeed` attribute via
// `fract(aSeed * prime)` — cheap GLSL trick for decorrelated values from a
// single source. The seeds themselves are produced deterministically from
// (galaxyData.seed, cube coords) on the JS side, so a cube re-opened twice
// renders identical stars.

export const STAR_VERT = /* glsl */`
attribute float aSize;
attribute vec3 aColor;
attribute float aSeed;
attribute float aTemp;
attribute float aVisibility;
varying vec3 vColor;
varying float vSeed;
varying float vTemp;
varying float vVis;
varying float vSpikeMul;
varying float vHaloMul;
varying float vHaloTight;
varying float vBodyTight;
varying float vCoreMul;
uniform float uPixelRatio;
uniform float uTime;
void main() {
  vColor = aColor;
  vSeed  = aSeed;
  vTemp  = aTemp;
  vVis   = aVisibility;

  // 5 decorrelated values in [0, 1] derived from aSeed
  float t1 = fract(aSeed * 13.71);
  float t2 = fract(aSeed * 47.93);
  float t3 = fract(aSeed * 91.22);
  float t4 = fract(aSeed * 23.17);
  float t5 = fract(aSeed * 67.41);

  // ~8% giants
  float isGiant = step(0.92, t1);
  float giantBoost = mix(1.0, 2.5 + t2 * 1.5, isGiant);

  // ~25% have no spikes, otherwise 0 → 1.4
  vSpikeMul = max(0.0, t2 - 0.25) * 1.9;

  // ~30% have no halo, otherwise 0 → 1.6
  vHaloMul = max(0.0, t3 - 0.3) * 2.3;

  // Halo tightness 1.0 (wide) → 4.5 (hugging the body)
  vHaloTight = mix(1.0, 4.5, t4);

  // Body tightness 6 (wide diffuse) → 18 (pinpoint)
  vBodyTight = isGiant > 0.5 ? mix(5.0, 9.0, t5) : mix(8.0, 18.0, t5);

  // 50% of stars get a white central fleck
  vCoreMul = step(0.5, fract(aSeed * 31.91));

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = max(-mv.z, 1.0);

  // Cepheid-style variability for ~10% of stars
  float isVariable = step(0.9, fract(aSeed * 7.13));
  float varAmp  = mix(0.05, 0.40, isVariable);
  float varFreq = mix(2.5,  0.7,  isVariable);
  float pulse = 1.0 - varAmp + varAmp * (0.5 + 0.5 * sin(uTime * varFreq + aSeed * 6.283));

  gl_PointSize = aSize * giantBoost * uPixelRatio * (130.0 / dist) * pulse;
  gl_Position = projectionMatrix * mv;
}`;

export const STAR_FRAG = /* glsl */`
varying vec3 vColor;
varying float vSeed;
varying float vTemp;
varying float vVis;
varying float vSpikeMul;
varying float vHaloMul;
varying float vHaloTight;
varying float vBodyTight;
varying float vCoreMul;
uniform float uTime;
uniform float uDim;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv) * 2.0;
  if (d > 0.95) discard;

  float body = exp(-d * d * vBodyTight);
  float core = smoothstep(0.06, 0.0, d) * 1.3 * vCoreMul;

  float spikeH = exp(-pow(uv.y * 130.0, 2.0)) * exp(-pow(uv.x * 5.5, 2.0)) * 0.22 * vSpikeMul;
  float spikeV = exp(-pow(uv.x * 130.0, 2.0)) * exp(-pow(uv.y * 5.5, 2.0)) * 0.22 * vSpikeMul;
  float spikes = spikeH + spikeV;

  float haloPulse = 0.70 + 0.30 * sin(uTime * 1.5 + vSeed * 6.283);
  float halo = exp(-d * d * vHaloTight) * 0.13 * haloPulse * vHaloMul;

  // Hot O/B corona tint
  float hot = smoothstep(15000.0, 25000.0, vTemp);
  halo += hot * exp(-d * d * 0.9) * 0.35;

  float intensity = body + core + spikes + halo;
  if (intensity < 0.02) discard;

  vec3 col = mix(vColor, vec3(1.0), pow(core / 1.3, 0.6) * 0.75);
  col += vec3(0.25, 0.45, 1.0) * hot * halo * 0.55;

  // Fog-of-war dimming: per-star aVisibility x global uDim. Modulates the
  // additive output (colour and alpha alike) so even the forced white core
  // fades, which aColor alone cannot do.
  float vis = clamp(vVis, 0.0, 1.0) * uDim;
  gl_FragColor = vec4(col * intensity * vis, intensity * vis);
}`;
