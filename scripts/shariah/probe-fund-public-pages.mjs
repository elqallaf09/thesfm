import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Public browsing only. No platform secrets, login, auth-state files or traces.
const targets = [
  ['qqq', 'https://www.invesco.com/qqq-etf/en/about.html', ['invesco.com']],
  ['voo', 'https://advisors.vanguard.com/investments/products/voo/vanguard-sp-500-etf', ['vanguard.com']],
  ['vti', 'https://advisors.vanguard.com/investments/products/vti/vanguard-total-stock-market-etf', ['vanguard.com']],
  ['gld', 'https://www.spdrgoldshares.com/usa/', ['spdrgoldshares.com','ssga.com']],
  ['slv', 'https://www.ishares.com/us/products/239855/ishares-silver-trust-fund', ['ishares.com','blackrock.com']],
  ['qatr', 'https://www.qatr.com.qa/en/etf-index', ['qatr.com.qa']],
];
const safeUrl = value => {
  const url = new URL(value);
  for (const key of [...url.searchParams.keys()]) if (/key|token|signature|secret|auth|session|cookie/i.test(key)) url.searchParams.delete(key);
  return url.toString();
};
const allowed = (url, domains) => domains.some(domain => new URL(url).hostname === domain || new URL(url).hostname.endsWith('.'+domain));
mkdirSync('proof/public-probe', { recursive: true });
const browser = await chromium.launch();
try {
  for (const [id, url, domains] of targets) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const responses = [], pending = [];
    page.on('response', response => {
      if (!allowed(response.url(), domains) || !/json/i.test(response.headers()['content-type'] ?? '')
        || responses.length + pending.length >= 20 || !/hold|portfolio|fund|product|position|profile|data|api/i.test(response.url())) return;
      pending.push((async () => {
        try {
          const body = await response.text();
          if (body.length > 5_000_000) return;
          const data = JSON.parse(body);
          responses.push({ url: safeUrl(response.url()), status: response.status(), data });
        } catch { /* no availability claim from an unreadable public response */ }
      })());
    });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(14000);
      for (const label of ['Portfolio', 'Holdings', 'Portfolio composition']) {
        const tab = page.getByRole('tab', { name: label, exact: true }).first();
        if (await tab.isVisible().catch(()=>false)) { await tab.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(3500); }
      }
      await Promise.race([Promise.allSettled(pending), new Promise(resolve=>setTimeout(resolve,5000))]);
      const html = await page.content();
      const text = (await page.locator('body').innerText()).slice(0,90000);
      const links = await page.locator('a[href]').evaluateAll(elements=>elements.map(a=>({text:a.textContent?.trim(),href:a.href})).filter(a=>/hold|prospect|annual|fatwa|sharia|fact|csv|xlsx|portfolio|financial|document/i.test((a.text??'')+' '+a.href)).slice(0,80));
      writeFileSync(`proof/public-probe/${id}-page.json`, JSON.stringify({ url: safeUrl(page.url()), text, links, responses }, null, 2));
      writeFileSync(`proof/public-probe/${id}-page.html`, html);
      console.log(JSON.stringify({ id, url: safeUrl(page.url()), links: links.map(item=>({...item,href:safeUrl(item.href)})),
        relevantText: text.split('\n').filter((line,index,lines)=>/holdings|portfolio composition|custod|allocated|lending|derivativ|futures|sharia|fatwa|as of|as at|constituents|2026|2025/i.test(line)||/as of|as at/i.test(lines[index-1]??'')).slice(0,100),
        responses: responses.map(item=>({ url:item.url,status:item.status,keys:typeof item.data==='object'&&item.data?Object.keys(item.data).slice(0,25):[],sample:JSON.stringify(item.data).slice(0,5000) })) }));
    } catch(error) { console.log(JSON.stringify({id, error: String(error?.message??'public_page_unavailable').slice(0,500)})); }
    await context.close();
  }
} finally { await browser.close(); }
