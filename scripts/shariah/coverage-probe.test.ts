import { it } from 'vitest';
import { secureFetch } from '../../src/lib/sharia-research/secureFetch';
import { loadSecCompanyDirectory, loadSecSubmissions, secFilingDocumentUrl } from '../../src/lib/sharia-research/secData';
import { parseInlineXbrlFacts } from '../../src/lib/sharia-research/inlineXbrl';
import { issuerPdfLinks } from '../../src/lib/sharia-research/regionalFilings';

// Temporary public-source inspection only. No database, login or secret access.
it('inspect official public evidence layouts', async () => {
  const emit = (source: string, data: unknown) => console.log('SOURCE_PROBE ' + JSON.stringify({source, data}));
  const directories = ['https://www.ifakuwait.com/financial-statements.html', 'https://ifakuwait.com/financial-statements.html'];
  for (const url of directories) {
    try {
      const response = await secureFetch(url, {signal: AbortSignal.timeout(20000), maxBytes: 5_000_000, acceptedContentTypes:['text/html']});
      const text = new TextDecoder().decode(response.body);
      emit(url, {finalUrl:response.finalUrl, discovered:issuerPdfLinks(text,url), anchors:[...text.matchAll(/<a\b[^>]*href=["']([^"']*\.pdf)["'][^>]*>[\s\S]*?<\/a>/gi)].slice(0,6).map(m=>({url:m[1],context:text.slice(Math.max(0,m.index!-300),m.index!+m[0].length).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')}))});
    } catch(error) {emit(url, {error:error instanceof Error?error.message:'error'});}
  }
  const documents = [
    ['IFA','https://ifakuwait.com/pdf/2025/EN/IFA_FS_31-12-2025-EN.pdf'],
    ['KFH','https://www.kfh.com/en/reports/kuwait/Annual-Reports/Annual-Report-2025/document_en/KFH%20Annual%20Report%20En%202025%20(Draft-17)%20Web.pdf.pdf'],
    ['BOUBYAN','https://www.bankboubyan.com/media/filer_public/60/37/6037dab5-8d89-4ec5-93eb-cc87d58cf16e/english_-_boubyan_bank_e_30_june_2026.pdf'],
    ['NBK','https://www.nbk.com/dam/jcr:a9b5fda4-e785-4705-8938-9a2364b06360/nbk-fs-2q-2026-e.pdf']
  ];
  const {CanvasFactory}=await import('pdf-parse/worker'); const {PDFParse}=await import('pdf-parse');
  for (const [name,url] of documents) {
    let parser: InstanceType<typeof PDFParse> | undefined;
    try {
      const response=await secureFetch(url,{signal:AbortSignal.timeout(25000),maxBytes:15*1024*1024,acceptedContentTypes:['application/pdf']});
      parser=new PDFParse({data:response.body,CanvasFactory});
      const info=await parser.getInfo({parsePageInfo:false});
      const text=await parser.getText({partial:Array.from({length:Math.min(Number(info.total),145)},(_,i)=>i+1)});
      const pages=text.pages.filter(p=>/CONSOLIDATED\s+(?:(?:STATEMENT|INCOME|BALANCE)|(?:FINANCIAL POSITION))/i.test(p.text) || /authorised for issue|incorporated.*Kuwait|principal activities/i.test(p.text)).slice(0,12);
      emit(name,{finalUrl:response.finalUrl,totalPages:info.total,pages:pages.map(p=>({num:p.num,header:p.text.slice(0,1500),rows:p.text.split('\n').filter(x=>/total assets|total liabilities|interest income|authorised|principal activit|registered|incorporated|operating income|revenue|cash and cash/i.test(x)).slice(0,16)}))});
    } catch(error) {emit(name,{error:error instanceof Error?error.message:'error'});} finally {await parser?.destroy();}
  }
  const companies=await loadSecCompanyDirectory(AbortSignal.timeout(20000));
  for (const ticker of ['MSFT','AAPL','NVDA','ORCL','BAC']) {
    try {
      const company=companies.find(c=>c.ticker===ticker)!; const submissions=await loadSecSubmissions(company.cik,AbortSignal.timeout(20000));
      const filing=submissions.filings.find(f=>['10-Q','10-K'].includes(f.form))!; const url=secFilingDocumentUrl(company.cik,filing);
      const response=await secureFetch(url,{signal:AbortSignal.timeout(20000),maxBytes:15*1024*1024,acceptedContentTypes:['text/html'],headers:{'user-agent':'THE-SFM admin@the-sfm.com'}});
      const html=new TextDecoder().decode(response.body); const parsed=parseInlineXbrlFacts(html,company.cik,filing);
      const current=Object.entries(parsed.facts?.['us-gaap']??{}).filter(([tag])=>/Interest.*Income|Income.*Interest|Debt|Receivable|Marketable|ShortTermInvest|Liabilities|Revenue/.test(tag));
      const custom=[...new Set([...html.matchAll(/name=["']([^"']+)["']/g)].map(m=>m[1]).filter(tag=>!tag.startsWith('us-gaap:')&&/Interest|Debt|Receivable|Revenue/i.test(tag)))].slice(0,30);
      emit(ticker,{cik:company.cik,name:submissions.payload.name,filing,url,tags:Object.fromEntries(current),custom});
    } catch(error) {emit(ticker,{error:error instanceof Error?error.message:'error'});}
  }
},300000);
