const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
const APP_ROOT = process.cwd();
const APP_DIR = path.join(APP_ROOT, 'src', 'app');
const OUT_ROOT = path.join(APP_ROOT, 'artifacts', 'qa-full');
const SESSION = `session-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const OUT_DIR = path.join(OUT_ROOT, SESSION);
const SCREEN_DIR = path.join(OUT_DIR, 'screens');

function walkPages(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const pages = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'api') continue;
      pages.push(...walkPages(full));
      continue;
    }
    if (entry.isFile() && entry.name === 'page.tsx') {
      pages.push(full);
    }
  }
  return pages;
}

function routeFromPath(filePath) {
  const rel = path.relative(APP_DIR, filePath).replace(/\\/g, '/');
  const segments = rel.split('/').slice(0, -1); // remove page.tsx

  const transformed = segments
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith('(') && segment.endsWith(')')) return '';
      if (segment === '[slug]') return 'market-guide';
      if (segment === '[id]' || segment === '[clientId]' || segment === '[symbol]') return 'aapl';
      if (segment === '[market]') return 'stocks';
      if (segment === '[...path]') return 'index.html';
      return segment;
    })
    .filter((segment) => segment.length > 0)
    .join('/');

  const route = `/${transformed}`;
  return route === '//' ? '/' : route;
}

async function captureRoute(page, route, routeInfo, label, viewport) {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(String(err?.message || err));
  });

  const safeRoute = route === '/' ? 'home' : route.replace(/^\/+/, '').replace(/\//g, '__');
  const fileName = `${safeRoute}-${label}.png`;
  const outPath = path.join(SCREEN_DIR, fileName);

  try {
    const url = `${BASE}${route}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 18000 });
    await page.waitForLoadState('networkidle', { timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(500);

    const hasTransientDevCompileError = () => consoleErrors.some((message) => {
      const text = String(message || '');
      return text.includes('Invalid or unexpected token')
        || text.includes('Unexpected end of JSON input')
        || text.includes('Internal Server Error');
    });

    if (hasTransientDevCompileError()) {
      consoleErrors.length = 0;
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 18000 });
      await page.waitForLoadState('networkidle', { timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(700);
    }

    let snapshot = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        snapshot = await page.evaluate(() => {
          const doc = document.documentElement;
          return {
            scrollWidth: Math.ceil(doc.scrollWidth),
            innerWidth: Math.ceil(window.innerWidth),
            innerHeight: Math.ceil(window.innerHeight),
          };
        });
        break;
      } catch (error) {
        if (!String(error?.message || error).includes('Execution context was destroyed') || attempt === 2) {
          throw error;
        }
        await page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(300);
      }
    }

    routeInfo.overflow[label] = snapshot.scrollWidth > snapshot.innerWidth + 2;
    routeInfo.consoleErrorCount = Math.max(routeInfo.consoleErrorCount, consoleErrors.length);

    await page.screenshot({ path: outPath, fullPage: true });
    routeInfo.screenshots[label] = path.relative(APP_ROOT, outPath);
    return { success: true, overflow: routeInfo.overflow[label], errorCount: consoleErrors.length, errors: consoleErrors.slice(0, 3) };
  } catch (error) {
    return { success: false, error: `${error?.message || error}` };
  } finally {
    page.removeAllListeners();
  }
}

async function main() {
  const pages = walkPages(APP_DIR).map((pagePath) => ({
    file: pagePath,
    route: routeFromPath(pagePath),
  }));

  const routeSet = new Map();
  for (const item of pages) {
    if (!routeSet.has(item.route)) {
      routeSet.set(item.route, item.file);
    }
  }

  fs.mkdirSync(SCREEN_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const viewports = {
    desktop: { width: 1366, height: 768 },
    mobile: { width: 390, height: 844 },
  };

  const report = {
    timestamp: new Date().toISOString(),
    totalRoutes: routeSet.size,
    routes: [],
    issues: [],
  };

  let index = 0;
  for (const [route, file] of routeSet.entries()) {
    index += 1;
    console.log(`Capture ${index}/${routeSet.size}: ${route}`);
    const routeInfo = {
      route,
      sourceFile: path.relative(APP_ROOT, file),
      screenshots: {},
      overflow: {
        desktop: false,
        mobile: false,
      },
      consoleErrorCount: 0,
      error: null,
    };

    for (const [label, viewport] of Object.entries(viewports)) {
      const page = await browser.newPage({ viewport });
      const startMs = Date.now();
      const result = await captureRoute(page, route, routeInfo, label, viewport);
      await page.close();
      const duration = Date.now() - startMs;

      if (!result.success) {
        routeInfo.error = `${result.error}`;
        report.issues.push({ route, viewport: label, issue: 'capture-failed', error: result.error, durationMs: duration });
      } else {
        if (result.overflow) {
          report.issues.push({ route, viewport: label, issue: 'horizontal-overflow', detail: `${route}` });
        }
        if (result.errorCount > 0) {
          report.issues.push({ route, viewport: label, issue: 'console-errors', count: result.errorCount, messages: result.errors });
        }
      }
    }

    report.routes.push(routeInfo);
  }

  await browser.close();

  fs.writeFileSync(path.join(OUT_DIR, 'qa-report.json'), JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'routes.txt'), Array.from(routeSet.keys()).sort().join('\n'), 'utf8');
  console.log(JSON.stringify({ output: path.relative(APP_ROOT, OUT_DIR), total: routeSet.size, issueCount: report.issues.length }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
