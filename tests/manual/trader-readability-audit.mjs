import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src/trader-app/public');
const out = '.artifacts/trader-surface-audit';
await mkdir(out, { recursive: true });
const tokens = (await Promise.all(['tokens.css', 'themes.css'].map(f => readFile(path.resolve('src/styles', f), 'utf8')))).join('\n');
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    response.setHeader('cache-control', 'no-store');
    if (url.pathname === '/host') {
      const route = url.searchParams.get('route');
      if (!/^[a-z-]+$/.test(route || '')) throw new Error('Invalid route');
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.end(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}iframe{display:block;border:0;width:100%;height:1500px}</style></head><body><iframe name="trader" title="Isolated Trader" src="/thesfm-trader-own/app/index.html?route=${route}"></iframe></body></html>`);
      return;
    }
    const file = decodeURIComponent(url.pathname).replace(/^\/thesfm-trader-own\/app\//, '').replace(/^\/+/, '');
    if (file === 'semantic-tokens.css') { response.setHeader('content-type', 'text/css'); response.end(tokens); return; }
    const resolved = path.resolve(root, file);
    if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Invalid path');
    const data = await readFile(resolved);
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
    response.setHeader('content-type', mime[path.extname(resolved)] || 'application/octet-stream');
    response.end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const reports = [];
try {
  for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ theme }) => {
      localStorage.setItem('sfm_lang', 'ar');
      localStorage.setItem('the-sfm-theme', theme);
      localStorage.setItem('sfm-density', 'auto');
      localStorage.setItem('sfmTraderSettings:v1', JSON.stringify({ defaultMarket: 'us-stocks', quickTickerVisible: false }));
    }, { theme });
    await context.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: false, status: 'unavailable', items: [], data: [], recommendations: [], followedTrades: [], dataProvider: { configured: false, status: 'disconnected' } }) }));
    const page = await context.newPage();
    let errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['dashboard', 'markets', 'watchlist', 'portfolio', 'alerts', 'trade-performance', 'news', 'calendar', 'settings', 'ai-scanner', 'symbol-details', 'education']) {
      errors = [];
      await page.goto(`${origin}/host?route=${route}`, { waitUntil: 'domcontentloaded' });
      await page.frameLocator('iframe').locator('.terminal-content').waitFor({ state: 'visible' });
      const frame = page.frame({ name: 'trader' });
      await frame.waitForFunction(() => document.querySelector('.terminal-content')?.textContent.trim().length > 100);
      await frame.evaluate(() => document.fonts.ready);
      const report = await frame.evaluate(() => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const rgba = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1); const a = [...ctx.getImageData(0,0,1,1).data]; a[3] /= 255; return a; };
        const blend = (a,b) => a.slice(0,3).map((v,i) => v*a[3]+b[i]*(1-a[3]));
        const lum = a => a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
        const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
        const background = e => {
          if (!e) return [255,255,255];
          const style = getComputedStyle(e);
          if (style.backgroundImage !== 'none') return null;
          const color = rgba(style.backgroundColor);
          if (color[3] === 1) return color;
          const behind = background(e.parentElement);
          return behind ? blend(color, behind) : null;
        };
        const entries = [];
        for (const element of document.querySelectorAll('body *')) {
          if (['SCRIPT','STYLE','SVG','PATH','OPTION'].includes(element.tagName)) continue;
          const text = [...element.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
          if (!text || !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
          const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
          const style = getComputedStyle(element); const bg = background(element); let opacity = 1;
          for (let p=element; p; p=p.parentElement) opacity *= Number(getComputedStyle(p).opacity);
          const fg = rgba(style.color); fg[3] *= opacity;
          entries.push({ tag: element.tagName, cls: typeof element.className === 'string' ? element.className : '', id: element.id, text: text.slice(0,140), size: parseFloat(style.fontSize), weight: style.fontWeight, color: style.color, bg, opacity, contrast: bg ? ratio(blend(fg,bg),bg) : null, disabled: Boolean(element.closest(':disabled,[aria-disabled="true"]')), rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } });
        }
        const buttons = [...document.querySelectorAll('button,a,input,select')].filter(e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(e=>({id:e.id,cls:e.className,text:e.innerText||e.getAttribute('aria-label'),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, entries, buttons };
      });
      report.route = route; report.theme = theme; report.errors = [...errors]; reports.push(report);
      console.log(JSON.stringify({ width, theme, route, overflow: report.scrollWidth-width, errors, low: report.entries.filter(e=>e.contrast!==null && !e.disabled && e.contrast<4.5).map(e=>({cls:e.cls,text:e.text,contrast:e.contrast,size:e.size,color:e.color})) }));
      await page.screenshot({ path: `${out}/${width}-${theme}-${route}.png` });
    }
    await context.close();
  }
} finally {
  await writeFile(`${out}/audit.json`, JSON.stringify(reports, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
