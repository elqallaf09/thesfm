/**
 * UI consistency sweep: map hardcoded px values in page-local CSS
 * (styled-jsx blocks, CSS modules, plain CSS imports) onto the design tokens
 * defined in src/app/globals.css.
 *
 *  - border-radius: px values → var(--r-xs|sm|md|lg|xl|2xl)
 *    (0–2px, pills ≥29px, %, var()/calc()/inherit are left untouched)
 *  - height: on control-like selectors → var(--control-h-sm|--control-h|--control-h-lg)
 *    (only 30–56px values; icon/avatar/spinner-like selectors skipped)
 *
 * src/trader-app is excluded: it is a static SPA that does not load globals.css.
 *
 * Usage: node scripts/normalize-ui-tokens.mjs [--dry]
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const DRY = process.argv.includes('--dry');

const EXCLUDE_DIRS = new Set(['trader-app', 'node_modules']);
const EXCLUDE_FILES = new Set(['globals.css', 'tokens.css', 'themes.css']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!EXCLUDE_DIRS.has(name)) yield* walk(full);
    } else if (/\.(tsx|css)$/.test(name) && !EXCLUDE_FILES.has(name) && !/\.backup/.test(name)) {
      yield full;
    }
  }
}

const stats = { radius: 0, height: 0, files: 0 };

function mapRadius(px) {
  if (px <= 2 || px >= 29) return null; // hairline or pill — leave alone
  if (px <= 7) return 'var(--r-xs)';
  if (px <= 10) return 'var(--r-sm)';
  if (px <= 14) return 'var(--r-md)';
  if (px <= 17) return 'var(--r-lg)';
  if (px <= 20) return 'var(--r-xl)';
  return 'var(--r-2xl)';
}

function mapControlHeight(px) {
  if (px < 30 || px > 56) return null;
  if (px <= 38) return 'var(--control-h-sm)';
  if (px <= 47) return 'var(--control-h)';
  return 'var(--control-h-lg)';
}

// A CSS rule's selector is "control-like" when it clearly targets form
// controls/buttons and clearly is not an icon/indicator sub-element.
const CONTROL_RE = /\b(input|select|textarea|button|btn|combobox|search|toolbar|pagination)\b/i;
const NON_CONTROL_RE = /\b(icon|avatar|logo|spinner|progress|dot|thumb|img|image|badge|bar|ticker|chart|check|radio|switch|toggle)\b/i;

function normalizeRadiusDecls(css) {
  return css.replace(
    /border-radius(\s*):(\s*)([^;{}!]+?)(\s*!important)?(\s*)(?=[;}])/g,
    (full, s1, s2, value, imp, s3) => {
      if (/[%(]|inherit|initial|unset/.test(value)) return full;
      let changed = false;
      const mapped = value.trim().split(/\s+/).map(tok => {
        const m = tok.match(/^(\d+(?:\.\d+)?)px$/);
        if (!m) return tok;
        const repl = mapRadius(parseFloat(m[1]));
        if (repl) { changed = true; return repl; }
        return tok;
      }).join(' ');
      if (!changed) return full;
      stats.radius++;
      return `border-radius${s1}:${s2}${mapped}${imp || ''}${s3 || ''}`;
    }
  );
}

function normalizeControlHeights(css) {
  // Process rule-by-rule so the selector can be inspected.
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (full, selector, decls) => {
    if (!CONTROL_RE.test(selector) || NON_CONTROL_RE.test(selector)) return full;
    const newDecls = decls.replace(
      /(^|[;{\s])height(\s*):(\s*)(\d+(?:\.\d+)?)px/g,
      (d, lead, s1, s2, num) => {
        const repl = mapControlHeight(parseFloat(num));
        if (!repl) return d;
        stats.height++;
        return `${lead}height${s1}:${s2}${repl}`;
      }
    );
    return newDecls === decls ? full : `${selector}{${newDecls}}`;
  });
}

for (const file of walk(ROOT)) {
  const before = readFileSync(file, 'utf8');
  let after;
  if (file.endsWith('.css')) {
    after = normalizeControlHeights(normalizeRadiusDecls(before));
  } else {
    // TSX: only transform inside CSS template literals (styled-jsx / css strings),
    // never JSX markup. Template literals with ${} interpolation are handled per
    // static chunk, which is safe because both transforms are local to a single
    // declaration/rule.
    after = before.replace(/`([^`]*)`/g, (full, body) => {
      if (!/border-radius|height\s*:/.test(body)) return full;
      // Heuristic: only treat it as CSS if it contains declarations.
      if (!/[{;]/.test(body)) return full;
      return '`' + normalizeControlHeights(normalizeRadiusDecls(body)) + '`';
    });
  }
  if (after !== before) {
    stats.files++;
    if (!DRY) writeFileSync(file, after);
    console.log(`${DRY ? '[dry] ' : ''}${relative(process.cwd(), file)}`);
  }
}

console.log(`\nradius declarations tokenized: ${stats.radius}`);
console.log(`control heights tokenized:     ${stats.height}`);
console.log(`files changed:                 ${stats.files}`);
