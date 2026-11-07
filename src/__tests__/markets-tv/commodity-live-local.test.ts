import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {tvSceneAssets} from '@/lib/server/markets-tv/sceneCatalog';
import {verifiedTvCommodityQuote} from '@/lib/markets-tv/commodityQuote';
it('validates actual source prices for all four explicit continuous contracts',()=>{
 const data=JSON.parse(readFileSync('../commodity-scan.json','utf8'));
 for(const a of tvSceneAssets('assets').summary)expect(verifiedTvCommodityQuote(a,data,new Date().toISOString())).not.toBeNull();
});
