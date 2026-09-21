/** Only established browser push services may receive requests. Never accept an arbitrary callback URL. */
export function allowedPushEndpoint(endpoint: string) {
 try { const url=new URL(endpoint);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&(
  url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.notify.windows.com')
 );}catch{return false;}
}
export function inQuietHours(start: number | null,end: number | null,timezone: string,now=new Date()) {
 if(start===null||end===null||start===end)return false;
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const minutes=Number(parts.find(p=>p.type==='hour')?.value)*60+Number(parts.find(p=>p.type==='minute')?.value);
 return start<end?minutes>=start&&minutes<end:minutes>=start||minutes<end;
}
export function deliveryOutcome(status: number | null): 'retry'|'failed'|'uncertain' {
 // A timeout or 5xx may follow acceptance; conservative handling avoids duplicate financial alerts.
 if(status===429)return 'retry';
 if(status!==null&&status>=400&&status<500)return 'failed';
 return 'uncertain';
}
