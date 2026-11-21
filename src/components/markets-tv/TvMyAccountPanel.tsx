'use client';

import { tvOrigin } from '@/lib/markets-tv/client';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { useEffect, useRef } from 'react';
import { TvQr } from './TvQr';

const COPY = {
  ar: {
    details: 'عدّل اسمك وصورتك وبيانات ملفك الشخصي من صفحة الحساب.',
    signIn: 'سجّل الدخول بالحساب الذي تريد تعديله. إذا كنت مسجّلاً بالفعل، تأكد من أنه الحساب الصحيح.',
    edit: 'فتح حسابي وتعديل بياناتي',
    scan: 'على التلفزيون، امسح الرمز بهاتفك لفتح صفحة حسابك.',
  },
  en: {
    details: 'Update your name, photo and profile details on your account page.',
    signIn: 'Sign in to the account you want to edit. If you are already signed in, check that it is the right account.',
    edit: 'Open my account and edit profile',
    scan: 'On TV, scan this code with your phone to open your account page.',
  },
  fr: {
    details: 'Modifiez votre nom, votre photo et vos informations sur la page de votre compte.',
    signIn: 'Connectez-vous au compte à modifier. Si vous êtes déjà connecté, vérifiez qu’il s’agit du bon compte.',
    edit: 'Ouvrir mon compte et modifier mon profil',
    scan: 'Sur le téléviseur, scannez ce code avec votre téléphone pour ouvrir votre compte.',
  },
} satisfies Record<TvLanguage, { details: string; signIn: string; edit: string; scan: string }>;

export function TvMyAccountPanel({ language }: { language: TvLanguage }) {
  const profileLink = useRef<HTMLAnchorElement>(null);
  const copy = COPY[language];
  useEffect(() => {
    // The modal may initially show a lazy-loading fallback. Move focus only
    // after its return target has been captured and this action is mounted.
    const frame = requestAnimationFrame(() => profileLink.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, []);
  // The existing profile page handles user authentication and MFA. A TV's
  // pairing token cannot authenticate profile editing or travel in this URL.
  const profileUrl = `${tvOrigin()}/profile`;
  return <div className="tv-detail tv-my-account">
    <div className="tv-detail-facts">
      <p>{copy.details}</p>
      <p>{copy.signIn}</p>
      <div className="tv-phone-link"><a ref={profileLink} href={profileUrl} referrerPolicy="no-referrer" data-tv-focus-key="account-profile" data-tv-initial-focus>{copy.edit}</a></div>
    </div>
    <div className="tv-phone-link"><TvQr value={profileUrl} label={copy.scan}/><p>{copy.scan}</p></div>
  </div>;
}
