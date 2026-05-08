// Cross-engine deterministic math.
//
// ECMAScript only mandates IEEE-correct results for + - * / sqrt and the basic
// rounding ops. Math.sin/cos/exp/log/pow are implementation-defined and drift
// by ~1 ulp across V8/SpiderMonkey/JSC. Anything that contributes to the
// seed-derived galaxy structure must call the det* equivalents below so server
// and client (any browser) produce byte-identical buffers for the same seed.
//
// Render-only code is free to use native Math.* — sub-ulp drift is invisible
// at sub-pixel scale.

const HALF_PI = Math.PI * 0.5;
const INV_HALF_PI = 2 / Math.PI;
const SQRT2 = Math.SQRT2;
const INV_SQRT2 = Math.SQRT1_2;
const LN2 = Math.LN2;
const INV_LN2 = Math.LOG2E;

// Cody-Waite split of LN2: LN2_HI carries the high 33 bits, LN2_LO the
// residual, so r = (x - k * LN2_HI) - k * LN2_LO keeps full double precision
// for moderate k (avoids cancellation loss in detExp).
const LN2_HI = 0.6931471803691238;
const LN2_LO = 1.9082149292705877e-10;

/** Deterministic sine, bit-stable across ES2017+ engines. */
export function detSin(x: number): number {
  const k = Math.round(x * INV_HALF_PI);
  const r = x - k * HALF_PI;
  const m = ((k % 4) + 4) % 4;
  if (m === 0) return polySin(r);
  if (m === 1) return polyCos(r);
  if (m === 2) return -polySin(r);
  return -polyCos(r);
}

/** Deterministic cosine, bit-stable across ES2017+ engines. */
export function detCos(x: number): number {
  const k = Math.round(x * INV_HALF_PI);
  const r = x - k * HALF_PI;
  const m = ((k % 4) + 4) % 4;
  if (m === 0) return polyCos(r);
  if (m === 1) return -polySin(r);
  if (m === 2) return -polyCos(r);
  return polySin(r);
}

/** Deterministic natural logarithm. Domain: x > 0. */
export function detLog(x: number): number {
  let m = x;
  let e = 0;
  while (m >= 2) { m *= 0.5; e++; }
  while (m < 1)  { m *= 2;   e--; }
  // Reduce m into [1, sqrt(2)) so the (m-1)/(m+1) substitution stays in
  // [0, ~0.172] where a degree-15 polynomial reaches < 2e-14.
  let halfBit = 0;
  if (m >= SQRT2) {
    m *= INV_SQRT2;
    halfBit = 0.5;
  }
  const t = (m - 1) / (m + 1);
  const t2 = t * t;
  let q = 1 / 15;
  q = q * t2 + 1 / 13;
  q = q * t2 + 1 / 11;
  q = q * t2 + 1 / 9;
  q = q * t2 + 1 / 7;
  q = q * t2 + 1 / 5;
  q = q * t2 + 1 / 3;
  q = q * t2 + 1;
  return (e + halfBit) * LN2 + 2 * t * q;
}

/** Deterministic exponential. */
export function detExp(x: number): number {
  const k = Math.round(x * INV_LN2);
  const r = (x - k * LN2_HI) - k * LN2_LO;
  return pow2int(k) * polyExp(r);
}

/** Deterministic power. Domain: x >= 0. Caller must not pass y <= 0 with x === 0. */
export function detPow(x: number, y: number): number {
  if (y === 0) return 1;
  if (x === 0) return 0;
  if (x === 1) return 1;
  return detExp(y * detLog(x));
}

// Taylor series in [-π/4, π/4]; truncation error < 5e-15 at the edge.
function polySin(r: number): number {
  const u = r * r;
  let q = 1 / 6227020800;
  q = q * u - 1 / 39916800;
  q = q * u + 1 / 362880;
  q = q * u - 1 / 5040;
  q = q * u + 1 / 120;
  q = q * u - 1 / 6;
  q = q * u + 1;
  return r * q;
}

function polyCos(r: number): number {
  const u = r * r;
  let q = 1 / 479001600;
  q = q * u - 1 / 3628800;
  q = q * u + 1 / 40320;
  q = q * u - 1 / 720;
  q = q * u + 1 / 24;
  q = q * u - 1 / 2;
  q = q * u + 1;
  return q;
}

// Taylor series in [-ln2/2, ln2/2]; truncation error well under 1 ulp at the edge.
function polyExp(r: number): number {
  let q = 1 / 3628800;
  q = q * r + 1 / 362880;
  q = q * r + 1 / 40320;
  q = q * r + 1 / 5040;
  q = q * r + 1 / 720;
  q = q * r + 1 / 120;
  q = q * r + 1 / 24;
  q = q * r + 1 / 6;
  q = q * r + 1 / 2;
  q = q * r + 1;
  q = q * r + 1;
  return q;
}

// Binary exponentiation for 2^k with integer k. Bit-stable (only +/* of exact
// doubles); avoids the spec-undefined Math.pow(2, k).
function pow2int(k: number): number {
  if (k === 0) return 1;
  const negative = k < 0;
  let n = negative ? -k : k;
  let result = 1;
  let base = 2;
  while (n > 0) {
    if (n & 1) result *= base;
    n >>>= 1;
    base *= base;
  }
  return negative ? 1 / result : result;
}
