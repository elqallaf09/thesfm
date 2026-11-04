import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
export const escapeHtml=(value:unknown)=>String(value??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function shareText(filename:string,contents:string,mime='text/csv'){
 if(Platform.OS==='web'){const url=URL.createObjectURL(new Blob([contents],{type:mime}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
 if(!await Sharing.isAvailableAsync())throw new Error('SHARING_UNAVAILABLE');
 const file=new File(Paths.cache,filename);try{file.create({overwrite:true});file.write(contents);await Sharing.shareAsync(file.uri,{mimeType:mime});}finally{if(file.exists)file.delete();}
}
function html(value:unknown):string{
 if(value===null||typeof value!=='object')return escapeHtml(value);
 if(Array.isArray(value))return '<ol>'+value.map(v=>'<li>'+html(v)+'</li>').join('')+'</ol>';
 return '<table>'+Object.entries(value).filter(([key])=>!['user_id','userId'].includes(key)).map(([k,v])=>'<tr><th>'+escapeHtml(k)+'</th><td>'+html(v)+'</td></tr>').join('')+'</table>';
}
export async function exportDocument(title:string,value:unknown,language:string){
 const content='<!doctype html><html lang="'+language+'" dir="'+(language==='ar'?'rtl':'ltr')+'"><meta charset="utf-8"><style>body{font-family:Arial;padding:24px}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #bbb;padding:8px;text-align:start;vertical-align:top}tr{break-inside:avoid}</style><h1>'+escapeHtml(title)+'</h1>'+html(value)+'</html>';
 if(Platform.OS==='web'){await Print.printAsync({html:content});return;}
 const pdf=await Print.printToFileAsync({html:content});try{if(!await Sharing.isAvailableAsync())throw new Error('SHARING_UNAVAILABLE');await Sharing.shareAsync(pdf.uri,{mimeType:'application/pdf'});}finally{const f=new File(pdf.uri);if(f.exists)f.delete();}
}
