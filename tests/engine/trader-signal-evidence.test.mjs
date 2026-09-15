import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const script=readFileSync('src/trader-app/public/recommendation.js','utf8');
const context={module:{exports:{}},Date};vm.runInNewContext(script,context);
const {normalizeRecommendation}=context.module.exports;
const base=()=>({symbol:'MSFT',price:100,currentPrice:100,targetPrice:110,stopLoss:96,confidence:90,finalScore:82,
  finalRecommendation:'Buy',dataQuality:'complete',lastUpdated:new Date().toISOString(),rsi:60,ema20:99,
  macd:2,macdSignal:1,support:97,resistance:112,atr:2,riskLevel:'low',
  dataSufficiency:{sufficient:true},newsSentimentSummary:{status:'available',articleCount:1},
  reason:'Strong buy signal',decision:{kind:'buy',title:'Strong buy signal',badge:'Buy now'}});
const blocked={
  'missing price':{price:null,currentPrice:null},'missing all technicals':{rsi:null,ema20:null,macd:null,macdSignal:null},
  'one indicator is not coverage':{ema20:null,macd:null,macdSignal:null},'technicalAvailable false':{technicalAvailable:false},
  'missing RSI':{rsi:null},'RSI outside range':{rsi:101},'missing MACD signal':{macdSignal:null},
  'missing support':{support:null},'zero ATR':{atr:0},'negative ATR':{atr:-1},'inverted levels':{support:120},
  'explicit insufficiency':{dataSufficiency:{sufficient:false}},'no source timestamp':{lastUpdated:null},
  'generation time is not evidence':{lastUpdated:null,generatedAt:new Date().toISOString()},
  'stale source time':{lastUpdated:new Date(Date.now()-16*60000).toISOString()},
  'future source time':{lastUpdated:new Date(Date.now()+120000).toISOString()},
  'partial data':{dataQuality:'partial'},'unknown quality':{dataQuality:'mystery'},'stale quality':{dataQuality:'stale'},
  'cached quality':{dataQuality:'cached'},'provider stale flag':{providerStatus:{stale:true}},'delayed flag':{delayed:true},
  'disagreeing completeness':{dataQuality:'partial',dataQualityStatus:{status:'complete'}},
  'signal disabled':{signalAvailable:false},'price availability false':{available:false},
  'engine loading analysis':{engine:{version:1,quoteStatus:'available',analysisStatus:'pending',asOf:new Date().toISOString()}},
  'last-known engine state':{engine:{version:1,quoteStatus:'last_known',analysisStatus:'available',asOf:new Date().toISOString()}}
};
for(const [name,patch] of Object.entries(blocked))test(`rejects confident output with ${name}`,()=>{
  const r=normalizeRecommendation({...base(),...patch});
  assert.equal(r.status,'insufficient_data');assert.equal(r.evidenceReady,false);assert.equal(r.confidence,null);
  assert.equal(r.canFollowTrade,false);assert.equal(r.targetPrice,null);assert.equal(r.stopLoss,null);
  assert.doesNotMatch(r.reason,/strong|buy now/i);
});
test('preserves genuinely complete fresh data without making up missing metadata',()=>{
  const r=normalizeRecommendation(base());assert.equal(r.status,'buy');assert.equal(r.confidence,90);assert.equal(r.canFollowTrade,true);
});
for(const value of [null,undefined,true,false,'', ' ', -1,101,Infinity,NaN])test(`confidence ${String(value)} is unavailable, not a score alias`,()=>{
  const r=normalizeRecommendation({...base(),confidence:value,score:99});assert.equal(r.confidence,null);
});
test('actual zero confidence is preserved',()=>{assert.equal(normalizeRecommendation({...base(),confidence:0}).confidence,0)});
function extract(source,name){const start=source.indexOf(`function ${name}(`);assert.ok(start>=0);let brace=source.indexOf('{',start),level=1,end=brace+1;for(;end<source.length&&level;end++){if(source[end]==='{')level++;else if(source[end]==='}')level--;}return source.slice(start,end)}
const detail=readFileSync('src/trader-app/public/detail.js','utf8');
const scope={Recommendation:{normalizeRecommendation},Number,detailText:(ar,en)=>en,localizeDetailText:v=>v};
for(const name of ['calculateFinalScore','evaluationScoreState','buildDecision'])vm.runInNewContext(extract(detail,name),scope);
test('a blocked raw strong decision cannot bypass the detail verdict',()=>{
  const item={...base(),technicalAvailable:false};const checked=normalizeRecommendation(item);const d=scope.buildDecision(item,checked);
  assert.equal(d.kind,'hold');assert.equal(d.title,'Insufficient data');assert.doesNotMatch(d.badge,/buy|strong/i);
  assert.equal(detail.includes('item.decision ||'),false);
});
test('missing or rejected score has no invented points; actual source score survives',()=>{
  assert.equal(scope.calculateFinalScore({...base(),finalScore:null,score:null}).score,null);
  assert.equal(scope.calculateFinalScore({...base(),technicalAvailable:false}).score,null);
  assert.equal(scope.calculateFinalScore(base()).score,82);
});
test('null evaluation is unavailable, actual zero remains a real zero',()=>{
  for(const x of [null,undefined,true,false,'',' '])assert.equal(scope.evaluationScoreState(x),null);
  assert.equal(scope.evaluationScoreState(0),'danger');assert.equal(scope.evaluationScoreState(50),'success');
});
