#!/usr/bin/env node

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'scripts', 'visual-system-legacy-baseline.json');
const updateBaseline = process.argv.includes('--update-baseline');
const reportCurrent = process.argv.includes('--report');
const probeFileIndex = process.argv.indexOf('--probe-file');
const probeFile = probeFileIndex >= 0 ? process.argv[probeFileIndex + 1] : null;
const probeAsIndex = process.argv.indexOf('--probe-as');
const probeAs = probeAsIndex >= 0 ? process.argv[probeAsIndex + 1] : null;

const scanRoots = ['src', 'public'];

const textExtensions = new Set([
  '.css', '.html', '.js', '.json', '.jsx', '.mjs', '.scss', '.svg', '.ts', '.tsx', '.webmanifest',
]);
const ignoredPathParts = [
  `${path.sep}__tests__${path.sep}`,
  `${path.sep}fixtures${path.sep}`,
];

const foundationFiles = {
  chartStyles: 'src/lib/visual-system/chartStyles.ts',
  staticTokens: 'src/styles/static-tokens.ts',
  themes: 'src/styles/themes.css',
  tokens: 'src/styles/tokens.css',
};

// Foundation exceptions are deliberately per-rule. The files still pass
// through every other rule, especially the legacy-alias rule, so a reviewed
// source cannot become a whole-file escape hatch.
const rawColourFoundationFiles = new Set([
  foundationFiles.staticTokens,
  foundationFiles.themes,
]);
const rawDepthFoundationFiles = new Set([
  foundationFiles.staticTokens,
  foundationFiles.themes,
  foundationFiles.tokens,
]);
const gradientFoundationFiles = new Set([
  foundationFiles.chartStyles,
  foundationFiles.themes,
]);
const bareVisualColourFoundationFiles = new Set([
  foundationFiles.staticTokens,
]);

const paletteNames = [
  'amber', 'black', 'blue', 'cyan', 'emerald', 'fuchsia', 'gray', 'green',
  'indigo', 'lime', 'neutral', 'orange', 'pink', 'purple', 'red', 'rose',
  'sky', 'slate', 'stone', 'teal', 'violet', 'white', 'yellow', 'zinc',
].join('|');

const rules = [
  {
    key: 'rawColors',
    label: 'literal colour',
    pattern: /(?<!&)#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\b|%23(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\b|(?:rgb|hsl)a?\([^)]*\)|oklch\([^)]*\)/gi,
    exemptFiles: rawColourFoundationFiles,
  },
  {
    key: 'bareVisualColors',
    label: 'bare visual colour string',
    pattern: /(?:["']?(?:background(?:Color)?|borderColor|color|fill|foreground|stroke|theme[_-]?color)["']?)\s*:\s*(["'`])(?:[0-9a-f]{6}|[0-9a-f]{8})\1/gi,
    exemptFiles: bareVisualColourFoundationFiles,
  },
  {
    key: 'paletteUtilities',
    label: 'non-semantic palette utility',
    pattern: new RegExp(`\\b(?:bg|border|caret|decoration|divide|fill|from|outline|ring|shadow|stroke|text|to|via)-(?:${paletteNames})(?:-\\d{2,3})?(?:\\/\\d{1,3})?\\b`, 'gi'),
  },
  {
    key: 'paleCyan',
    label: 'pale cyan treatment',
    pattern: /#(?:cffafe|ecfeff|a5f3fc|bae6fd)\b|\b(?:text|bg|border)-(?:cyan|sky)-(?:50|100|200)(?:\/\d{1,3})?\b|text-white\/(?:10|20|30|40)\b/gi,
  },
  {
    key: 'gradients',
    label: 'page-local gradient',
    pattern: /(?:linear|radial|conic)-gradient\(|\bbg-(?:gradient|linear|radial|conic)-|\b(?:from|via|to)-(?:amber|blue|cyan|emerald|indigo|orange|pink|purple|red|rose|sky|teal|violet|yellow)-/gi,
    exemptFiles: gradientFoundationFiles,
  },
  {
    key: 'legacyFonts',
    label: 'legacy or direct font declaration',
    pattern: /font-family\s*:(?!\s*(?:var\(--font-(?:ui|data)\)|\$\{[^}\n]*font(?:Ui|Data)\}|inherit\b|initial\b|unset\b))[^;}\n]+|["']?fontFamily["']?\s*:(?!\s*(?:['"`]?(?:var\(--font-(?:ui|data)\)|inherit\b)|[\w.]+\.font(?:Ui|Data)\b))[^,}\n]+|["']?fontFace["']?\s*:\s*(["'`])[^"'`\n]+\1|(?:fonts\.googleapis\.com[^'"\s]*family=|\bfont-\[['"`]?)(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto|Noto(?:\+|\s)Sans(?:\+|\s)Arabic)\b/gi,
  },
  {
    key: 'rawDepth',
    label: 'literal radius or shadow',
    find: findRawDepth,
    exemptFiles: rawDepthFoundationFiles,
  },
  {
    key: 'tailwindDepth',
    label: 'built-in or raw Tailwind depth utility',
    find: findTailwindDepth,
  },
  {
    key: 'legacyAliases',
    label: 'legacy local visual alias',
    find: findLegacyAliases,
  },
];

