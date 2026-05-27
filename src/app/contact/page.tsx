'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Mail, MessageSquareText, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';

type Lang = 'ar' | 'en' | 'fr';

const TEXT = {
  ar: {
    title: 'تواصل معنا',
    subtitle: 'نحن هنا للمساعدة في الأسئلة العامة عن THE SFM، الحساب، الخصوصية، أو طريقة استخدام المنصة.',
    navAbout: 'من نحن',
    navFaq: 'الأسئلة الشائعة',
    login: 'تسجيل الدخول',
    supportChannel: 'قناة الدعم',
    supportEmail: 'البريد الإلكتروني للدعم',
    emailNotConfigured: 'لم يتم إعداد بريد دعم عام حتى الآن.',
    emailHint: 'إذا كان بريد الدعم مفعلاً، سيظهر هنا كرابط مباشر.',
    formTitle: 'نموذج التواصل',
    formBody: 'نموذج التواصل داخل التطبيق قريباً. حالياً استخدم البريد الإلكتروني عند توفره أو راجع الأسئلة الشائعة.',
    privacyTitle: 'تنبيه الخصوصية',
    privacyBody: 'لا تشارك بيانات مالية حساسة أو كلمات مرور في أي رسالة دعم. THE SFM لا يطلب كلمة المرور خارج صفحة تسجيل الدخول.',
    openFaq: 'فتح الأسئلة الشائعة',
    openAbout: 'قراءة من نحن',
    backHome: 'العودة للرئيسية',
    comingSoon: 'قريباً',
  },
  en: {
    title: 'Contact Us',
    subtitle: 'We are here to help with general questions about THE SFM, your account, privacy, or how to use the platform.',
    navAbout: 'About',
    navFaq: 'FAQ',
    login: 'Sign In',
    supportChannel: 'Support Channel',
    supportEmail: 'Support Email',
    emailNotConfigured: 'A public support email has not been configured yet.',
    emailHint: 'When support email is enabled, it will appear here as a direct link.',
    formTitle: 'Contact Form',
    formBody: 'An in-app contact form is coming soon. For now, use the support email when available or review the FAQ.',
    privacyTitle: 'Privacy Note',
    privacyBody: 'Do not share sensitive financial data or passwords in support messages. THE SFM does not ask for your password outside the login page.',
    openFaq: 'Open FAQ',
    openAbout: 'Read About',
    backHome: 'Back Home',
    comingSoon: 'Coming soon',
  },
  fr: {
    title: 'Contactez-nous',
    subtitle: 'Nous sommes là pour aider avec les questions générales sur THE SFM, votre compte, la confidentialité ou l’utilisation de la plateforme.',
    navAbout: 'À propos',
    navFaq: 'FAQ',
    login: 'Se connecter',
    supportChannel: 'Canal de support',
    supportEmail: 'E-mail de support',
    emailNotConfigured: 'Aucun e-mail de support public n’est encore configuré.',
    emailHint: 'Lorsque l’e-mail de support sera activé, il apparaîtra ici comme lien direct.',
    formTitle: 'Formulaire de contact',
    formBody: 'Un formulaire de contact intégré arrive bientôt. Pour l’instant, utilisez l’e-mail de support lorsqu’il est disponible ou consultez la FAQ.',
    privacyTitle: 'Note de confidentialité',
    privacyBody: 'Ne partagez pas de données financières sensibles ni de mots de passe dans les messages de support. THE SFM ne demande pas votre mot de passe en dehors de la page de connexion.',
    openFaq: 'Ouvrir la FAQ',
    openAbout: 'Lire À propos',
    backHome: 'Retour à l’accueil',
    comingSoon: 'Bientôt disponible',
  },
} as const;

