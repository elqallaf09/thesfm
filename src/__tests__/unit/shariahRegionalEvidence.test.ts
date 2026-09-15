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
});
