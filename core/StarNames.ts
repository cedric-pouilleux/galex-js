/**
 * Stable, catalog-style designation for a star inside a cube.
 *
 * Format: `GX-<E|W><|i|><N|S><|k|>-<posInCube:3>`
 *  - `E` / `W` encode the sign of the cube's `i` axis (E = positive, W = negative)
 *  - `N` / `S` encode the sign of the cube's `k` axis (N = positive, S = negative)
 *  - `posInCube` is zero-padded to a minimum of 3 digits
 *
 * Examples:
 *   - cube `(3, 7)`,  star #12 → `GX-E3N7-012`
 *   - cube `(-2, 14)`, star #0  → `GX-W2N14-000`
 *   - cube `(0, 0)`,   star #5  → `GX-E0N0-005`
 *
 * The output is a pure function of its inputs: same `(cube, posInCube)` →
 * same string, every engine, every regeneration. Suitable as a stable identifier
 * for persistence (player save, server-side reference) as long as the caller's
 * notion of "cube" and "posInCube" is itself stable for the galaxy.
 */
export function nameStarInCube(cube: { i: number; k: number }, posInCube: number): string {
  const ew = cube.i >= 0 ? `E${cube.i}` : `W${-cube.i}`;
  const ns = cube.k >= 0 ? `N${cube.k}` : `S${-cube.k}`;
  const pad = posInCube.toString().padStart(3, '0');
  return `GX-${ew}${ns}-${pad}`;
}
