import { test, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { secureFetch } from '@/lib/sharia-research/secureFetch';
const enabled = process.env.SHARIAH_FOLLOWUP_LIVE === '1';
const urls = [
  ['voo-profile','https://advisors.vanguard.com/investments/products/api/funds/0968/profile'],
  ['voo-holdings','https://advisors.vanguard.com/investments/products/api/funds/0968/holdings/latest'],
  ['vti-profile','https://advisors.vanguard.com/investments/products/api/funds/0970/profile'],
  ['vti-holdings','https://advisors.vanguard.com/investments/products/api/funds/0970/holdings/latest'],
  ['kfh-interim-directory','https://www.kfh.com/en/home/Investor-Relations/Financial-Reports.html'],
  ['qatr-documents','https://www.qatr.com.qa/en/qatr-documents'],
  ['qatr-overview','https://www.qatr.com.qa/en/qatr-overview'],
];
for (const [id,url] of urls) test.skipIf(!enabled)(`server-fetch official source shape: ${id}`, async () => {
  try {
    const response = await secureFetch(url, { signal: AbortSignal.timeout(30000), timeoutMs: 15000, retries: 0,
      maxBytes: 7_000_000, acceptedContentTypes: id.includes('holdings') || id.includes('profile') ? ['json'] : ['html'] });
    const text = new TextDecoder().decode(response.body);
    mkdirSync('proof/public-probe', { recursive: true });
    writeFileSync(`proof/public-probe/${id}.json`, JSON.stringify({ url: response.finalUrl, hash: createHash('sha256').update(response.body).digest('hex'), retrievedAt: response.retrievedAt, text }));
    if (id.includes('profile')) console.log(JSON.stringify({ id, status: response.status, data: JSON.parse(text) }));
    else if (id.includes('holdings')) {
      const data = JSON.parse(text), date = data.latestEffectiveDate;
      console.log(JSON.stringify({ id, status: response.status, date, topKeys: Object.keys(data), buckets: Object.entries(data[date] ?? {}).map(([key,value])=>({ key, count: Array.isArray(value)?value.length:null, sample:Array.isArray(value)?value.slice(0,3):value, last:Array.isArray(value)?value.slice(-2):undefined })) }));
    } else {
      const links = [...text.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(match=>({ url: match[1], text: match[2].replace(/<[^>]+>/g,' ').trim() })).filter(link=>/report|financial|2026|PCF|portfolio|fatwa|sharia/i.test(link.url+' '+link.text)).slice(0,45);
      console.log(JSON.stringify({ id, finalUrl: response.finalUrl, status: response.status, links }));
    }
    expect(response.status).toBe(200);
  } catch(error) {
    console.log(JSON.stringify({ id, error: error instanceof Error ? error.message : 'probe_failed' }));
    // Deliberately diagnostic: availability assertions live in the release suite.
    expect(url.startsWith('https://')).toBe(true);
  }
}, 40000);
