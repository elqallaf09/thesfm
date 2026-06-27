// Strict dead-class detector: a class is candidate for deletion only if it
// does NOT appear as a substring of any token in JS/TS sources.
// This catches dynamic className patterns like `state-${kind}`.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const css = readFileSync('src/app/globals.css', 'utf8');
const classSet = new Set();
for (const m of css.matchAll(/(^|[\s,{>+~])(\.[a-zA-Z_][a-zA-Z0-9_-]*)/g)) {
  classSet.add(m[2].slice(1));
}

function* walk(d) {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e.startsWith('.next') || e === 'dist') continue;
    const p = join(d, e);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (/\.(tsx|ts|jsx|js|mjs|cjs)$/.test(e)) yield p;
  }
}

const files = [...walk('src')];
const code = files.map(f => readFileSync(f, 'utf8')).join('\n');
// Also scan globals.css text itself (some classes might only be referenced
// from other CSS rules via :is(.foo) or sibling selectors)
const cssRefs = css;

const dead = [];
const aliveDynamicHint = [];

for (const k of classSet) {
  // Skip if the literal class name appears anywhere in source (string, prop, dict key, etc.)
  // Use a regex that catches it as a word-ish token.
  const re = new RegExp(`(^|[^A-Za-z0-9_-])${k.replace(/-/g, '\\-')}([^A-Za-z0-9_-]|$)`);
  if (re.test(code)) continue;

  // Skip if used by other CSS rules (chained, sibling, :is(), :has())
  if (re.test(cssRefs.replace(new RegExp(`\\.${k.replace(/-/g, '\\-')}\\s*[{,]`, 'g'), ''))) continue;

  // Skip if the class is a prefix of another USED class — likely a dynamic builder
  let prefixHit = false;
  for (const other of classSet) {
    if (other !== k && other.startsWith(`${k}-`) && new RegExp(`(^|[^A-Za-z0-9_-])${other.replace(/-/g, '\\-')}([^A-Za-z0-9_-]|$)`).test(code)) {
      prefixHit = true;
      break;
    }
  }
  if (prefixHit) { aliveDynamicHint.push(k); continue; }

  dead.push(k);
}

writeFileSync('/tmp/dead-classes.json', JSON.stringify({ dead, aliveDynamicHint }, null, 2));
console.log(`Total classes in globals.css: ${classSet.size}`);
console.log(`Strictly dead (no source ref anywhere): ${dead.length}`);
console.log(`Skipped — prefix of a dynamically-used class: ${aliveDynamicHint.length}`);
console.log(`\nFirst 30 dead candidates:`);
for (const k of dead.slice(0, 30)) console.log('  ' + k);
