import type { TvLanguage } from './types';
export type TvPairError='forbidden'|'rateLimited'|'unavailable'|'network'|'invalid';
const copy={
 ar:{forbidden:'تعذّر قبول طلب الربط من هذا الجهاز. افتح النسخة المحدّثة ثم حاول مجددًا.',rateLimited:'وصلت إلى حد محاولات الربط. انتظر قليلًا ثم أعد المحاولة.',unavailable:'خدمة الربط غير متاحة مؤقتًا. حاول مجددًا بعد قليل.',network:'تعذّر الاتصال بخدمة الربط. تحقق من الإنترنت ثم أعد المحاولة.',invalid:'وصل رد غير صالح من خدمة الربط. أعد إنشاء الرمز.'},
 en:{forbidden:'This device could not start pairing. Open the updated app and try again.',rateLimited:'Too many pairing attempts. Wait before trying again.',unavailable:'Pairing is temporarily unavailable. Please try again shortly.',network:'Could not connect to pairing. Check your connection and try again.',invalid:'Pairing returned an invalid response. Create a new code.'},
 fr:{forbidden:'Cet appareil ne peut pas démarrer le jumelage. Ouvrez la version à jour et réessayez.',rateLimited:'Trop de tentatives de jumelage. Patientez avant de réessayer.',unavailable:'Le jumelage est temporairement indisponible. Réessayez dans un instant.',network:'Connexion au jumelage impossible. Vérifiez votre connexion et réessayez.',invalid:'Réponse de jumelage invalide. Créez un nouveau code.'}
} as const;
export const tvPairErrorText=(language:TvLanguage,error:TvPairError)=>copy[language][error];
export const tvPairHttpError=(status:number):TvPairError=>status===403?'forbidden':status===429?'rateLimited':'unavailable';
export function validTvPair(value:unknown,now=Date.now()):value is {code:string;secret:string;expiresAt:string} {
 if(!value||typeof value!=='object')return false;
 const pair=value as Record<string,unknown>;
 return typeof pair.code==='string'&&/^[A-F0-9]{12}$/.test(pair.code)&&typeof pair.secret==='string'&&/^[a-f0-9]{64}$/.test(pair.secret)&&typeof pair.expiresAt==='string'&&Date.parse(pair.expiresAt)>now&&Date.parse(pair.expiresAt)<=now+660000;
}
