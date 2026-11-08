import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve('next/package.json'))('sharp');
const regions=["ae","ar","at","au","be","bh","bm","br","ca","ch","cl","cn","co","cy","cz","de","dk","ee","eg","es","fi","fr","gb","gr","hk","hr","hu","id","ie","in","iq","is","it","jo","jp","kr","kw","kz","lt","lu","lv","ma","mx","my","ng","nl","no","nz","om","pe","ph","pk","pl","ps","pt","qa","ro","rs","ru","sa","se","sg","si","sk","th","tn","tr","tw","us","za"];
const source='ac7e0eb3259eb62aa6100c435607e2fe03896a97';
const layers=[];
for(let i=0;i<regions.length;i++){
 const response=await fetch(`https://raw.githubusercontent.com/lipis/flag-icons/${source}/flags/4x3/${regions[i]}.svg`);
 if(!response.ok)throw new Error(`Flag download failed: ${regions[i]}`);
 const svg=await response.text();
 if(!svg.includes('<svg')||/<script|onload=|https?:\/\/(?!www.w3.org)/i.test(svg))throw new Error('Unexpected flag content');
 layers.push({input:await sharp(Buffer.from(svg)).resize(160,120).png().toBuffer(),left:(i%10)*160,top:Math.floor(i/10)*120});
}
await mkdir('public/markets-tv/flags',{recursive:true});
await sharp({create:{width:1600,height:840,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).webp({lossless:true}).toFile('public/markets-tv/flags/markets.webp');
console.log('Generated 70 licensed flags in a single offline image.');
