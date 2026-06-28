// Find CSS rules in globals.css where ALL comma-separated selectors reference
// classes used in only ONE page directory under src/app, and report them
// (sorted by total byte size). These are safe-to-move candidates.
//
// Dry-run only. Actual extraction would write to src/app/<page>/<page>.css
// and re-import in the page; that step needs a human eye to verify the
// cascade order matches.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import postcss from 'postcss';

// Build class → page-set map from src/app/ usage
function* walk(d) {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e.startsWith('.next') || e === 'dist') continue;
    const p = join(d, e);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (/\.(tsx|ts|jsx|js)$/.test(e)) yield p;
  }
}

const pageOf = (filePath) => {
  const m = filePath.match(/^src\/app\/([^/]+)/);
  return m ? m[1] : null;
};

const classUsage = new Map(); // className → Set<page-dir>
for (const f of walk('src')) {
  const text = readFileSync(f, 'utf8');
  const page = pageOf(f);
  if (!page) continue;
  const re = /className\s*=\s*(?:"([^"]+)"|'([^']+)'|\{`([^`]+)`\})/g;
  for (const m of text.matchAll(re)) {
    for (const tok of (m[1] || m[2] || m[3] || '').split(/\s+/)) {
      if (!tok) continue;
      if (!classUsage.has(tok)) classUsage.set(tok, new Set());
      classUsage.get(tok).add(page);
    }
  }
}

const css = readFileSync('src/app/globals.css', 'utf8');
const root = postcss.parse(css);

// Group rules by exclusive page
const byPage = new Map(); // page → [{rule, css, size}]
let candidateRules = 0;
let candidateBytes = 0;

root.walkRules((rule) => {
  // Skip rules inside @keyframes etc.
  if (rule.parent && rule.parent.type === 'atrule' && rule.parent.name === 'keyframes') return;
  const selectors = rule.selectors;
  const classesInRule = new Set();
  let ok = true;
  for (const sel of selectors) {
    // pull out top-level class names (.foo) but ignore tags/ids/etc.
    const found = sel.match(/\.[a-zA-Z_][a-zA-Z0-9_-]*/g);
    if (!found || found.length === 0) { ok = false; break; }
    for (const c of found) classesInRule.add(c.slice(1));
  }
  if (!ok) return;

  const pageSets = [...classesInRule].map((c) => classUsage.get(c));
  // All classes must be USED somewhere and all on exactly the same single page
  if (pageSets.some((s) => !s || s.size !== 1)) return;
  const pages = new Set(pageSets.map((s) => [...s][0]));
  if (pages.size !== 1) return;

  const page = [...pages][0];
  const ruleText = rule.toString();
  if (!byPage.has(page)) byPage.set(page, []);
  byPage.get(page).push({ ruleText, size: ruleText.length });
  candidateRules++;
  candidateBytes += ruleText.length;
});

const ranked = [...byPage.entries()].map(([page, list]) => ({
  page,
  count: list.length,
  bytes: list.reduce((s, r) => s + r.size, 0),
  rules: list,
})).sort((a, b) => b.bytes - a.bytes);

console.log(`Found ${candidateRules} rules covering ${candidateBytes} bytes that are PURELY single-page.\n`);
console.log('## Top 10 pages by extractable bytes:');
for (const r of ranked.slice(0, 10)) {
  console.log(`  ${r.page.padEnd(30)} ${r.count} rules  ${r.bytes} bytes`);
}

writeFileSync('/tmp/single-page-css.json', JSON.stringify(ranked, null, 2));
console.log('\nFull list saved to /tmp/single-page-css.json');
