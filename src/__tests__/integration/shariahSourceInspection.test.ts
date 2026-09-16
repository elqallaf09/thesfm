import { describe,it } from 'vitest';
import { secureFetch } from '@/lib/sharia-research/secureFetch';
import { extractSelectedPdfPages } from '@/lib/sharia-research/pdfFinancialEvidence';
const get=async(url:string)=>{const r=await secureFetch(url,{maxBytes:8_000_000,signal:AbortSignal.timeout(25000)});return {r,text:new TextDecoder().decode(r.body)}};
const scrub=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,400);
describe.skipIf(process.env.SFM_SOURCE_INSPECT!=='1')('remaining public primary-source shapes',()=>{
 it('QQQ advertised holdings client protocol',async()=>{const {text}=await get('https://www.invesco.com/qqq-etf/en/about.html');
 console.log('QQQ_DATA_ATTRS',[...text.matchAll(/.{0,150}(?:top10-holdings|top10holdings|view-all-holdings|fundData|data-fund|data-endpoint|data-api|holdingsData).{0,700}/gi)].slice(-12).map(m=>m[0]));
 const scripts=[...text.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m=>m[1]).filter(s=>/view-all-holdings|top10Holdings/.test(s));
 for(const script of scripts){const js=await get(new URL(script,'https://www.invesco.com').href);console.log('QQQ_JS',script,js.text.slice(0,17000));}
 },60000);
 it('Vanguard structured official product-data keys',async()=>{for(const url of ['https://advisors.vanguard.com/investments/products/voo/vanguard-sp-500-etf','https://advisors.vanguard.com/investments/products/vti/vanguard-morningstar-total-stock-market-etf']){
 const {text}=await get(url);const start=text.indexOf('window.__INITIAL_FUND_DATA__');console.log('VANGUARD_INITIAL',url,text.slice(start,start+12000));
 const script=[...text.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m=>m[1]).find(s=>/assets\/index-/.test(s));
 if(script){const base=/<base[^>]+href=["']([^"']+)["']/.exec(text)?.[1]??url;const js=await get(new URL(script,new URL(base,url)).href).catch(()=>null);if(js)console.log('VANGUARD_JS_HINTS',[...js.text.matchAll(/.{0,180}(?:holdings|holdingsExport|exportHold|portfolio-holding|api\/fund|funds\/|Holdings).{0,240}/g)].slice(0,35).map(m=>m[0]));}
 }},65000);
 it('KFH complete balance/income sections in the original spread',async()=>{const url='https://www.kfh.com/en/reports/kuwait/Annual-Reports/Annual-Report-2025/document_en/KFH%20Annual%20Report%20En%202025%20(Draft-17)%20Web.pdf.pdf';const {r}=await get(url);const pages=await extractSelectedPdfPages(new Uint8Array(r.body),[86,87,88,89]);for(const p of pages)for(const m of p.text.matchAll(/CONSOLIDATED STATEMENT OF (?:FINANCIAL POSITION|INCOME)/g))console.log('KFH_STATEMENT',p.num,p.text.slice(m.index,m.index+2400));},40000);
 it.each(['https://www.cbk.gov.kw/en/supervision/regulated-entities/kuwaiti-banks/conventional-banks','https://www.cbk.gov.kw/en/supervision/regulated-entities/kuwaiti-banks/islamic-banks','https://www.spdrgoldshares.com/usa/','https://www.alrajhi-capital.sa/en/'])('official classification or fund directory %s',async url=>{try{const {text,r}=await get(url);console.log('PRIMARY_PAGE',JSON.stringify({url:r.finalUrl,headings:[...text.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)].map(m=>scrub(m[1])).slice(0,24),links:[...text.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].filter(m=>/sharia|prospect|financial|document|gold bar|custod|\.pdf/i.test(m[0])).slice(0,20).map(m=>({url:m[1],label:scrub(m[2])}))}));}catch(e){console.log('PRIMARY_PAGE_ERROR',url,String(e));}},30000);
});
