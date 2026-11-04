import {fieldLabel} from './fieldLabels';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Label, Panel, formatValue, useUI } from './ui';
import { TEXT } from '../../../src/lib/mobile/projectCopy';
/** Expandable native evidence, no HTML execution or hidden truncation. */
export function StructuredResult({value,depth=0}:{value:unknown;depth?:number}) {
 const {t,language}=useUI();const [count,setCount]=useState(20);
 if(value==null)return <Label muted>—</Label>;
 if(typeof value!=='object')return <Label>{formatValue(value)}</Label>;
 const entries=Array.isArray(value)?value.map((v,i)=>[String(i+1),v] as const):Object.entries(value).filter(([k])=>!['user_id','userId','access_token','id','project_id'].includes(k));
 const copy=TEXT[language] as unknown as Record<string,unknown>;
 return <View style={{gap:10}}>{entries.slice(0,count).map(([key,v])=><ResultItem key={key} label={typeof copy[key]==='string'?String(copy[key]):fieldLabel(key,language)} value={v} depth={depth}/>)}{entries.length>count?<Button label={t(['عرض المزيد','Show more','Afficher plus'])} onPress={()=>setCount(n=>n+20)}/>:null}</View>;
}
function ResultItem({label,value,depth}:{label:string;value:unknown;depth:number}){
 const [open,setOpen]=useState(depth<1);const nested=value!==null&&typeof value==='object';
 const content=<><Label muted>{label}</Label>{nested?<><Button label={open?'−':'+'} onPress={()=>setOpen(v=>!v)}/>{open?<StructuredResult value={value} depth={depth+1}/>:null}</>:<Label>{formatValue(value)}</Label>}</>;
 return depth===0?<Panel>{content}</Panel>:<View style={{gap:5}}>{content}</View>;
}
