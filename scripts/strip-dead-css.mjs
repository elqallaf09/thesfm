// Surgical removal of dead class selectors from globals.css.
// Uses postcss to safely strip selectors from comma-grouped rules and delete
// rules that become empty. Preserves comments, @media, @keyframes, etc.
//
// Input list comes from scripts/find-dead-css-classes.mjs (writes /tmp/dead-classes.json).
import { readFileSync, writeFileSync, statSync } from 'fs';
import postcss from 'postcss';

const CSS_PATH = 'src/app/globals.css';
const before = (await statSync(CSS_PATH)).size;
const css = readFileSync(CSS_PATH, 'utf8');

const { dead } = JSON.parse(readFileSync('/tmp/dead-classes.json', 'utf8'));
const deadSet = new Set(dead);

// Selector token matches `.foo` (the exact class), possibly followed by pseudo / [attr] / no other class
// We consider a selector "purely about a dead class" iff stripping leading '.deadclass' (with its
// trailing pseudo / [] modifiers but no other classes/ids/elements) leaves nothing.
function selectorReducesToDeadClass(selector) {
  // Tokenize the selector into compound parts separated by combinators (space, >, +, ~)
  const parts = selector.trim().split(/(\s+|>|\+|~)/).filter(s => s.trim());
  if (parts.length === 0) return false;
  // Check every compound part — if ANY is purely a dead-class compound, removing it would
  // change meaning. Only return true when the *entire* selector is a single compound that's a dead class.
  if (parts.length !== 1) return false;
  const part = parts[0];
  // part should match .deadclass(:pseudo|[attr]|::pseudo)* — no other classes/ids/elements
  const m = part.match(/^\.([a-zA-Z_][a-zA-Z0-9_-]*)((?:[:[][^\s]*?)*)$/);
  if (!m) return false;
  return deadSet.has(m[1]);
}

// Also handle :is(.a, .b) lists — strip dead classes from inside
function pruneIsList(selector) {
  return selector.replace(/(:is|:where|:has)\(([^)]*)\)/g, (_, fn, inner) => {
    const kept = inner.split(',').map(s => s.trim()).filter(s => {
      // simple .x or .x:hover entries
      const im = s.match(/^\.([a-zA-Z_][a-zA-Z0-9_-]*)/);
      return !(im && deadSet.has(im[1]));
    });
    if (kept.length === 0) return '__DEAD__';
    return `${fn}(${kept.join(', ')})`;
  });
}

let removedSelectorCount = 0;
let removedRuleCount = 0;

const root = postcss.parse(css);
root.walkRules(rule => {
  // Prune :is()/:where()/:has() lists first
  const newSelectors = [];
  for (const sel of rule.selectors) {
    const pruned = pruneIsList(sel);
    if (pruned.includes('__DEAD__')) {
      removedSelectorCount++;
      continue;
    }
    if (selectorReducesToDeadClass(pruned)) {
      removedSelectorCount++;
      continue;
    }
    newSelectors.push(pruned);
  }
  if (newSelectors.length === 0) {
    rule.remove();
    removedRuleCount++;
  } else if (newSelectors.length !== rule.selectors.length) {
    rule.selectors = newSelectors;
  }
});

const out = root.toString();
writeFileSync(CSS_PATH, out);
const after = (await statSync(CSS_PATH)).size;

console.log(`globals.css: ${before} -> ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`);
console.log(`Removed ${removedRuleCount} whole rules.`);
console.log(`Removed ${removedSelectorCount} dead-only selectors from grouped rules.`);
