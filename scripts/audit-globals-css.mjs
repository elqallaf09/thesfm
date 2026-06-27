// Lists class selectors defined in src/app/globals.css that are used in only
// one page directory under src/app — candidates to move into a per-page CSS module.
// Pure audit, no changes.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const CSS = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');

// Extract `.classname` selectors (single-word, no chained, no pseudo)
const classSet = new Set();
for (const m of CSS.matchAll(/(^|[\s,{>+~])(\.[a-zA-Z_][a-zA-Z0-9_-]*)/g)) {
  classSet.add(m[2].slice(1));
}

// Walk src for .tsx/.ts/.jsx/.js files and index `className="..."` content
function* walk(dir) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e.startsWith('.next') || e === 'dist') continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (/\.(tsx|ts|jsx|js)$/.test(e)) yield p;
  }
}

// Map className token -> Set of relative file paths that reference it
const usage = new Map();
const FILES = [...walk(join(ROOT, 'src'))];
for (const f of FILES) {
  const text = readFileSync(f, 'utf8');
  // Capture both className="..." and className={`...`} content
  const re = /className\s*=\s*(?:"([^"]+)"|'([^']+)'|\{`([^`]+)`\})/g;
  for (const m of text.matchAll(re)) {
    const tokens = (m[1] || m[2] || m[3] || '').split(/\s+/);
    for (const tok of tokens) {
      if (classSet.has(tok)) {
        if (!usage.has(tok)) usage.set(tok, new Set());
        usage.get(tok).add(relative(ROOT, f));
      }
    }
  }
}

// Group by parent dir under src/app to determine "single-page" candidates
function pageOf(filePath) {
  const m = filePath.match(/^src\/app\/([^/]+)/);
  return m ? m[1] : null;
}

const singlePageCandidates = [];
let unusedCount = 0;
for (const [klass, files] of usage) {
  const pages = new Set();
  for (const f of files) {
    const p = pageOf(f);
    if (p) pages.add(p);
  }
  if (files.size === 0) continue;
  if (pages.size === 1) singlePageCandidates.push({ klass, page: [...pages][0], files: [...files] });
}
for (const klass of classSet) {
  if (!usage.has(klass)) unusedCount++;
}

// Report: group by target page
const byPage = new Map();
for (const c of singlePageCandidates) {
  if (!byPage.has(c.page)) byPage.set(c.page, []);
  byPage.get(c.page).push(c);
}

console.log(`globals.css: ${classSet.size} class selectors defined.`);
console.log(`Used somewhere under src/: ${usage.size}.`);
console.log(`Apparently UNUSED in any className: ${unusedCount} (could be CSS-only chained or dynamic refs — confirm before deleting).`);
console.log(`Single-page candidates: ${singlePageCandidates.length}\n`);
console.log('## Top 12 pages by "single-page-only" class count (best move-out targets):');
const ranked = [...byPage.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 12);
for (const [page, list] of ranked) {
  console.log(`  ${page.padEnd(28)} ${list.length} classes`);
}
console.log('\nFull punch list saved to /tmp/globals-audit.json');
import { writeFileSync } from 'fs';
writeFileSync('/tmp/globals-audit.json', JSON.stringify({
  totalSelectors: classSet.size,
  usedSelectors: usage.size,
  apparentlyUnused: unusedCount,
  byPage: Object.fromEntries(byPage),
}, null, 2));
