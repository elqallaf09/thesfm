import { readFileSync } from 'node:fs';
const files=process.argv.slice(2);
if(!files.length){console.error('Usage: node scripts/performance/check-roadmap-targets.mjs <Lighthouse JSON reports: at least 3 runs per URL>');process.exit(2);}
const grouped=new Map();
for(const file of files){const report=JSON.parse(readFileSync(file,'utf8'));const url=report.finalDisplayedUrl??report.finalUrl;const key=`${url}|${report.configSettings?.formFactor??'unknown'}`;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(report);}
const targets={performance:.95,accessibility:1,'best-practices':1,seo:1};
const median=values=>{const list=[...values].sort((a,b)=>a-b);const mid=Math.floor(list.length/2);return list.length%2?list[mid]:(list[mid-1]+list[mid])/2;};
let passed=true;
for(const [key,reports] of grouped){
 const privatePage=/\/(today|dashboard|income|expenses|settings|economic-intelligence|business|investments|profile|notifications)(\/|\?|$)/.test(key);
 const scores={};let complete=reports.length>=3;
 for(const [category,target] of Object.entries(targets)){
  if(privatePage&&category==='seo')continue;
  const values=reports.map(r=>r.categories?.[category]?.score).filter(n=>typeof n==='number'&&Number.isFinite(n));
  const actual=values.length===reports.length?median(values):null;
  scores[category]={median:actual,target,passed:actual!==null&&actual>=target};
  if(!scores[category].passed)complete=false;
 }
 console.log(JSON.stringify({route:key,runs:reports.length,method:'median of identical-device laboratory runs; does not certify field INP or capacity',scores,passed:complete}));
 if(!complete)passed=false;
}
process.exitCode=passed?0:1;
