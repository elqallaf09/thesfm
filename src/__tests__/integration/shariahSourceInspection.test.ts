import { describe, it } from 'vitest';
import { secureFetch } from '@/lib/sharia-research/secureFetch';
import { extractSelectedPdfPages } from '@/lib/sharia-research/pdfFinancialEvidence';
import { issuerPdfLinks } from '@/lib/sharia-research/regionalFilings';

const issuers = [
 ['IFA','https://www.ifakuwait.com/financial-statements.html','https://www.ifakuwait.com/pdf/2025/EN/IFA_FS_31-12-2025-EN.pdf'],
 ['NBK','https://www.nbk.com/investor-relations.html','https://www.nbk.com/dam/jcr:a9b5fda4-e785-4705-8938-9a2364b06360/nbk-fs-2q-2026-e.pdf'],
 ['BOUBYAN','https://www.bankboubyan.com/en/investor-relations','https://www.bankboubyan.com/media/filer_public/60/37/6037dab5-8d89-4ec5-93eb-cc87d58cf16e/english_-_boubyan_bank_e_30_june_2026.pdf'],
 ['KFH','https://www.kfh.com/en/home/Investor-Relations/Annual-Reports/Annual-Reports.html','https://www.kfh.com/en/reports/kuwait/Annual-Reports/Annual-Report-2025/document_en/KFH%20Annual%20Report%20En%202025%20(Draft-17)%20Web.pdf.pdf'],
];
describe.skipIf(process.env.SFM_SOURCE_INSPECT !== '1')('bounded public-source layout inspection, no production credentials', () => {
 it.each(issuers)('%s current discovery and primary financial headings', async (symbol,directory,url) => {
  try {
   const response = await secureFetch(directory, { maxBytes: 5_000_000, signal: AbortSignal.timeout(20000), acceptedContentTypes:['text/html'] });
   const html = new TextDecoder().decode(response.body);
   console.log('DIRECTORY', JSON.stringify({symbol,finalUrl:response.finalUrl,links:issuerPdfLinks(html,directory).slice(0,5),pdfAnchors:[...html.matchAll(/.{0,100}href=["'][^"']+\.pdf[^"']*["'].{0,100}/gi)].slice(0,8).map(m=>m[0])}));
  } catch(error) { console.log('DIRECTORY_ERROR',symbol,String(error)); }
  try {
   const response = await secureFetch(url, { maxBytes:15*1024*1024, signal:AbortSignal.timeout(25000),acceptedContentTypes:['application/pdf'] });
   const pages = await extractSelectedPdfPages(response.body,symbol==='KFH'?[83,84,85,86,87,88,89,90,91,92]:[]);
   console.log('PDF_LAYOUT',JSON.stringify({symbol,url:response.finalUrl,bytes:response.body.byteLength,pages:pages.map(p=>({num:p.num,chars:p.text.length})),statements:pages.filter(p=>/CONSOLIDATED.*(?:STATEMENT|BALANCE)|STATEMENT.*(?:PROFIT|INCOME|POSITION)|INDEPENDENT AUDITORS|REPORT ON REVIEW OF INTERIM/i.test(p.text)).map(p=>({num:p.num,header:p.text.slice(0,2100),relevant:p.text.split('\n').filter(line=>/total assets|total liabilities|interest income|operating income|cash and cash|principal|islamic bank|commercial bank|authorised|authorized|Kuwait|2026|2025/i.test(line)).slice(0,14)})).slice(0,10)}));
  } catch(error) { console.log('PDF_ERROR',symbol,String(error)); }
 },70000);
 it.each([
 'https://www.invesco.com/qqq-etf/en/about.html',
 'https://advisors.vanguard.com/investments/products/voo/vanguard-sp-500-etf',
 'https://advisors.vanguard.com/investments/products/vti/vanguard-morningstar-total-stock-market-etf',
 'https://www.spdrgoldshares.com/usa/financial-information/',
 'https://www.ishares.com/us/products/239855/ishares-silver-trust-fund',
 ])('official fund page: %s',async url=>{
  try {
   const res=await secureFetch(url,{maxBytes:5_000_000,signal:AbortSignal.timeout(20000),acceptedContentTypes:['text/html']});
   const html=new TextDecoder().decode(res.body);
   console.log('FUND_SOURCE',JSON.stringify({url:res.finalUrl,scripts:[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m=>m[1]).slice(-15),links:[...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g)].filter(m=>/holdings|prospectus|\.csv|\.xlsx|\.json|bar list|custod|annual report/i.test(m[0])).slice(0,24).map(m=>({url:m[1],label:m[2].replace(/<[^>]+>/g,' ').trim().slice(0,120)})),hints:[...html.matchAll(/.{0,100}(?:holdings|fundId|fund-id|downloadExcel|downloadCsv).{0,160}/gi)].slice(0,15).map(m=>m[0])}));
  }catch(error){console.log('FUND_ERROR',url,String(error));}
 },30000);
});
