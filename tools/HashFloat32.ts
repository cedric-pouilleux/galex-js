/**
 * FNV-1a over a typed array's bytes, read in explicit little-endian. Uses only
 * Math.imul / bit ops, so the hash itself is bit-stable across engines — any
 * mismatch can only come from the deterministic generation chain diverging.
 *
 * Mirrors the inline copy in `tools/cross-engine/page.html` (which has to stay
 * inline because it's served as raw HTML to the Playwright harness).
 */
export function hashFloat32(arr: Float32Array): number {
  const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  let h = 0x811c9dc5;
  for (let i = 0; i < arr.length; i++) {
    const u32 = view.getUint32(i * 4, true);
    h = Math.imul(h ^ (u32 & 0xff), 0x01000193) >>> 0;
    h = Math.imul(h ^ ((u32 >>> 8) & 0xff), 0x01000193) >>> 0;
    h = Math.imul(h ^ ((u32 >>> 16) & 0xff), 0x01000193) >>> 0;
    h = Math.imul(h ^ ((u32 >>> 24) & 0xff), 0x01000193) >>> 0;
  }
  return h >>> 0;
}
