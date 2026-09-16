import { describe, expect, it } from 'vitest';
import { financialValuesFromPdfPages, pdfEvidenceDocument } from '@/lib/sharia-research/pdfFinancialEvidence';
import { issuerPdfLinks, regionalProfile } from '@/lib/sharia-research/regionalFilings';
import { validFinancialValue } from '@/lib/sharia-research/evidenceValidation';
import { security } from './shariaEvidenceFixtures';
const now=new Date('2026-09-15T00:00:00Z');
const issuer={...security,ticker:'NBK',providerSymbol:'NBK.KW',name:'National Bank of Kuwait',country:'KW',exchange:'Boursa Kuwait',canonicalId:'XKUW:NBK'};
const pages=[{num:1,text:'National Bank of Kuwait\nCONSOLIDATED STATEMENT OF INCOME\nFor the year ended 31 December 2025\nKD 000s\n2025 2024\nInterest income 1,841,967 1,800,000\nNet operating income 1,296,841 1,200,000\nProfit for the year 600,000 500,000\nThe financial statements were authorised for issue by resolution on 12 January 2026.'},
 {num:2,text:'National Bank of Kuwait\nCONSOLIDATED BALANCE SHEET\nAs at 31 December 2025\nKD 000s\n2025 2024\nTOTAL ASSETS 40,000,000 30,000,000\nTOTAL LIABILITIES 30,000,000 25,000,000\nCash and short-term funds 8,000,000 7,000,000'}];
function extract(input=pages){ const doc=pdfEvidenceDocument(input,issuer,'https://www.nbk.com/report.pdf',now.toISOString()); return financialValuesFromPdfPages(input,issuer,doc,/National Bank of Kuwait/i,now); }
describe('explicit regional report rows and source identity',()=>{
 it('preserves scale, actual signature date, period and debt upper bound without inventing gross revenue',()=>{
   const values=extract();expect(values).toHaveLength(3);expect(values.every(v=>validFinancialValue(v,now))).toBe(true);
   expect(values.find(v=>v.normalizedField==='interest_income')).toMatchObject({value:1841967000,periodStart:'2025-01-01',periodEnd:'2025-12-31',filedAt:null,reportedAt:'2026-01-12',sourceDateKind:'issuer_report_signature'});
   expect(values.find(v=>v.normalizedField==='interest_bearing_debt')?.validation?.bound).toBe('upper');
   expect(values.some(v=>['total_income','cash_and_equivalents','prohibited_revenue'].includes(v.normalizedField))).toBe(false);
 });
 it('rejects unsupported units, mismatched issuers, bad years and negative financial rows',()=>{
   expect(extract(pages.map(p=>({...p,text:p.text.replaceAll('KD 000s','unknown units')})))).toHaveLength(0);
   expect(extract(pages.map(p=>({...p,text:p.text.replaceAll('National Bank of Kuwait','Other company')})))).toHaveLength(0);
   expect(extract(pages.map(p=>({...p,text:p.text.replaceAll('2025','2099')})))).toHaveLength(0);
   expect(extract(pages.map(p=>({...p,text:p.text.replace('1,841,967','(1,841,967)')}))).some(v=>v.normalizedField==='interest_income')).toBe(false);
 });
 it('requires an exact region, company and symbol profile instead of name-only trust',()=>{
   expect(regionalProfile(issuer)).not.toBeNull();expect(regionalProfile({...issuer,name:'Other bank'})).toBeNull();expect(regionalProfile({...issuer,country:'US',exchange:'NYSE'})).toBeNull();
 });
 it('discovers only verified same-origin actual statements and orders quarter variants',()=>{
   const html='<a href="/reports/nbk-fs-1q-2026-e.pdf">Financial statements 2026</a><a href="/reports/nbk-fs-2q-2026-e.pdf">Financial statements</a><a href="https://evil.example/report-2026.pdf">annual report</a><a href="/investor-presentation-2026.pdf">Annual report</a>';
   expect(issuerPdfLinks(html,'https://www.nbk.com/investor-relations.html',now)).toEqual(['https://www.nbk.com/reports/nbk-fs-2q-2026-e.pdf','https://www.nbk.com/reports/nbk-fs-1q-2026-e.pdf']);
 });
 it('rejects SPO/general reports even when a recent year would otherwise rank them first',()=>{
   const html='<a href="/NBK-SPO-Report-2026.pdf">Report 2026</a><a href="/report-2026.pdf">Report</a><a href="/nbk-fs-2q-2026-e.pdf">Financial statements</a><a href="/annual-report-2025.pdf">Annual Report</a>';
   expect(issuerPdfLinks(html,'https://www.nbk.com/investor-relations.html',now)).toEqual(['https://www.nbk.com/nbk-fs-2q-2026-e.pdf','https://www.nbk.com/annual-report-2025.pdf']);
 });
 it('rejects future-dated publications rather than borrowing a past year mentioned in their label',()=>{
   expect(issuerPdfLinks('<a href="/annual-report-2099.pdf">Annual Report, comparison 2025</a>','https://www.nbk.com',now)).toEqual([]);
 });
 it('reads current interim balance and six-month income columns with the independent review date',()=>{
   // Representative rows/headers from the issuer Q2 2026 report, PDF pages 2, 3, 5.
   const interim=[{num:2,text:'REPORT ON REVIEW OF INTERIM CONDENSED CONSOLIDATED FINANCIAL INFORMATION\nNational Bank of Kuwait\n20 July 2026\nKuwait'},
     {num:3,text:"National Bank of Kuwait Group\nINTERIM CONDENSED CONSOLIDATED STATEMENT OF INCOME\n30 June 2026 (Unaudited)\nThree months ended\n30 June\nSix months ended\n30 June\n2026 2025 2026 2025\nNotes KD 000's KD 000's KD 000's KD 000's\nInterest income 456,736 457,212 915,760 894,516"},
     {num:5,text:"National Bank of Kuwait Group\nINTERIM CONDENSED CONSOLIDATED STATEMENT OF FINANCIAL POSITION\n30 June 2026 (Unaudited)\nAudited\n30 June 31 December 30 June\n2026 2025 2025\nNotes KD 000's KD 000's KD 000's\nTotal assets 46,232,823 45,612,844 43,648,267\nTotal liabilities 40,610,546 39,962,597 38,369,685"}];
   const values=extract(interim);
   expect(values).toHaveLength(3);
   expect(values.every(value=>validFinancialValue(value,now))).toBe(true);
   expect(values.find(value=>value.normalizedField==='total_assets')).toMatchObject({value:46232823000,periodEnd:'2026-06-30',reportedAt:'2026-07-20',periodStart:null});
   expect(values.find(value=>value.normalizedField==='interest_income')).toMatchObject({value:915760000,periodStart:'2026-01-01',periodEnd:'2026-06-30'});
 });
 it('never emits a zero-assets denominator, and does not invent a signature date',()=>{
   const values=extract(pages.map(page=>({...page,text:page.text.replace('40,000,000','0').replace('The financial statements were authorised for issue by resolution on 12 January 2026.','')})));
   expect(values.some(value=>value.normalizedField==='total_assets')).toBe(false);
   expect(values.every(value=>!validFinancialValue(value,now))).toBe(true);
 });
});

