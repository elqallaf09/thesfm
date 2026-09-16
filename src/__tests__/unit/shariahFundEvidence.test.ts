import { describe, expect, it } from 'vitest';
import { parseSpyRows, validateHoldingsArchive, sameHoldingIssuer } from '@/lib/market/shariahFundReview';
import { getPublishedShariahFundProfile } from '@/lib/market/shariahPublishedFunds';
import { publicCatalogItem } from '@/lib/sharia-research/publicCatalog';
const now = new Date('2026-09-15T12:00:00Z');
function rows(): unknown[][] { return [['Fund Name:', 'State Street SPDR S&P 500 ETF Trust'], ['Ticker Symbol:', 'SPY'], ['Holdings:', 'As of 14-Sep-2026'], [],
 ['Name','Ticker','Identifier','SEDOL','Weight','Sector','Shares Held','Local Currency'], ...Array.from({ length: 100 }, (_, i) => ['Synthetic '+i,'T'+i,'ID'+i,'S'+i,1,'-',1,'USD'])]; }
describe('fund holdings evidence without invented fund ratings', () => {
 it('reads an explicit complete percentage-point holding table', () => { expect(parseSpyRows(rows(), now)).toMatchObject({ asOf:'2026-09-14',totalWeight:100 }); });
 it('stops only at the recognized text-only disclaimer, not an arbitrary malformed holding', () => {
   const input=rows(); input.push([],['State Street Global Advisors (SSGA) is now State Street Investment Management.'],['Past performance is not a guarantee.']);
   expect(parseSpyRows(input,now).holdings).toHaveLength(100);
   input.push(['Late security','LATE','ID-EXTRA','-',1,'-',1,'USD']); expect(() => parseSpyRows(input,now)).toThrow();
 });
 it.each(['As of 31-Feb-2026','As of 01-Sep-2026','As of 16-Sep-2026'])('rejects an impossible/stale/future date: %s', date => { const input=rows();input[2][1]=date;expect(() => parseSpyRows(input,now)).toThrow(); });
 it('rejects wrong fund identities, duplicates, missing currencies, null weights and fractional rather than percentage totals', () => {
   for(const mutate of [(x:unknown[][])=>{x[1][1]='VOO';},(x:unknown[][])=>{x[6][2]=x[5][2];},(x:unknown[][])=>{x[5][7]=null;},(x:unknown[][])=>{x[5][4]=null;},(x:unknown[][])=>{for(const row of x.slice(5)) row[4]=0.01;}]){
     const input=rows();mutate(input);expect(() => parseSpyRows(input,now)).toThrow();
   }
 });
 it('rejects invalid or oversized compressed input before opening the workbook', () => {
   expect(() => validateHoldingsArchive(new Uint8Array(2_000_001))).toThrow(); expect(() => validateHoldingsArchive(new Uint8Array(50))).toThrow();
 });
 it('does not treat a generic saved fund review as a corporate FTSE pass', () => {
   const item=publicCatalogItem({symbol:'SPY',asset_type:'etf',shariah_status:'compliant',shariah_last_reviewed_at:now.toISOString(),shariah_screening_data:{evidenceVersion:'sfm-evidence-v2',methodologyId:'SFM_FUND_EVIDENCE_REVIEW',methodologyVersion:'1',fundReview:{coverage:'partial'}}},now);
   expect(item.shariahStatus).toBe('needs_review');expect(item.financialRatios).toBeNull();expect(item.methodology.en).toContain('not certification');
 });
 it('reports a current verified provider/SSB designation separately from SFM periodic fund monitoring', () => {
   const item=publicCatalogItem({symbol:'HLAL',name:'Wahed FTSE USA Shariah ETF',asset_type:'etf',shariah_status:'needs_review',shariah_source:'Official published Shariah designation + SFM source verification',shariah_last_reviewed_at:now.toISOString(),shariah_screening_data:{evidenceVersion:'sfm-evidence-v2',methodologyId:'SFM_FUND_EVIDENCE_REVIEW',methodologyVersion:'1',fundReview:{coverage:'published_designation_verified',publishedShariahDesignation:{state:'verified',provider:'Wahed',designation:'Shariah ETF',sourceUrl:'https://www.wahed.com/hlal'}}}},now);
   expect(item.shariahStatus).toBe('compliant');
   expect(item.statusLabelAr).toBe('توافق شرعي منشور');
   expect(item.publishedShariahDesignation).toMatchObject({state:'verified',provider:'Wahed'});
   expect(item.methodology.ar).toContain('منهجية شرعية منشورة');
   expect(item.reason.ar).toContain('تحقق دوري');
 });
 it('does not keep a published designation badge after its verification becomes stale', () => {
   const item=publicCatalogItem({symbol:'HLAL',name:'Wahed FTSE USA Shariah ETF',asset_type:'etf',shariah_status:'needs_review',shariah_last_reviewed_at:'2026-09-01T00:00:00Z',shariah_screening_data:{evidenceVersion:'sfm-evidence-v2',methodologyId:'SFM_FUND_EVIDENCE_REVIEW',methodologyVersion:'1',fundReview:{publishedShariahDesignation:{state:'verified',provider:'Wahed',sourceUrl:'https://www.wahed.com/hlal'}}}},now);
   expect(item.shariahStatus).toBe('needs_review');
   expect(item.statusLabelAr).toBe('يحتاج مراجعة');
   expect(item.publishedShariahDesignation).toBeNull();
 });
});

describe('published Shariah fund registry', () => {
 it.each([
   ['SPUS','SP Funds S&P 500 Sharia Industry Exclusions ETF'],
   ['HLAL','Wahed FTSE USA Shariah ETF'],
   ['UMMA','Wahed Dow Jones Islamic World ETF'],
   ['SPRE','SP Funds S&P Global REIT Sharia ETF'],
   ['SPSK','SP Funds Dow Jones Global Sukuk ETF'],
 ])('binds %s to its reviewed exact fund identity', (symbol,name) => {
   expect(getPublishedShariahFundProfile(symbol,name)).toMatchObject({symbol,name});
   expect(getPublishedShariahFundProfile(symbol,'Different Fund')).toBeNull();
 });
});

it('requires distinctive issuer-name equality in addition to ticker',()=>{ expect(sameHoldingIssuer('APPLE INC','Apple Inc.')).toBe(true); expect(sameHoldingIssuer('Other Holdings Inc','Apple Inc.')).toBe(false); });
