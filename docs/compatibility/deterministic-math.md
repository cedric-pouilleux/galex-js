# Math déterministe

Le module `core/det-math.ts` fournit les remplacements bit-stables pour les fonctions transcendantes utilisées par la chaîne de génération.

## API

```ts
import { detSin, detCos, detLog, detExp, detPow } from './core/det-math.js';
```

| Fonction | Signature | Domaine | Précision |
|---|---|---|---|
| `detSin(x)` | `(x: number) => number` | `x ∈ ℝ` | `< 1e-13` absolue vs IEEE-correct |
| `detCos(x)` | `(x: number) => number` | `x ∈ ℝ` | `< 1e-13` absolue |
| `detLog(x)` | `(x: number) => number` | `x > 0` | `< 1e-13` absolue |
| `detExp(x)` | `(x: number) => number` | `x ∈ ℝ` | `< 1e-12` relative |
| `detPow(x, y)` | `(x: number, y: number) => number` | `x ≥ 0` | `< 1e-11` relative |

Toutes les fonctions sont pures, sans état partagé — réentrantes, thread-safe.

## Comment ça marche

### Sin / Cos

Réduction d'argument vers `[-π/4, π/4]` puis polynôme de Taylor :

```ts
const k = Math.round(x * INV_HALF_PI);   // entier le plus proche de x / (π/2)
const r = x - k * HALF_PI;               // r ∈ (-π/4, π/4]
const m = ((k % 4) + 4) % 4;             // quadrant
```

Selon `m ∈ {0, 1, 2, 3}`, `sin(x)` se ramène à `±sin(r)` ou `±cos(r)`. Les polynômes sont des Taylor de degré 13 (sin) et 12 (cos) — l'erreur de troncature à `|r| = π/4` reste sous `5 × 10⁻¹⁵`.

### Log

Décomposition `x = m · 2^e` avec `m ∈ [1, 2)` puis split supplémentaire si `m ≥ √2` pour serrer la substitution `t = (m-1)/(m+1)` dans `[0, 0.172]`. Polynôme degré 15 sur `t²`.

### Exp

Réduction `x = k · ln(2) + r` avec **Cody-Waite split** sur `ln(2)` pour préserver la précision de `r` quand `k` est grand :

```ts
const LN2_HI = 0.6931471803691238;       // bits hauts de ln(2)
const LN2_LO = 1.9082149292705877e-10;   // résidu
const k = Math.round(x * INV_LN2);
const r = (x - k * LN2_HI) - k * LN2_LO;
return pow2int(k) * polyExp(r);
```

`pow2int(k)` calcule `2^k` par exponentiation binaire (uniquement `*` et `>>>`), évitant `Math.pow(2, k)` qui n'est pas spec-mandaté.

### Pow

```ts
detPow(x, y) = detExp(y * detLog(x))   pour x > 0
```

Cas particuliers : `y === 0 → 1`, `x === 0 → 0` (par contrat le caller ne passe pas `y ≤ 0` avec `x = 0`).

## Pourquoi pas une lib externe ?

Aucune lib JS établie ne cible spécifiquement la bit-stabilité cross-engine sur ces fonctions :

- `mathjs`, `decimal.js` : précision arbitraire, mais s'appuient sur les `Math.*` natifs en backend.
- `bigfloat.js` : surdimensionné, performance médiocre.

Un module ad-hoc de ~150 lignes est plus simple, audité, et n'ajoute pas de dépendance.

## Performance

Mesure indicative sur Node 24 / V8, pour 15 000 appels de chaque fonction :

| Fonction | det-math | Math.* natif | Ratio |
|---|---|---|---|
| sin / cos | ~3 ms | ~1 ms | ×3 |
| log | ~4 ms | ~1 ms | ×4 |
| exp | ~3 ms | ~1 ms | ×3 |
| pow | ~7 ms | ~1 ms | ×7 |

La génération d'une galaxie de 15k étoiles passe de ~30 ms à ~50 ms — invisible côté UX (génération unique), et négligeable côté serveur (validation sur cache).

## Constantes utilisées

Toutes spec-mandatées, bit-stables sur tout moteur ES2017+ :

```ts
Math.PI         // 3.141592653589793
Math.LN2        // 0.6931471805599453
Math.LOG2E      // 1.4426950408889634
Math.SQRT2      // 1.4142135623730951
Math.SQRT1_2    // 0.7071067811865476
```

Les fractions littérales `1/6`, `1/120`, etc. sont également bit-stables (deux entiers exactement représentables, division IEEE).