const ifaIssuer={...security,ticker:'IFA',providerSymbol:'IFA.KW',name:'International Financial Advisors Holding',country:'KW',exchange:'Boursa Kuwait',canonicalId:'XKUW:IFA'};
const ifaPages=[
  {num:37,text:'International Financial Advisors Holding\nConsolidated statement of profit or loss\nNotes\nYear ended\n31 Dec. 2025\nYear ended\n31 Dec. 2024\nKD KD\nIncome\nDividend income 494,937 214,982\nRent and other income 479,862 648,914'},
  {num:39,text:'International Financial Advisors Holding\nConsolidated statement of financial position\nNote 31 Dec. 2025 31 Dec. 2024\nKD KD\nAssets\nCash and cash equivalents 9 4,242,133 7,949,224\nTotal assets 161,146,865 135,552,702\nLiabilities and equity\nTotal liabilities 28,665,529 25,266,936'},
  {num:45,text:"International Financial Advisors Holding\nThe Parent Company's board of directors approved these consolidated financial statements for issue on 29 March 2026."},
];
function extractIfa(input=ifaPages){ const doc=pdfEvidenceDocument(input,ifaIssuer,'https://ifakuwait.com/pdf/annual-report/2025/IFA_Holding_Annual_Report_2025-English.pdf',now.toISOString()); return financialValuesFromPdfPages(input,ifaIssuer,doc,/International Financial Advis[oe]rs/i,now); }
describe('IFA official annual financial evidence',()=>{
 it('matches the exact Kuwait issuer profile and same-origin 2025 financial-statement link',()=>{
   const profile=regionalProfile(ifaIssuer);
   expect(profile?.directory).toBe('https://ifakuwait.com/financial-statements.html');
   const html='<a href="/pdf/2025/EN/IFA_FS_31-12-2025-EN.pdf">Download</a>';
   expect(issuerPdfLinks(html,profile!.directory,now)).toEqual(['https://ifakuwait.com/pdf/2025/EN/IFA_FS_31-12-2025-EN.pdf']);
 });
 it('parses abbreviated annual dates and explicit full-dinar KD columns',()=>{
   const values=extractIfa();
   expect(values.every(value=>validFinancialValue(value,now))).toBe(true);
   expect(values.find(value=>value.normalizedField==='total_assets')).toMatchObject({value:161146865,currency:'KWD',periodStart:null,periodEnd:'2025-12-31',reportedAt:'2026-03-29'});
   expect(values.find(value=>value.normalizedField==='cash_and_equivalents')).toMatchObject({value:4242133,currency:'KWD',periodEnd:'2025-12-31'});
   expect(values.find(value=>value.normalizedField==='interest_bearing_debt')).toMatchObject({value:28665529,validation:expect.objectContaining({bound:'upper'})});
 });
 it('keeps missing IFA income fields missing rather than manufacturing a compliant result',()=>{
   const values=extractIfa();
   expect(values.some(value=>['total_income','interest_income','prohibited_revenue'].includes(value.normalizedField))).toBe(false);
   expect(extractIfa(ifaPages.map(page=>({...page,text:page.text.replace(/^KD KD$/m,'IFA reported KD values')})))).toEqual([]);
 });
});