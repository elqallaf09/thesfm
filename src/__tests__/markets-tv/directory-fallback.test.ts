import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('next/cache',()=>({unstable_cache:(fn:unknown)=>fn}));
const mock=vi.hoisted(()=>({search:vi.fn(),stocks:vi.fn()}));
vi.mock('@/lib/world-stocks/search',()=>({searchWorldStocks:mock.search}));
vi.mock('@/lib/server/markets-tv/stockDirectory',()=>({tvStockAssets:mock.stocks}));
vi.mock('@/lib/server/markets-tv/instruments',()=>({tvInstrumentAssets:vi.fn().mockResolvedValue([])}));

beforeEach(()=>{vi.resetModules();vi.clearAllMocks();mock.search.mockResolvedValue({results:[],markets:[]});mock.stocks.mockResolvedValue([]);});
describe('TV exchange directory recovery',()=>{
  it('serves qualified configured Gulf samples without requesting an unsupported worldwide directory',async()=>{
    const {tvDirectoryAssets}=await import('@/lib/server/markets-tv/catalog');
    for(const [market,symbol,mic,currency] of [['TADAWUL','2222.SR','XSAU','SAR'],['ADX','FAB.AE','XADS','AED'],['QSE','QNBK.QA','DSMD','QAR'],['BAHRAIN_BOURSE','NBB.BH','XBAH','BHD'],['MUSCAT','BKMB.OM','XMUS','OMR']]){
      const rows=await tvDirectoryAssets('gulf',market);
      expect(rows[0]).toMatchObject({symbol,mic,currency,assetType:'stock'});
      expect(rows.every(row=>!('price' in row))).toBe(true);
    }
    expect(mock.stocks).not.toHaveBeenCalled();expect(mock.search).not.toHaveBeenCalled();
  });
  it('marks configured samples as selected and preserves real full-directory counts',async()=>{
    mock.search.mockResolvedValue({results:[{region:'BOURSA_KUWAIT',countryCode:'KW'}],markets:[{id:'BOURSA_KUWAIT',countryCode:'KW',labelAr:'الكويت',labelEn:'Kuwait',labelFr:'Koweït',status:'snapshot'}]});
    const {tvMarkets}=await import('@/lib/server/markets-tv/catalog');
    const markets=await tvMarkets();
    expect(markets.find(row=>row.id==='BOURSA_KUWAIT')).toMatchObject({count:1,status:'snapshot'});
    for(const id of ['TADAWUL','ADX','QSE','BAHRAIN_BOURSE','MUSCAT','europe'])expect(markets.find(row=>row.id===id)).toMatchObject({status:'selected',count:expect.any(Number)});
    expect(markets.filter(row=>row.status==='selected').every(row=>row.count>0)).toBe(true);
  });
  it('uses a real directory when present and never substitutes another exchange for an unknown id',async()=>{
    const {tvDirectoryAssets}=await import('@/lib/server/markets-tv/catalog');
    mock.stocks.mockResolvedValue([{symbol:'REAL',name:'Verified listing',region:'TD_XSAU',mic:'XSAU',currency:'SAR'}]);
    expect((await tvDirectoryAssets('gulf','TD_XSAU'))[0].symbol).toBe('REAL');
    mock.stocks.mockRejectedValue(new Error('DIRECTORY_UNAVAILABLE'));
    expect((await tvDirectoryAssets('gulf','TD_XSAU'))[0].symbol).toBe('2222.SR');
    await expect(tvDirectoryAssets('world','TD_XXXX')).rejects.toThrow('DIRECTORY_UNAVAILABLE');
  });
});
