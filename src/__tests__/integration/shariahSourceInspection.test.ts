import { describe,it,expect } from 'vitest';
import { createHash } from 'node:crypto';
import { secureFetch } from '@/lib/sharia-research/secureFetch';
import { extractSelectedPdfPages } from '@/lib/sharia-research/pdfFinancialEvidence';
const get=async(url:string,maxBytes=5_000_000)=>{const r=await secureFetch(url,{maxBytes,signal:AbortSignal.timeout(25000)});return {r,text:new TextDecoder().decode(r.body)}};
const scrub=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,500);
describe.skipIf(process.env.SFM_SOURCE_INSPECT!=='1')('remaining public primary-source shapes',()=>{
 it('QQQ advertised holdings data',async()=>{const {text}=await get('https://www.invesco.com/qqq-etf/en/about.html');
 const attrs=[...text.matchAll(/data-[\w-]*(?:holdings-api|api-url)[\w-]*=["']([^"']+)["']/g)].map(m=>m[1].replaceAll('&amp;','&'));
 console.log('QQQ_ENDPOINTS',attrs);
 for(const url of [...new Set(attrs)].slice(0,3)){const u=new URL(url,'https://www.invesco.com');if(!u.hostname.endsWith('invesco.com'))continue;try{const data=await get(u.href);const parsed=JSON.parse(data.text);console.log('QQQ_DATA',u.href,JSON.stringify({keys:Object.keys(parsed),date:parsed.effectiveDate,count:parsed.holdings?.length,meta:Object.fromEntries(Object.entries(parsed).filter(([k])=>k!=='holdings')),sample:parsed.holdings?.slice(0,2),last:parsed.holdings?.slice(-2)}));}catch(e){console.log('QQQ_DATA_ERROR',String(e));}}
 },50000);
 it('Vanguard public API base and export mappings',async()=>{const url='https://advisors.vanguard.com/investments/products/voo/vanguard-sp-500-etf';const {text}=await get(url);
 const script=[...text.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m=>m[1]).find(s=>/assets\/index-/.test(s))!;
 const base=/<base[^>]+href=["']([^"']+)["']/.exec(text)?.[1]??url;
 const jsUrl=new URL(script,new URL(base,url)).href;const js=await get(jsUrl);
 console.log('VANGUARD_BASE',jsUrl,[...js.text.matchAll(/.{0,140}(?:function Vo\(|Vo=|PDP_API|apiBase|api\.vanguard|\/api\/|product-details-api|apiUrl|apiURL).{0,230}/g)].slice(0,22).map(m=>m[0]));
 const exportPath=/["'](\.\/holdingsExportDataService-[\w-]+\.js)["']/.exec(js.text)?.[1];if(exportPath){const exp=await get(new URL(exportPath,jsUrl).href);console.log('VANGUARD_EXPORT',exp.text.slice(0,12000));}
 },45000);
 it('KFH source buffer and actual statement sections',async()=>{const url='https://www.kfh.com/en/reports/kuwait/Annual-Reports/Annual-Report-2025/document_en/KFH%20Annual%20Report%20En%202025%20(Draft-17)%20Web.pdf.pdf';const {r}=await get(url,15*1024*1024);const size=r.body.byteLength,hash=createHash('sha256').update(r.body).digest('hex');const pages=await extractSelectedPdfPages(r.body,[86,87,88,89]);expect(r.body.byteLength).toBe(size);expect(createHash('sha256').update(r.body).digest('hex')).toBe(hash);
 for(const p of pages)for(const m of p.text.matchAll(/CONSOLIDATED STATEMENT OF (?:FINANCIAL POSITION|INCOME)/g))console.log('KFH_STATEMENT',p.num,p.text.slice(m.index,m.index+1700));
 },40000);
 it('CBK issuer blocks and Saudi guideline publications',async()=>{for(const url of ['https://www.cbk.gov.kw/en/supervision/regulated-entities/kuwaiti-banks/conventional-banks','https://www.cbk.gov.kw/en/supervision/regulated-entities/kuwaiti-banks/islamic-banks','https://www.alrajhi-capital.sa/shariah-group/about-us-guidelines']){try{const {text}=await get(url);if(url.includes('cbk.gov'))console.log('BANK_BLOCKS',[...text.matchAll(/<h4\b[^>]*>[\s\S]*?(?=<h4\b|$)/gi)].filter(m=>/National Bank of Kuwait|Kuwait Finance House|Boubyan Bank/i.test(m[0])).map(m=>m[0].slice(0,3200)));else console.log('SAUDI_LINKS',[...text.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].filter(m=>/\.pdf|\.xlsx|\.xls|2026|2025/i.test(m[0])).slice(-15).map(m=>({url:m[1],text:scrub(m[2])})));}catch(e){console.log('SOURCE_ERROR',url,String(e));}}},90000);
});