function patternMatches(source, pattern) {
  const localPattern = new RegExp(pattern.source, pattern.flags);
  return [...source.matchAll(localPattern)].map(match => ({
    index: match.index ?? 0,
    text: match[0],
  }));
}

function addPatternMatches(matches, source, pattern) {
  matches.push(...patternMatches(source, pattern));
}

function findRawDepth(source) {
  const matches = [];

  // CSS declarations must consume the shared radius/shadow API. Inheritance
  // and an explicit `none` shadow are values, not new visual decisions.
  for (const declaration of source.matchAll(/border-radius\s*:\s*([^;}\n]+)/gi)) {
    if (isSemanticRadiusValue(declaration[1])) continue;
    matches.push({ index: declaration.index ?? 0, text: declaration[0] });
  }
  addPatternMatches(
    matches,
    source,
    /box-shadow\s*:(?!\s*(?:(?:var\(--[\w-]+\)|none|inherit|initial|unset)(?:\s*,\s*var\(--[\w-]+\))*\s*(?:!important\s*)?(?:[;}\n])))\s*[^;}\n]+/gi,
  );

  // Object styles may be computed from a shared adapter. Only direct numeric
  // or string values are raw; token-derived expressions remain valid.
  addPatternMatches(matches, source, /borderRadius\s*:(?:\s*(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)|\s*(["'`])(?!(?:var\(--(?:radius-[\w-]+|layout-[\w-]*radius)\)|0(?:\.0+)?(?:px|rem|%)?|inherit|initial|unset)\1)[^"'`\n]+\1)/gi);
  addPatternMatches(matches, source, /boxShadow\s*:\s*(["'`])(?!(?:var\(--[\w-]+\)|none|inherit|initial|unset)\1)[^"'`\n]+\1/gi);

  addPatternMatches(matches, source, /(?:filter\s*:\s*[^;}\n]*|filter\s*=\s*(["'])[^"'\n]*?)drop-shadow\s*\(/gi);
  addPatternMatches(matches, source, /\bshadow\s*:\s*\{/gi);

  // A local depth/focus custom property is itself a second token system when
  // it contains a literal value or a numeric fallback.
  addPatternMatches(
    matches,
    source,
    /--[\w-]*(?:radius|shadow|depth|elevation|focus)[\w-]*\s*:\s*(?!\s*(?:var\([^;}\n]+\)|none\b|inherit\b|initial\b|unset\b))[^;}\n]+|--[\w-]*(?:radius|shadow|depth|elevation|focus)[\w-]*\s*:\s*[^;}\n]*,\s*(?:var\([^;}\n]*,\s*)?\d+(?:\.\d+)?(?:px|rem)?/gi,
  );

  return dedupeMatches(matches);
}

const semanticRadiusReference = /var\(--(?:radius-[\w-]+|layout-[\w-]*radius)(?:\s*,\s*var\(--(?:radius-[\w-]+|layout-[\w-]*radius)\))?\)/gi;

function isSemanticRadiusValue(rawValue) {
  const value = rawValue.replace(/!important\s*$/i, '').trim();
  if (/^(?:inherit|initial|unset)$/i.test(value)) return true;
  const withoutReferences = value.replace(semanticRadiusReference, 'TOKEN');
  return /^(?=.*(?:TOKEN|0))(?:TOKEN|0(?:\.0+)?(?:px|rem|%)?|\s|\/)+$/i.test(withoutReferences);
}

const builtInRadius = /^rounded(?:-(?:none|2xs|xs|sm|md|lg|xl|2xl|3xl|4xl|full)|-(?:s|e|t|r|b|l|ss|se|ee|es|tl|tr|br|bl)(?:-(?:none|2xs|xs|sm|md|lg|xl|2xl|3xl|4xl|full))?)?$/i;
const builtInShadow = /^(?:shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl|inner|none))?|drop-shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl|none))?)$/i;
const arbitraryRadius = /^rounded(?:-(?:s|e|t|r|b|l|ss|se|ee|es|tl|tr|br|bl))?-\[(.+)]$/i;
const arbitraryShadow = /^(?:shadow|drop-shadow)-\[(.+)]$/i;
const variableRadius = /^rounded(?:-(?:s|e|t|r|b|l|ss|se|ee|es|tl|tr|br|bl))?-\((--[\w-]+)\)$/i;
const variableShadow = /^(?:shadow|drop-shadow)-\((--[\w-]+)\)$/i;
const semanticRadiusValue = /^(?:inherit|var\(--radius-[\w-]+\))$/i;
const semanticShadowValue = /^var\(--(?:shadow-[\w-]+|[\w-]+-shadow)\)$/i;

function stripTailwindVariants(token) {
  const importantStripped = token.replace(/^!/, '').replace(/!$/, '');
  let bracketDepth = 0;
  for (let index = importantStripped.length - 1; index >= 0; index -= 1) {
    const character = importantStripped[index];
    if (character === ']') bracketDepth += 1;
    else if (character === '[') bracketDepth -= 1;
    else if (character === ':' && bracketDepth === 0) return importantStripped.slice(index + 1);
  }
  return importantStripped;
}

function classifyTailwindDepthToken(rawToken) {
  const token = rawToken.replace(/^[({,]+|[)},;]+$/g, '');
  const utility = stripTailwindVariants(token);
  if (/^(?:shadow|drop-shadow)-none$/i.test(utility)) return null;
  if (builtInRadius.test(utility) || builtInShadow.test(utility)) return token;

  const radiusMatch = utility.match(arbitraryRadius);
  if (radiusMatch && !semanticRadiusValue.test(radiusMatch[1])) return token;

  const shadowMatch = utility.match(arbitraryShadow);
  if (shadowMatch && !semanticShadowValue.test(shadowMatch[1])) return token;

  const variableRadiusMatch = utility.match(variableRadius);
  if (variableRadiusMatch && !/^--radius-[\w-]+$/i.test(variableRadiusMatch[1])) return token;

  const variableShadowMatch = utility.match(variableShadow);
  if (variableShadowMatch && !/^--(?:shadow-[\w-]+|[\w-]+-shadow)$/i.test(variableShadowMatch[1])) return token;

  return null;
}

function stringLiterals(source) {
  const literals = [];
  let index = 0;

  while (index < source.length) {
    if (source[index] === '/' && source[index + 1] === '/') {
      index = source.indexOf('\n', index + 2);
      if (index < 0) break;
      continue;
    }
    if (source[index] === '/' && source[index + 1] === '*') {
      const commentEnd = source.indexOf('*/', index + 2);
      index = commentEnd < 0 ? source.length : commentEnd + 2;
      continue;
    }

    const quote = source[index];
    if (quote !== '"' && quote !== "'" && quote !== '`') {
      index += 1;
      continue;
    }

    const start = index;
    index += 1;
    while (index < source.length) {
      if (source[index] === '\\') {
        index += 2;
        continue;
      }
      if (source[index] === quote) {
        literals.push({ index: start, text: source.slice(start + 1, index) });
        index += 1;
        break;
      }
      index += 1;
    }
  }

  return literals;
}

function isLikelyClassLiteral(source, literal, content) {
  const before = source.slice(Math.max(0, literal.index - 1200), literal.index);
  if (/(?:class(?:Name)?\s*=|className\s*:|\b(?:cn|clsx|cva|classNames|twMerge)\s*\()[\s\S]*$/i.test(before)) {
    const closestStatementBreak = Math.max(before.lastIndexOf(';'), before.lastIndexOf('}'));
    const closestClassContext = Math.max(
      before.lastIndexOf('className'),
      before.lastIndexOf('class='),
      before.lastIndexOf('cn('),
      before.lastIndexOf('clsx('),
      before.lastIndexOf('cva('),
      before.lastIndexOf('classNames('),
      before.lastIndexOf('twMerge('),
    );
    if (closestClassContext > closestStatementBreak) return true;
  }

  const tokens = content.trim().split(/\s+/).filter(Boolean);
  if (tokens.some(token => /:|\[/.test(token) && classifyTailwindDepthToken(token))) return true;
  return tokens.length > 1 && tokens.some(token => /^(?:[a-z-]+:)*(?:items-|justify-|gap-|p[trblxy]?-|m[trblxy]?-|w-|h-|min-|max-|bg-|text-|border-)[^\s]+$/i.test(token));
}

function findTailwindDepth(source) {
  const matches = [];

  for (const literal of stringLiterals(source)) {
    const content = literal.text;
    const likelyClassLiteral = isLikelyClassLiteral(source, literal, content);
    let searchOffset = 0;
    for (const rawToken of content.split(/\s+/)) {
      if (!rawToken) continue;
      const relativeIndex = content.indexOf(rawToken, searchOffset);
      searchOffset = relativeIndex + rawToken.length;
      const finding = classifyTailwindDepthToken(rawToken);
      if (!finding) continue;
      const utility = stripTailwindVariants(finding.replace(/^[({,]+|[)},;]+$/g, ''));
      if (!likelyClassLiteral && /^(?:rounded|shadow)$/i.test(utility)) continue;
      matches.push({
        index: literal.index + 1 + relativeIndex,
        text: finding,
      });
    }
  }

  for (const apply of source.matchAll(/@apply\s+([^;}\n]+)/gi)) {
    const content = apply[1];
    let searchOffset = 0;
    for (const rawToken of content.split(/\s+/)) {
      if (!rawToken) continue;
      const relativeIndex = content.indexOf(rawToken, searchOffset);
      searchOffset = relativeIndex + rawToken.length;
      const finding = classifyTailwindDepthToken(rawToken);
      if (!finding) continue;
      matches.push({
        index: (apply.index ?? 0) + apply[0].indexOf(content) + relativeIndex,
        text: finding,
      });
    }
  }

  return dedupeMatches(matches);
}

const legacyAliasName = /^(?:sfm-light-|r-|font-(?:cairo|tajawal|ibm-plex-arabic)$|background-(?:page|subtle|muted)$|surface-raised$|text-(?:primary|secondary|muted|disabled|inverse|[123]|white(?:-[23])?)$|border-(?:default|subtle|2|dark)$|brand-|(?:success|warning|danger|info|neutral)-muted$|neutral$|bg(?:-|$))/i;
const genericPaletteSegment = /(?:^|-)(?:amber|black|blue|brown|canvas|cyan|gold|green|ink|navy|orange|paper|pink|purple|red|teal|terminal-light|terminal-teal|white|yellow)(?:-|$)/i;
const paletteRoleName = /(?:^|-)(?:amber|black|blue|brown|canvas|cyan|gold|green|ink|navy|orange|paper|pink|purple|red|teal|terminal-light|terminal-teal|white|yellow)(?:$|-(?:active|accent|background|bg|border|color|dark|foreground|glow|gradient|hover|light|muted|primary|secondary|shadow|soft|surface|text)(?:-|$))/i;
const localAliasFamily = /^(?:news|landing|report|_sidebar|_mobile|sfm)-/i;
const visualAliasName = /(?:^|-)(?:accent|background|bg|border|card|color|depth|divider|elevation|fill|focus|font|foreground|glow|gradient|info|muted|primary|radius|ring|secondary|shadow|stroke|subtle|surface|text|warning|danger|success)(?:-|$)/i;
const semanticVisualReference = /var\(--(?:accent|background|border|card|chart-|control-|danger|divider|focus|foreground|hero-|info|market-|muted|popover|primary|print-|provider-|radius-|secondary|selection-|shadow-|shariah-|sidebar-|skeleton-|success|surface|table-|tooltip|warning)(?:[\w-]*)\)/i;
const literalVisualValue = /#(?:[0-9a-f]{3,8})\b|(?:rgb|hsl)a?\(|oklch\(|(?:linear|radial|conic)-gradient\(/i;

function isLegacyVisualAlias(name, value) {
  const normalizedName = name.toLowerCase().replace(/^--/, '');
  if (legacyAliasName.test(normalizedName)) return true;
  if (genericPaletteSegment.test(normalizedName)
    && (paletteRoleName.test(normalizedName)
      || semanticVisualReference.test(value)
      || literalVisualValue.test(value))) return true;
  if (!localAliasFamily.test(normalizedName)) return false;
  return visualAliasName.test(normalizedName)
    || semanticVisualReference.test(value)
    || literalVisualValue.test(value);
}

function findLegacyAliases(source) {
  const matches = [];
  for (const declaration of source.matchAll(/(--[_a-z][\w-]*)\s*:\s*([^;}\n]+)/gi)) {
    if (!isLegacyVisualAlias(declaration[1], declaration[2])) continue;
    matches.push({
      index: declaration.index ?? 0,
      text: `${declaration[1]}: ${declaration[2].trim()}`,
    });
  }
  return matches;
}

function dedupeMatches(matches) {
  const seen = new Set();
  return matches.filter(match => {
    const key = `${match.index}:${match.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(relativePath) {
  return relativePath.replaceAll(path.sep, '/');
}

function walk(targetPath) {
  const fullPath = path.join(root, targetPath);
  if (!existsSync(fullPath)) return [];
  const stat = statSync(fullPath);
  if (stat.isFile()) return [fullPath];

  const files = [];
  for (const entry of readdirSync(fullPath)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'coverage' || entry === 'dist') continue;
    files.push(...walk(path.join(targetPath, entry)));
  }
  return files;
}

function shouldScan(fullPath) {
  if (!textExtensions.has(path.extname(fullPath))) return false;
  if (ignoredPathParts.some(part => fullPath.includes(part))) return false;
  return true;
}

function collectSource(relativePath, source) {
  const counts = {};
  const examples = {};

  for (const rule of rules) {
    if (rule.exemptFiles?.has(relativePath)) continue;
    const matches = rule.find
      ? rule.find(source, relativePath)
      : patternMatches(source, rule.pattern);
    if (matches.length === 0) continue;
    counts[rule.key] = matches.length;
    examples[rule.key] = matches.slice(0, 3).map(match => {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      return `${relativePath}:${line} ${match.text.replace(/\s+/g, ' ').trim().slice(0, 100)}`;
    });
  }

  return Object.keys(counts).length > 0 ? { counts, examples } : null;
}

function collect() {
  const results = {};
  for (const scanRoot of scanRoots) {
    for (const fullPath of walk(scanRoot)) {
      if (!shouldScan(fullPath)) continue;
      const relativePath = normalize(path.relative(root, fullPath));
      const result = collectSource(relativePath, readFileSync(fullPath, 'utf8'));
      if (result) results[relativePath] = result;
    }
  }
  return results;
}

function printRegressions(regressions) {
  console.error('Visual-system guard failed. New raw visual values must use shared semantic tokens:');
  for (const regression of regressions) {
    console.error(`- ${regression.relativePath}: ${regression.rule.label} ${regression.count} (allowed ${regression.allowed})`);
    for (const example of regression.examples) console.error(`  ${example}`);
  }
  console.error('Do not allowlist regressions. Map the value in the centralized semantic foundation or consume an existing token.');
}

function toRegressions(results) {
  const regressions = [];
  for (const [relativePath, result] of Object.entries(results)) {
    for (const rule of rules) {
      const count = result.counts[rule.key] ?? 0;
      if (count === 0) continue;
      regressions.push({
        relativePath,
        rule,
        count,
        allowed: 0,
        examples: result.examples[rule.key] ?? [],
      });
    }
  }
  return regressions;
}

if (probeFile) {
  if (!existsSync(probeFile)) {
    console.error(`Visual-system probe failed: ${probeFile} does not exist.`);
    process.exit(2);
  }
  const relativePath = normalize(probeAs ?? path.relative(root, probeFile));
  const result = collectSource(relativePath, readFileSync(probeFile, 'utf8'));
  const regressions = result ? toRegressions({ [relativePath]: result }) : [];
  if (regressions.length > 0) {
    printRegressions(regressions);
    process.exit(1);
  }
  console.log(`Visual-system probe passed: ${relativePath}`);
  process.exit(0);
}

const current = collect();

if (updateBaseline) {
  if (Object.keys(current).length > 0) {
    console.error('Visual-system baseline was not updated: active production findings must be migrated, not allowlisted.');
    process.exit(1);
  }
  const baseline = {
    version: 2,
    note: 'Zero-debt production visual-system lock. Active UI has no legacy allowance.',
    files: {},
  };
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Visual-system baseline updated: ${normalize(path.relative(root, baselinePath))}`);
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error('Visual-system guard failed: scripts/visual-system-legacy-baseline.json is missing.');
  console.error('Create it only after reviewing every finding: node scripts/check-visual-system.mjs --update-baseline');
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
if (Object.keys(baseline.files ?? {}).length > 0) {
  console.error('Visual-system guard failed: the committed baseline must remain empty.');
  process.exit(1);
}

const regressions = toRegressions(current);

if (regressions.length > 0) {
  printRegressions(regressions);
  process.exit(1);
}

const totals = Object.fromEntries(rules.map(rule => [rule.key, 0]));
for (const result of Object.values(current)) {
  for (const [key, count] of Object.entries(result.counts)) totals[key] += count;
}

console.log('Visual-system guard passed: the active production UI is token-only with zero legacy allowance.');
console.log(`Active production findings: ${rules.map(rule => `${rule.key}=${totals[rule.key]}`).join(', ')}`);

if (reportCurrent) {
  const rows = Object.entries(current)
    .map(([file, result]) => ({
      file,
      total: Object.values(result.counts).reduce((sum, count) => sum + count, 0),
      counts: result.counts,
    }))
    .sort((a, b) => b.total - a.total || a.file.localeCompare(b.file));
  console.log('\nCurrent findings by file:');
  for (const row of rows) {
    const detail = rules
      .map(rule => `${rule.key}=${row.counts[rule.key] ?? 0}`)
      .join(', ');
    console.log(`- ${row.file}: total=${row.total}; ${detail}`);
  }
}
