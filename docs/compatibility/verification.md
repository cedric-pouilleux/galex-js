# Vérification

Trois niveaux de tests garantissent que la bit-stabilité tient.

## Niveau 0 — lint statique

```bash
npm run test:determinism
```

Audit `tools/check-determinism.ts` qui scanne les fichiers de la chaîne déterministe et refuse tout appel à `Math.sin/cos/tan/asin/acos/atan/atan2/exp/log/log2/log10/pow/hypot/cbrt`. Il faut passer par `det-math` à la place.

Branché en amont de `npm test` — si un appel interdit est introduit, la build casse avant même de lancer la suite.

## Niveau 1 — intra-engine (Node)

```bash
npm test
```

Lance la suite [Node Test Runner](https://nodejs.org/api/test.html) (zéro dépendance, fournie par Node ≥ 18) sur :

- `core/det-math.test.ts` — précision et identités algébriques :
  - `detSin / detCos` vs `Math.sin / Math.cos` sur `[-2π, 2π]`, tolérance `1e-12`.
  - Identité de Pythagore sur des angles arbitraires.
  - `detLog`, `detExp`, `detPow` round-trip et cas connus.
- `core/visibility.test.ts` — primitives de visibilité (10 cas) :
  - Focal unique : anneau intérieur / faded / hidden.
  - `range = 1` : seul le cube focal est visible.
  - Multi-focal : la visibilité maximale gagne.
  - Buffer de sortie réutilisable.
- `core/galaxy-determinism.test.ts` :
  - Deux générations consécutives avec le même seed produisent des buffers byte-à-byte identiques.
  - Hash FNV-1a des buffers d'une galaxie `seed=42` figé contre une référence.

**23 tests, < 200 ms.**

## Niveau 2 — cross-engine (Playwright)

```bash
npm run test:cross
```

Lance le harness `tools/cross-engine/page.html` dans Chromium, Firefox et WebKit via Playwright. Chaque navigateur :

1. Régénère la galaxie depuis `seed=42` avec la config de référence.
2. Calcule le hash FNV-1a des buffers `positions`, `colors`, `sizes`.
3. Le test asserte que les hashes correspondent à la référence.

Si un seul navigateur produit un hash différent, le test échoue — preuve qu'une opération non-déterministe s'est glissée dans le pipeline.

### Hashes de référence

Pour `seed = 42` et la config par défaut du harness (2000 étoiles, 6 bras, 0.9 spin, etc.) :

| Buffer | Hash FNV-1a |
|---|---|
| `positions` | `0x499932ba` |
| `colors`    | `0xd02e9caf` |
| `sizes`     | `0x02f4f232` |

### Engines couverts

| Playwright project | Engine JS | Représente |
|---|---|---|
| chromium | V8 | Chrome, Edge, Opera, Brave, Node |
| firefox | SpiderMonkey | Firefox |
| webkit | JavaScriptCore | Safari (macOS, iOS) |

### Pourquoi Playwright et pas un autre runner ?

Playwright fournit des builds isolés des trois moteurs, indépendants des navigateurs installés sur la machine hôte — donc reproductible en CI, et ne nécessite pas de Mac pour tester WebKit.

## CI recommandée

```yaml
- run: npm test
- run: npm run test:cross
```

La build casse au premier hash divergent. C'est le filet de sécurité contre une régression où quelqu'un réintroduit `Math.cos` dans la chaîne déterministe.

## En cas d'échec

Si `test:cross` rouge :

1. Vérifier qu'aucun fichier dans `core/` ou la chaîne `Random → StarColor → StarGenerator` n'utilise `Math.sin/cos/tan/exp/log/pow/atan*/asin/acos/hypot`.
2. Lancer le harness manuellement (`npm run dev`, ouvrir `/tools/cross-engine/page.html` dans plusieurs navigateurs) pour observer les hashes individuels.
3. Si la dérive vient d'une nouvelle dépendance, l'isoler dans la zone rendu (qui n'a pas la contrainte).

## Mise à jour des hashes de référence

Si une modification **délibérée** du pipeline déterministe change l'output (ex: ajout d'un nouveau paramètre, correction d'un bug de génération), regénérer les hashes via :

```bash
tsx -e "import('./core/StarGenerator.ts').then(...)"
```

Snippet complet dans le README ou via un script `npm run hash:capture`.
