// Lint guard. Two scopes:
//
// 1. core/ rules:
//    a. No Math transcendental (sin/cos/exp/log/pow/...) — these drift across
//       JS engines, breaking byte-identical regeneration. Use det-math instead.
//    b. No `from 'three'` — core stays runtime-agnostic so it can run on the
//       backend without WebGL.
//    c. No upstream import (view/, view-vue/, playground/) — core/ is the
//       bottom of the dependency graph.
//
// 2. Hierarchy enforcement (no zone reaches above its level):
//    - core/    cannot import view/, view-vue/, playground/, examples/
//    - view/    cannot import view-vue/, playground/, examples/
//    - view-vue/ cannot import playground/, examples/
//
// Run via `npm run test:determinism` (chained as a prerequisite of `npm test`).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const FORBIDDEN_MATH = /\bMath\.(sin|cos|tan|asin|acos|atan|atan2|exp|expm1|log|log2|log10|log1p|pow|hypot|cbrt)\b/g;
const FORBIDDEN_THREE = /from\s+['"]three(\/.+)?['"]/g;

const CORE_DIR = 'core';

/** Zones higher up the dependency stack — a given zone cannot import from any of these. */
const HIERARCHY: Record<string, string[]> = {
  core:        ['view', 'view-vue', 'playground', 'examples'],
  view:        ['view-vue', 'playground', 'examples'],
  'view-vue':  ['playground', 'examples'],
};

function listDirSources(dir: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(resolve(process.cwd(), dir));
  for (const name of entries) {
    const full = join(dir, name);
    const stat = statSync(resolve(process.cwd(), full));
    if (stat.isDirectory()) {
      out.push(...listDirSources(full));
    } else if (
      (name.endsWith('.ts') || name.endsWith('.vue')) &&
      !name.endsWith('.test.ts') &&
      !name.endsWith('.d.ts')
    ) {
      out.push(full.replace(/\\/g, '/'));
    }
  }
  return out;
}

function listCoreSources(): string[] {
  return readdirSync(resolve(process.cwd(), CORE_DIR))
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => join(CORE_DIR, name).replace(/\\/g, '/'));
}

function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function scan(file: string, regex: RegExp, label: string): string[] {
  const stripped = stripComments(readFileSync(resolve(process.cwd(), file), 'utf8'));
  const violations: string[] = [];
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(stripped))) {
    const upTo = stripped.slice(0, match.index);
    const line = upTo.split('\n').length;
    const column = upTo.length - upTo.lastIndexOf('\n');
    violations.push(`${file}:${line}:${column}  ${label}: ${match[0]}`);
  }
  return violations;
}

/** Builds the regex that catches `from '...'` and `import '...'` whose target lives in a forbidden zone. */
function forbiddenZoneRegex(zones: string[]): RegExp {
  // Match either of:
  //   from '../{zone}/...'
  //   import '../{zone}/...'
  // The path may have any number of `../` segments before the zone.
  const zoneAlt = zones.join('|');
  return new RegExp(`(?:from|import)\\s+['"](?:\\.\\.\\/)+(${zoneAlt})\\/`, 'g');
}

const errors: string[] = [];

// 1. core/ — math + three + upstream
for (const file of listCoreSources()) {
  errors.push(...scan(file, FORBIDDEN_MATH,  'forbidden Math transcendental — use det-math'));
  errors.push(...scan(file, FORBIDDEN_THREE, 'forbidden three import — core/ must stay runtime-agnostic'));
}

// 2. Hierarchy — every zone forbids importing from its upstream neighbours.
for (const [zone, forbidden] of Object.entries(HIERARCHY)) {
  const sources = listDirSources(zone);
  const regex = forbiddenZoneRegex(forbidden);
  for (const file of sources) {
    errors.push(...scan(file, regex, `forbidden upstream import — ${zone}/ cannot depend on ${forbidden.join(', ')}/`));
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(e);
  console.error(`\n${errors.length} violation${errors.length > 1 ? 's' : ''} found.`);
  process.exit(1);
}

const coreCount = listCoreSources().length;
console.log(`Audit OK: ${coreCount} core/ files clean (no Math transcendental, no three import) + hierarchy enforced (core, view, view-vue).`);
