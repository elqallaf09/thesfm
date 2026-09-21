'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivateResource } from '@/components/platform/usePrivateResource';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { Button } from '@/components/ui/button';
import styles from '@/components/platform/platform.module.css';
type Channel={id:string;channel:string;enabled:boolean;verified_at:string;quiet_start:number|null;quiet_end:number|null;timezone:string};
type Data={channels:Channel[];deliveries:Array<{id:string;channel_id:string;status:string;created_at:string}>;configuration:Record<string,boolean>;vapidPublicKey:string|null};
const copy={
 ar:{title:'قنوات التنبيهات',note:'اختر القنوات التي تسمح لها بإرسال تنبيهات جديدة. الرسائل الخارجية عامة ولا تحتوي مبالغك المالية. يمكن الإلغاء في أي وقت.',consent:'أوافق على استقبال التنبيهات عبر القناة التي أختار ربطها.',connect:'ربط وتفعيل',disconnect:'إلغاء الربط',unavailable:'غير مهيأة حاليًا',connected:'مرتبطة',open:'أكمل التحقق في التطبيق',refresh:'تحديث الحالة',error:'تعذر حفظ الإعدادات. حاول مجددًا.',quiet:'ساعات الهدوء',start:'من',end:'إلى',timezone:'المنطقة الزمنية',save:'حفظ',history:'آخر محاولات الإرسال',queued:'في الانتظار',sending:'جارٍ الإرسال',accepted:'قبله المزوّد',delivered:'تم التسليم',failed:'فشل',uncertain:'التسليم غير مؤكد',cancelled:'ملغى',login:'سجّل الدخول لإدارة التنبيهات',email:'البريد الإلكتروني',telegram:'Telegram',whatsapp:'WhatsApp',push:'إشعارات هذا الجهاز',noHistory:'لا توجد محاولات إرسال.',disabled:'متوقفة',limit:'يتم الإرسال خلال 15 دقيقة عادةً، وبحد أقصى 100 عملية في اليوم. قبول المزوّد لا يثبت وصول الرسالة. ربط Telegram وWhatsApp ينتهي بعد 10 دقائق.'},
 en:{title:'Notification channels',note:'Choose channels allowed to send new alerts. External messages are generic and contain no financial amounts. Disconnect at any time.',consent:'I agree to receive alerts through the channel I choose to connect.',connect:'Connect and enable',disconnect:'Disconnect',unavailable:'Not configured',connected:'Connected',open:'Complete verification in the app',refresh:'Refresh status',error:'Could not save settings. Please retry.',quiet:'Quiet hours',start:'From',end:'To',timezone:'Time zone',save:'Save',history:'Recent delivery attempts',queued:'Queued',sending:'Sending',accepted:'Provider accepted',delivered:'Delivered',failed:'Failed',uncertain:'Delivery uncertain',cancelled:'Cancelled',login:'Sign in to manage notifications',email:'Email',telegram:'Telegram',whatsapp:'WhatsApp',push:'This device’s push notifications',noHistory:'No delivery attempts.',disabled:'Disabled',limit:'Usually dispatched within 15 minutes, up to 100 deliveries per day. Provider acceptance does not prove receipt. Telegram and WhatsApp verification links expire in 10 minutes.'},
 fr:{title:'Canaux de notification',note:'Choisissez les canaux autorisés à envoyer des alertes. Les messages externes ne contiennent aucun montant financier. Déconnectez-les à tout moment.',consent:'J’accepte les alertes du canal que je choisis de connecter.',connect:'Connecter et activer',disconnect:'Déconnecter',unavailable:'Non configuré',connected:'Connecté',open:'Terminer la vérification dans l’application',refresh:'Actualiser',error:'Impossible d’enregistrer. Réessayez.',quiet:'Heures silencieuses',start:'De',end:'À',timezone:'Fuseau horaire',save:'Enregistrer',history:'Tentatives récentes',queued:'En attente',sending:'Envoi',accepted:'Accepté par le fournisseur',delivered:'Livré',failed:'Échec',uncertain:'Livraison incertaine',cancelled:'Annulé',login:'Connectez-vous pour gérer les notifications',email:'E-mail',telegram:'Telegram',whatsapp:'WhatsApp',push:'Notifications de cet appareil',noHistory:'Aucune tentative.',disabled:'Désactivé',limit:'Envoi généralement sous 15 minutes, jusqu’à 100 livraisons par jour. L’acceptation ne prouve pas la réception. Les liens Telegram et WhatsApp expirent après 10 minutes.'},
};
async function load():Promise<Data>{const r=await fetch('/api/notifications/channels',{cache:'no-store'});if(!r.ok)throw new Error('FAILED');return r.json();}
export default function ChannelsPage(){const {user}=useAuth();return <Channels key={user?.id??'guest'}/>;}
function Channels(){
 const {lang}=useLanguage();const language=lang==='en'||lang==='fr'?lang:'ar';const text=copy[language];
 const {userId,data,error,refresh}=usePrivateResource(load);const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);const [failed,setFailed]=useState(false);const [link,setLink]=useState('');
 async function send(body:Record<string,unknown>){const r=await fetch('/api/notifications/channels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('FAILED');return r.json();}
 async function connect(channel:string){
  if(!consent||busy)return;setBusy(true);setFailed(false);setLink('');
  try{
   let subscription:PushSubscriptionJSON|undefined;
   if(channel==='push'){
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!data?.vapidPublicKey)throw new Error('UNSUPPORTED');
    const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('DENIED');
    const registration=await navigator.serviceWorker.register('/sfm-notifications-sw.js',{scope:'/'});await navigator.serviceWorker.ready;
    const raw=atob(data.vapidPublicKey.replace(/-/g,'+').replace(/_/g,'/'));const key=Uint8Array.from(raw,c=>c.charCodeAt(0));
    subscription=(await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key})).toJSON();
   }
   const result=await send({action:'connect',channel,consent:true,locale:language,...(subscription?{subscription:{endpoint:subscription.endpoint,keys:subscription.keys}}:{})});if(result.url)setLink(result.url);await refresh();
  }catch{setFailed(true);}finally{setBusy(false);}
 }
 async function disconnect(c:Channel){setBusy(true);setFailed(false);try{await send({action:'disconnect',id:c.id});await refresh();}catch{setFailed(true);}finally{setBusy(false);}}
 return <WorkspacePageContainer className={styles.page}><h1>{text.title}</h1><p>{text.note}</p><p>{text.limit}</p>
 {!userId?<Link href="/login">{text.login}</Link>:null}{error||failed?<p role="alert">{text.error}</p>:null}
 <label className={styles.row}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{text.consent}</label>
 <div className={styles.grid}>{(['email','telegram','whatsapp','push'] as const).map(channel=><section key={channel} className={styles.card}><h2>{text[channel]}</h2><p>{data?.configuration[channel]?data.channels.some(c=>c.channel===channel&&c.enabled)?text.connected:'—':text.unavailable}</p><Button disabled={!userId||busy||!consent||!data?.configuration[channel]} onClick={()=>void connect(channel)}>{text.connect}</Button></section>)}</div>
 {link?<a href={link} target="_blank" rel="noreferrer">{text.open}</a>:null}<Button variant="outline" disabled={busy} onClick={()=>void refresh()}>{text.refresh}</Button>
 {data?.channels.map(c=><section key={c.id} className={styles.card}><h2>{text[c.channel as 'email']} · {c.enabled?text.connected:text.disabled}</h2><p dir="ltr">{c.verified_at.slice(0,19).replace('T',' ')} UTC</p><QuietHours channel={c} language={language} save={async body=>{await send(body);await refresh();}}/><Button variant="outline" disabled={busy} onClick={()=>void disconnect(c)}>{text.disconnect}</Button></section>)}
 <section className={styles.card}><h2>{text.history}</h2>{data?.deliveries.length===0?<p>{text.noHistory}</p>:null}{data?.deliveries.map(d=><p key={d.id}>{text[d.status as 'queued']} · <span dir="ltr">{d.created_at.slice(0,19).replace('T',' ')} UTC</span></p>)}</section>
 </WorkspacePageContainer>;
}
function QuietHours({channel,language,save}:{channel:Channel;language:'ar'|'en'|'fr';save:(body:Record<string,unknown>)=>Promise<void>}){
 const text=copy[language];const fmt=(n:number|null)=>n===null?'':`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
 const [start,setStart]=useState(fmt(channel.quiet_start));const [end,setEnd]=useState(fmt(channel.quiet_end));const [timezone,setTimezone]=useState(channel.timezone);const [busy,setBusy]=useState(false);const [failed,setFailed]=useState(false);
 const minute=(v:string)=>v?Number(v.slice(0,2))*60+Number(v.slice(3)):null;
 return <form className={styles.field} onSubmit={async e=>{e.preventDefault();setBusy(true);setFailed(false);try{await save({action:'quiet',id:channel.id,start:minute(start),end:minute(end),timezone});}catch{setFailed(true);}finally{setBusy(false);}}}><h3>{text.quiet}</h3><div className={styles.row}><label>{text.start}<input type="time" className={styles.input} value={start} onChange={e=>setStart(e.target.value)}/></label><label>{text.end}<input type="time" className={styles.input} value={end} onChange={e=>setEnd(e.target.value)}/></label><label>{text.timezone}<input className={styles.input} required maxLength={80} value={timezone} onChange={e=>setTimezone(e.target.value)}/></label></div>{failed?<p role="alert">{text.error}</p>:null}<Button disabled={busy}>{text.save}</Button></form>;
}