export default function ContactPage() {
  const { lang, dir } = useLanguage();
  const locale = (lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar') as Lang;
  const text = TEXT[locale];
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? '';

  return (
    <main className="contact-page" dir={dir}>
      <nav className="contact-nav" aria-label={text.title}>
        <Link href="/" className="contact-brand" aria-label="THE SFM">
          <Image src="/sfm-logo.png" alt="THE SFM" width={44} height={44} priority className="contact-logo" />
          <span>THE SFM</span>
        </Link>
        <div className="contact-nav-links">
          <Link href="/about">{text.navAbout}</Link>
          <Link href="/#faq">{text.navFaq}</Link>
          <Link href="/login" className="contact-login">{text.login}</Link>
          <LanguageSwitcher />
        </div>
      </nav>

      <section className="contact-hero">
        <span>{text.supportChannel}</span>
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
        <div className="contact-actions">
          <Link href="/#faq">{text.openFaq}</Link>
          <Link href="/about">{text.openAbout}</Link>
        </div>
      </section>

      <section className="contact-grid" aria-label={text.supportChannel}>
        <article className="contact-card primary">
          <span className="contact-card-icon" aria-hidden="true"><Mail size={22} /></span>
          <div>
            <small>{text.supportEmail}</small>
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
            ) : (
              <strong>{text.emailNotConfigured}</strong>
            )}
            <p>{text.emailHint}</p>
          </div>
        </article>

        <article className="contact-card">
          <span className="contact-card-icon" aria-hidden="true"><MessageSquareText size={22} /></span>
          <div>
            <small>{text.comingSoon}</small>
            <strong>{text.formTitle}</strong>
            <p>{text.formBody}</p>
          </div>
        </article>

        <article className="contact-card">
          <span className="contact-card-icon" aria-hidden="true"><ShieldCheck size={22} /></span>
          <div>
            <small>THE SFM</small>
            <strong>{text.privacyTitle}</strong>
            <p>{text.privacyBody}</p>
          </div>
        </article>
      </section>

      <footer className="contact-footer">
        <Link href="/">{text.backHome}</Link>
        <Link href="/#faq">{text.navFaq}</Link>
        <Link href="/login">{text.login}</Link>
      </footer>

      <style jsx>{`
        .contact-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 10%, rgba(24, 212, 212, .16), transparent 30%),
            linear-gradient(160deg, #EEF6FF 0%, #F8FBFF 54%, #E7F1FF 100%);
          color: #061B33;
          font-family: Tajawal, Arial, sans-serif;
          padding: 18px;
          overflow-x: hidden;
        }
        .contact-nav,
        .contact-hero,
        .contact-grid,
        .contact-footer {
          width: min(1120px, 100%);
          margin-inline: auto;
        }
        .contact-nav {
          min-height: 68px;
          border: 1px solid rgba(29, 140, 255, .16);
          border-radius: 22px;
          background: rgba(255, 255, 255, .86);
          box-shadow: 0 16px 44px rgba(3, 18, 37, .08);
          backdrop-filter: blur(18px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 10px 12px;
          position: sticky;
          top: 12px;
          z-index: 10;
        }
        .contact-brand,
        .contact-nav-links,
        .contact-actions,
        .contact-footer {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .contact-brand {
          min-width: 0;
          text-decoration: none;
          color: #061B33;
          font-weight: 950;
        }
        .contact-logo {
          border-radius: 14px;
          object-fit: cover;
        }
        .contact-nav-links {
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .contact-nav a,
        .contact-footer a {
          color: #0B2748;
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
          border-radius: 999px;
          padding: 9px 11px;
          transition: background .18s ease, color .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        .contact-nav a:hover,
        .contact-footer a:hover,
        .contact-nav a:focus-visible,
        .contact-footer a:focus-visible {
          outline: none;
          color: #061B33;
          background: rgba(29, 140, 255, .10);
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .14);
          transform: translateY(-1px);
        }
        .contact-login,
        .contact-actions a:first-child {
          background: linear-gradient(135deg, #1D8CFF, #18D4D4);
          color: #FFFFFF !important;
          box-shadow: 0 12px 30px rgba(29, 140, 255, .22);
        }
        .contact-hero {
          margin-top: 34px;
          border-radius: 32px;
          background:
            radial-gradient(circle at 10% 0%, rgba(167, 243, 240, .26), transparent 30%),
            linear-gradient(135deg, #031225, #061B33 54%, #0B3A66 100%);
          color: #EAF6FF;
          padding: clamp(28px, 6vw, 68px);
          box-shadow: 0 24px 70px rgba(3, 18, 37, .22);
          overflow: hidden;
        }
        .contact-hero span {
          display: inline-flex;
          border: 1px solid rgba(167, 243, 240, .24);
          border-radius: 999px;
          background: rgba(24, 212, 212, .10);
          color: #A7F3F0;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 950;
        }
        .contact-hero h1 {
          margin: 18px 0 12px;
          font-size: clamp(40px, 8vw, 76px);
          line-height: 1.02;
          font-weight: 950;
          letter-spacing: 0;
        }
        .contact-hero p {
          max-width: 760px;
          margin: 0;
          color: #A7C7E7;
          font-size: 18px;
          line-height: 1.85;
          font-weight: 800;
        }
        .contact-actions {
          margin-top: 24px;
          flex-wrap: wrap;
        }
        .contact-actions a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 16px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 950;
          border: 1px solid rgba(167, 243, 240, .24);
          color: #EAF6FF;
          background: rgba(255, 255, 255, .08);
        }
        .contact-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 18px;
        }
        .contact-card {
          min-width: 0;
          border-radius: 24px;
          border: 1px solid rgba(29, 140, 255, .14);
          background: #FFFFFF;
          box-shadow: 0 16px 42px rgba(3, 18, 37, .07);
          padding: 20px;
          display: grid;
          gap: 15px;
          align-content: start;
        }
        .contact-card.primary {
          background:
            radial-gradient(circle at 0% 0%, rgba(24, 212, 212, .16), transparent 32%),
            #FFFFFF;
        }
        .contact-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, rgba(29, 140, 255, .12), rgba(24, 212, 212, .16));
          color: #1D8CFF;
          border: 1px solid rgba(29, 140, 255, .12);
        }
        .contact-card small {
          display: block;
          color: #1D8CFF;
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 7px;
        }
        .contact-card strong,
        .contact-card a {
          display: block;
          color: #061B33;
          font-size: 20px;
          font-weight: 950;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .contact-card a {
          color: #0B76E0;
          text-decoration: none;
        }
        .contact-card p {
          margin: 10px 0 0;
          color: #475569;
          line-height: 1.75;
          font-weight: 800;
        }
        .contact-footer {
          margin-top: 18px;
          padding: 18px 0 8px;
          justify-content: center;
          flex-wrap: wrap;
        }
        @media (max-width: 820px) {
          .contact-page {
            padding: 12px;
          }
          .contact-nav {
            position: static;
            align-items: flex-start;
            flex-direction: column;
          }
          .contact-nav-links {
            width: 100%;
            justify-content: flex-start;
          }
          .contact-hero {
            margin-top: 14px;
            border-radius: 26px;
          }
          .contact-actions,
          .contact-actions a {
            width: 100%;
          }
          .contact-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
