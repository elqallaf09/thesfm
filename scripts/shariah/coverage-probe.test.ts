import { it } from 'vitest';
import { secureFetch } from '../../src/lib/sharia-research/secureFetch';
import { loadSecSubmissions, secFilingDocumentUrl } from '../../src/lib/sharia-research/secData';
import { extractSelectedPdfPages, pdfEvidenceDocument, financialValuesFromPdfPages } from '../../src/lib/sharia-research/pdfFinancialEvidence';
import { security } from '../../src/__tests__/unit/shariaEvidenceFixtures';
it('inspect remaining official evidence', async () => {
  const emit=(source:string,data:unknown)=>console.log('SOURCE_PROBE '+JSON.stringify({source,data}));
  const get=async(url:string,maxBytes=15*1024*1024)=>secureFetch(url,{signal:AbortSignal.timeout(25000),maxBytes,headers:{'user-agent':'THE-SFM admin@the-sfm.com'}});
  for(const [name,url] of [
    ['IFA','https://www.ifakuwait.com/pdf/annual-report/2025/IFA_Holding_Annual_Report_2025-English.pdf'],
    ['KFH','https://www.kfh.com/en/home/Investor-Relations/Annual-Reports/Annual-Reports.html'],
    ['BOUBYAN','https://www.bankboubyan.com/media/filer_public/60/37/6037dab5-8d89-4ec5-93eb-cc87d58cf16e/english_-_boubyan_bank_e_30_june_2026.pdf']]) {
    try {const r=await get(url);if(name==='KFH'){const html=new TextDecoder().decode(r.body);emit(name,{links:[...html.matchAll(/href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].filter(m=>/financial|quarter|interim/i.test(m[0])).slice(0,16).map(m=>({url:m[1],label:m[2].replace(/<[^>]+>/g,' ').slice(0,120)}))});continue;}
      const pages=await extractSelectedPdfPages(r.body);const issuer={...security,name:name==='IFA'?'International Financial Advisors':'Boubyan Bank',ticker:name,canonicalId:`XKUW:${name}`,country:'KW',exchange:'Boursa Kuwait'};const doc=pdfEvidenceDocument(pages,issuer,r.finalUrl,r.retrievedAt);const values=financialValuesFromPdfPages(pages,issuer,doc,name==='IFA'?/International Financial Advis[oe]rs|IFA Holding/i:/Boubyan Bank/i);
      emit(name,{url:r.finalUrl,pages:pages.map(p=>({page:p.num,length:p.text.length,header:p.text.slice(0,160)})),values});
    }catch(e){emit(name,{error:e instanceof Error?e.message:'error'});}
  }
  try{const r=await get('https://www.sec.gov/files/company_tickers_mf.json',6*1024*1024);const directory=JSON.parse(new TextDecoder().decode(r.body));const ix=directory.fields.indexOf('symbol');const rows=directory.data.filter((r:unknown[])=>['QQQ','VOO','VTI'].includes(String(r[ix])));emit('FUND_DIRECTORY',{fields:directory.fields,data:rows});
    for(const row of rows){const record=Object.fromEntries(directory.fields.map((k:string,i:number)=>[k,row[i]]));const sub=await loadSecSubmissions(String(record.cik),AbortSignal.timeout(20000));const filings=sub.filings.filter(f=>f.form.startsWith('NPORT')).slice(0,6);emit(String(record.symbol),{registrant:sub.payload.name,filings});
      for(const f of filings.slice(0,2)){try{const url=secFilingDocumentUrl(String(record.cik),f);const d=await get(url);const text=new TextDecoder().decode(d.body);const p=text.indexOf('<invstOrSec>');emit(String(record.symbol)+'_NPORT',{url,final:d.finalUrl,length:text.length,start:text.slice(0,1500),investment:p>=0?text.slice(p,p+1400):null});}catch(e){emit(String(record.symbol)+'_NPORT',{error:e instanceof Error?e.message:'error'});}}
    }
  }catch(e){emit('FUND_DIRECTORY',{error:e instanceof Error?e.message:'error'});}
},300000);
