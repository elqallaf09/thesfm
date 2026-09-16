import { it } from 'vitest';
import { secureFetch } from '../../src/lib/sharia-research/secureFetch';
import { loadSecSubmissions, secFilingDocumentUrl } from '../../src/lib/sharia-research/secData';
import { parseInlineXbrlFacts } from '../../src/lib/sharia-research/inlineXbrl';

it('inspect unresolved public statement and fund evidence', async () => {
  const emit=(source:string,data:unknown)=>console.log('SOURCE_PROBE '+JSON.stringify({source,data}));
  const get=async(url:string,maxBytes=15*1024*1024)=>secureFetch(url,{signal:AbortSignal.timeout(25000),maxBytes,headers:{'user-agent':'THE-SFM admin@the-sfm.com'}});
  const {CanvasFactory}=await import('pdf-parse/worker'); const {PDFParse}=await import('pdf-parse');
  for(const [name,url,pages] of [
    ['IFA','https://www.ifakuwait.com/pdf/2025/EN/IFA_FS_31-12-2025-EN.pdf',[1,2,3,4,5,6,7,8]],
    ['KFH','https://www.kfh.com/en/reports/kuwait/Annual-Reports/Annual-Report-2025/document_en/KFH%20Annual%20Report%20En%202025%20(Draft-17)%20Web.pdf.pdf',[86,87,89]],
    ['BOUBYAN','https://www.bankboubyan.com/media/filer_public/60/37/6037dab5-8d89-4ec5-93eb-cc87d58cf16e/english_-_boubyan_bank_e_30_june_2026.pdf',[3,9]],
  ] as const){
    let parser:InstanceType<typeof PDFParse>|undefined;
    try { const r=await get(url); parser=new PDFParse({data:r.body,CanvasFactory}); const text=await parser.getText({partial:[...pages]});
      emit(name,text.pages.map(p=>({num:p.num,length:p.text.length,snippet:name==='IFA'?p.text.slice(0,1000):undefined,
        headers:[...p.text.matchAll(/(?:^|\n)[ \t]*(?:INTERIM CONDENSED )?CONSOLIDATED STATEMENT OF (?:FINANCIAL POSITION|INCOME|PROFIT OR LOSS|CASH FLOWS)/g)].map(m=>p.text.slice(m.index!,m.index!+1250)),
        dated:[...p.text.matchAll(/authorised for issue|[Tt][Oo][Tt][Aa][Ll] [Aa][Ss][Ss][Ee][Tt][Ss]|registered as/g)].map(m=>p.text.slice(Math.max(0,m.index!-80),m.index!+350)).slice(0,8)})));
    }catch(e){emit(name,{error:e instanceof Error?e.message:'error'});}finally{await parser?.destroy();}
  }
  for(const [ticker,cik] of [['ORCL','0001341439'],['MSFT','0000789019'],['BAC','0000070858']]){
    try{ const sub=await loadSecSubmissions(cik,AbortSignal.timeout(20000));const f=sub.filings.find(f=>['10-K','10-Q'].includes(f.form))!;const r=await get(secFilingDocumentUrl(cik,f));const html=new TextDecoder().decode(r.body);const parsed=parseInlineXbrlFacts(html,cik,f);
      emit(ticker,{filing:f,tags:Object.fromEntries(Object.entries(parsed.facts?.['us-gaap']??{}).filter(([tag])=>/NotesPayable|Borrow|InvestmentIncome|InterestIncome/.test(tag))),
        raw:[...html.matchAll(/<ix:nonFraction\b[^>]*name="[^"]*(?:InvestmentIncome|NotesPayable|InterestIncome)[^"]*"[^>]*>[\s\S]*?<\/ix:nonFraction>/g)].slice(0,18).map(m=>m[0]),
        principal:html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').match(/.{0,120}(?:bank holding company|financial holding company|Interest and dividends income).{0,180}/gi)?.slice(0,4)});
    }catch(e){emit(ticker,{error:e instanceof Error?e.message:'error'});}
  }
  try{
    const d=await get('https://www.sec.gov/files/company_tickers_mf.json',6*1024*1024);const directory=JSON.parse(new TextDecoder().decode(d.body));
    const tickIndex=directory.fields.indexOf('ticker'); const selected=directory.data.filter((r:unknown[])=>['QQQ','VOO','VTI'].includes(String(r[tickIndex])));
    emit('FUND_DIRECTORY',{fields:directory.fields,data:selected});
    for(const row of selected){const record=Object.fromEntries(directory.fields.map((k:string,i:number)=>[k,row[i]]));
      const sub=await loadSecSubmissions(String(record.cik),AbortSignal.timeout(20000));const filings=sub.filings.filter(f=>f.form.startsWith('NPORT')).slice(0,5);emit(String(record.ticker),{registrant:sub.payload.name,filings});
      for(const f of filings.slice(0,2)){const url=secFilingDocumentUrl(String(record.cik),f);try{const r=await get(url);const text=new TextDecoder().decode(r.body);emit(String(record.ticker)+'_NPORT',{url,final:r.finalUrl,type:r.contentType,length:text.length,start:text.slice(0,1800),investment:text.slice(Math.max(0,text.indexOf('<invstOrSec>')),text.indexOf('<invstOrSec>')+2500)});}catch(e){emit(String(record.ticker)+'_NPORT',{url,error:e instanceof Error?e.message:'error'});}}
    }
  }catch(e){emit('FUND_DIRECTORY',{error:e instanceof Error?e.message:'error'});}
},300000);
