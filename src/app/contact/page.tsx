'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  LockKeyhole,
  Mail,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { SUPPORT_EMAIL, SUPPORT_EMAIL_ARIA_LABEL, SUPPORT_EMAIL_SUPPORT_MAILTO } from '@/lib/constants/contact';

type Lang = 'ar' | 'en' | 'fr';

const COPY = {
  ar: {
    pageLabel: 'تواصل معنا',
    about: 'من نحن',
    faq: 'الأسئلة الشائعة',
    login: 'تسجيل الدخول',
    getStarted: 'ابدأ الآن',
    openDashboard: 'فتح لوحة التحكم',
    supportChannel: 'قناة الدعم',
    heroTitle: 'تواصل معنا',
    heroSubtitle: 'نحن هنا لمساعدتك في الأسئلة العامة عن THE SFM، الحساب، الخصوصية، أو طريقة استخدام المنصة.',
    supportEmailReady: 'للدعم والمساعدة، تواصل معنا عبر:',
    supportEmailHint: 'للدعم والمساعدة، تواصل معنا عبر:',
    contactForm: 'نموذج التواصل',
    contactFormBody: 'اكتب رسالتك، وسيتم الرد عليك عبر البريد الإلكتروني.',
    privacyNotice: 'تنبيه الخصوصية',
    privacyNoticeBody: 'لا تشارك كلمة المرور أو أي بيانات حساسة في أي رسالة دعم. فريق THE SFM لا يطلب كلمة المرور خارج صفحة تسجيل الدخول.',
    openFaq: 'الأسئلة الشائعة',
    securityPrivacy: 'الأمان والخصوصية',
    formTitle: 'نموذج التواصل',
    formSubtitle: 'اكتب رسالتك، وسيتم الرد عليك عبر البريد الإلكتروني.',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    subject: 'الموضوع',
    message: 'الرسالة',
    sendMessage: 'إرسال الرسالة',
    sending: 'جاري الإرسال...',
    messageSent: 'تم إرسال رسالتك بنجاح. سيتم الرد عليك عبر البريد الإلكتروني.',
    messageFailed: 'تعذر إرسال الرسالة حالياً. يمكنك مراسلتنا مباشرة عبر',
    smtpMissing: 'تعذر إرسال الرسالة حالياً. يمكنك مراسلتنا مباشرة عبر',
    invalidEmail: 'الرجاء إدخال بريد إلكتروني صحيح.',
    messageRequired: 'الرسالة مطلوبة ويجب أن تكون 10 أحرف على الأقل.',
    requiredField: 'هذا الحقل مطلوب.',
    noFakeSupport: 'لا توجد أرقام هاتف أو عناوين مكتبية غير مؤكدة على هذه الصفحة.',
    publicOnly: 'هذه الصفحة مخصصة للاستفسارات العامة، وليست قناة لإرسال بيانات مالية حساسة.',
    footerNote: 'THE SFM يساعدك على تنظيم المال والمشاريع بناءً على بياناتك الحقيقية فقط.',
    privacy: 'الخصوصية',
    terms: 'الشروط',
    openMenu: 'فتح القائمة',
    closeMenu: 'إغلاق القائمة',
    currentPage: 'الصفحة الحالية',
  },
  en: {
    pageLabel: 'Contact Us',
    about: 'About',
    faq: 'FAQ',
    login: 'Login',
    getStarted: 'Get Started',
    openDashboard: 'Open Dashboard',
    supportChannel: 'Support Channel',
    heroTitle: 'Contact Us',
    heroSubtitle: 'We are here to help with general questions about THE SFM, your account, privacy, or how to use the platform.',
    supportEmailReady: 'For support, contact us at:',
    supportEmailHint: 'For support, contact us at:',
    contactForm: 'Contact Form',
    contactFormBody: 'Write your message and we will review it and reply by email.',
    privacyNotice: 'Privacy Notice',
    privacyNoticeBody: 'Do not share your password or sensitive information in any support message. THE SFM team does not ask for passwords outside the login page.',
    openFaq: 'FAQ',
    securityPrivacy: 'Security & Privacy',
    formTitle: 'Contact Form',
    formSubtitle: 'Write your message and we will review it and reply by email.',
    name: 'Name',
    email: 'Email',
    subject: 'Subject',
    message: 'Message',
    sendMessage: 'Send Message',
    sending: 'Sending...',
    messageSent: 'Your message has been sent successfully. We will review it and reply by email.',
    messageFailed: 'Could not send the message right now. You can email us directly at',
    smtpMissing: 'Could not send the message right now. You can email us directly at',
    invalidEmail: 'Please enter a valid email address.',
    messageRequired: 'Message is required and must be at least 10 characters.',
    requiredField: 'This field is required.',
    noFakeSupport: 'This page does not list unverified phone numbers or office addresses.',
    publicOnly: 'This page is for general questions, not for sending sensitive financial data.',
    footerNote: 'THE SFM helps you organize money and projects using your real data only.',
    privacy: 'Privacy',
    terms: 'Terms',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    currentPage: 'Current page',
  },
  fr: {
    pageLabel: 'Contactez-nous',
    about: 'À propos',
    faq: 'FAQ',
    login: 'Connexion',
    getStarted: 'Commencer',
    openDashboard: 'Ouvrir le tableau',
    supportChannel: 'Support',
    heroTitle: 'Contactez-nous',
    heroSubtitle: 'Nous sommes là pour vous aider avec les questions générales sur THE SFM, votre compte, la confidentialité ou l’utilisation de la plateforme.',
    supportEmailReady: 'Pour obtenir de l’aide, contactez-nous à :',
    supportEmailHint: 'Pour obtenir de l’aide, contactez-nous à :',
    contactForm: 'Formulaire de contact',
    contactFormBody: 'Écrivez votre message, nous l’examinerons et vous répondrons par e-mail.',
    privacyNotice: 'Avis de confidentialité',
    privacyNoticeBody: 'Ne partagez pas votre mot de passe ni d’informations sensibles dans un message de support. L’équipe THE SFM ne demande pas de mot de passe en dehors de la page de connexion.',
    openFaq: 'FAQ',
    securityPrivacy: 'Sécurité et confidentialité',
    formTitle: 'Formulaire de contact',
    formSubtitle: 'Écrivez votre message, nous l’examinerons et vous répondrons par e-mail.',
    name: 'Nom',
    email: 'E-mail',
    subject: 'Objet',
    message: 'Message',
    sendMessage: 'Envoyer le message',
    sending: 'Envoi...',
    messageSent: 'Votre message a été envoyé avec succès. Nous l’examinerons et vous répondrons par e-mail.',
    messageFailed: 'Impossible d’envoyer le message actuellement. Vous pouvez nous écrire directement à',
    smtpMissing: 'Impossible d’envoyer le message actuellement. Vous pouvez nous écrire directement à',
    invalidEmail: 'Veuillez saisir une adresse e-mail valide.',
    messageRequired: 'Le message est requis et doit contenir au moins 10 caractères.',
    requiredField: 'Ce champ est requis.',
    noFakeSupport: 'Cette page ne contient pas de numéros de téléphone ou d’adresses de bureau non vérifiés.',
    publicOnly: 'Cette page est destinée aux questions générales, pas à l’envoi de données financières sensibles.',
    footerNote: 'THE SFM vous aide à organiser votre argent et vos projets uniquement avec vos données réelles.',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    currentPage: 'Page actuelle',
  },
} satisfies Record<Lang, Record<string, string>>;

export default function ContactPage() {
  const { dir, lang } = useLanguage();
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [sending, setSending] = useState(false);
  const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string; showEmailFallback?: boolean } | null>(null);
  const locale = (['ar', 'en', 'fr'].includes(lang) ? lang : 'ar') as Lang;
  const text = COPY[locale];
  const appHref = session ? '/dashboard' : '/login';
  const primaryLabel = session ? text.openDashboard : text.getStarted;
  const supportEmail = SUPPORT_EMAIL;

  const navLinks = [
    { href: '/about', label: text.about },
    { href: '/#faq', label: text.faq },
  ];

  function contactErrorMessage(code?: string) {
    if (code === 'invalid_email') return { message: text.invalidEmail, showEmailFallback: false };
    if (code === 'message_required') return { message: text.messageRequired, showEmailFallback: false };
    if (code === 'smtp_not_configured') return { message: text.smtpMissing, showEmailFallback: true };
    return { message: text.messageFailed, showEmailFallback: true };
  }

  function validateForm() {
    if (!form.name.trim() || !form.subject.trim()) return text.requiredField;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return text.invalidEmail;
    if (form.message.trim().length < 10) return text.messageRequired;
    return '';
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const validationError = validateForm();
    if (validationError) {
      setFormStatus({ type: 'error', message: validationError });
      return;
    }

    setSending(true);
    setFormStatus(null);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
          website: form.website,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { success?: boolean; code?: string; error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.code || 'send_failed');
      }
      setForm({ name: '', email: '', subject: '', message: '', website: '' });
      setFormStatus({ type: 'success', message: text.messageSent });
    } catch (error) {
      const contactError = contactErrorMessage(error instanceof Error ? error.message : undefined);
      setFormStatus({ type: 'error', ...contactError });
    } finally {
      setSending(false);
    }
  }

  const contactCards = useMemo(() => [
    {
      title: text.heroTitle,
      body: text.supportEmailReady,
      value: supportEmail,
      icon: Mail,
    },
    {
      title: text.contactForm,
      body: text.contactFormBody,
      icon: MessageSquareText,
      action: { href: '#contact-form', label: text.sendMessage, external: false },
    },
    {
      title: text.privacyNotice,
      body: text.privacyNoticeBody,
      icon: ShieldCheck,
      action: { href: '/security', label: text.securityPrivacy, external: false },
    },
  ], [supportEmail, text]);

  return (
    <main className="contact-page" dir={dir}>
      <nav className="contact-nav" aria-label={text.pageLabel}>
        <Link href="/" className="contact-brand" aria-label="THE SFM">
          <Image src="/sfm-logo.png" alt="THE SFM" width={46} height={46} priority className="contact-logo" />
          <span>THE SFM</span>
        </Link>

        <div className={menuOpen ? 'contact-links open' : 'contact-links'}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} aria-current={link.href === '/contact' ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div className="mobile-menu-ctas">
            <Link href={appHref} className="nav-primary-mobile" onClick={() => setMenuOpen(false)}>
              {primaryLabel}
            </Link>
          </div>
        </div>

        <div className="contact-actions">
          <LanguageSwitcher variant="gold" compact />
          <Link href={appHref} className="nav-primary">{primaryLabel}</Link>
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={menuOpen ? text.closeMenu : text.openMenu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(value => !value)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <section className="contact-hero">
        <div className="hero-copy">
          <span className="hero-badge">
            <Sparkles size={16} aria-hidden="true" />
            {text.supportChannel}
          </span>
          <h1>{text.heroTitle}</h1>
          <p>{text.heroSubtitle}</p>
        </div>
        <div className="hero-panel" aria-label={text.privacyNotice}>
          <div className="hero-panel-icon" aria-hidden="true">
            <LockKeyhole size={30} />
          </div>
          <strong>{text.publicOnly}</strong>
          <span>{text.noFakeSupport}</span>
        </div>
      </section>

      <section className="contact-cards" aria-label={text.pageLabel}>
        {contactCards.map(card => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="contact-card">
              <div className="card-icon" aria-hidden="true">
                <Icon size={23} />
              </div>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
              {card.value === supportEmail ? (
                <a href={SUPPORT_EMAIL_SUPPORT_MAILTO} className="support-email-link" aria-label={SUPPORT_EMAIL_ARIA_LABEL}>{card.value}</a>
              ) : card.value ? (
                <strong>{card.value}</strong>
              ) : null}
              {card.action && (
                card.action.href.startsWith('mailto:') ? (
                  <a href={card.action.href} className="card-action" aria-label={card.action.label}>
                    {card.action.label}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                ) : (
                  <Link href={card.action.href} className="card-action" aria-label={card.action.label}>
                    {card.action.label}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                )
              )}
            </article>
          );
        })}
      </section>

      <section className="contact-form-section" id="contact-form" aria-labelledby="contact-form-title">
        <div className="form-copy">
          <span>
            <CheckCircle2 size={16} aria-hidden="true" />
            {text.contactForm}
          </span>
          <h2 id="contact-form-title">{text.formTitle}</h2>
          <p>{text.formSubtitle}</p>
        </div>
        <form className="contact-form-preview" aria-describedby={formStatus ? 'contact-form-status' : undefined} onSubmit={submitContact}>
          <label className="contact-honeypot" aria-hidden="true">
            Website
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={event => setForm(previous => ({ ...previous, website: event.target.value }))}
            />
          </label>
          <div className="form-grid">
            <label>
              <span>{text.name}</span>
              <input
                id="contact-name"
                type="text"
                required
                autoComplete="name"
                placeholder={text.name}
                value={form.name}
                onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))}
              />
            </label>
            <label>
              <span>{text.email}</span>
              <input
                id="contact-email"
                type="email"
                required
                autoComplete="email"
                placeholder={text.email}
                value={form.email}
                onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))}
              />
            </label>
          </div>
          <label>
            <span>{text.subject}</span>
            <input
              id="contact-subject"
              type="text"
              required
              maxLength={120}
              placeholder={text.subject}
              value={form.subject}
              onChange={event => setForm(previous => ({ ...previous, subject: event.target.value }))}
            />
          </label>
          <label>
            <span>{text.message}</span>
            <textarea
              id="contact-message"
              required
              minLength={10}
              maxLength={3000}
              placeholder={text.message}
              rows={5}
              value={form.message}
              onChange={event => setForm(previous => ({ ...previous, message: event.target.value }))}
            />
          </label>
          {formStatus && (
            <p
              id="contact-form-status"
              className={`form-status ${formStatus.type}`}
              role={formStatus.type === 'error' ? 'alert' : 'status'}
            >
              {formStatus.message}
              {formStatus.type === 'error' && formStatus.showEmailFallback && (
                <>
                  {' '}
                  <a href={SUPPORT_EMAIL_SUPPORT_MAILTO} aria-label={SUPPORT_EMAIL_ARIA_LABEL}>{SUPPORT_EMAIL}</a>.
                </>
              )}
            </p>
          )}
          <div className="form-actions">
            <p id="contact-form-note">{text.publicOnly}</p>
            <button type="submit" disabled={sending} aria-label={text.sendMessage}>
              {sending ? text.sending : text.sendMessage}
            </button>
          </div>
        </form>
      </section>

      <footer className="contact-footer">
        <div className="footer-brand">
          <Image src="/sfm-logo.png" alt="THE SFM" width={42} height={42} className="contact-logo" />
          <div>
            <strong>THE SFM</strong>
            <p>{text.footerNote}</p>
          </div>
        </div>
        <div className="footer-links" aria-label={text.securityPrivacy}>
          <Link href="/security">{text.securityPrivacy}</Link>
          <Link href="/privacy">{text.privacy}</Link>
          <Link href="/terms">{text.terms}</Link>
        </div>
      </footer>

      <style jsx>{contactStyles}</style>
    </main>
  );
}

const contactStyles = `
  .contact-page {
    min-height: 100vh;
    overflow-x: hidden;
    color: #334155;
    background:
      radial-gradient(circle at 14% 8%, rgba(24, 212, 212, 0.17), transparent 28%),
      radial-gradient(circle at 88% 18%, rgba(29, 140, 255, 0.15), transparent 30%),
      linear-gradient(180deg, #EEF6FF 0%, #F8FBFF 48%, #FFFFFF 100%);
    font-family: Tajawal, Arial, sans-serif;
  }
  .contact-nav {
    position: sticky;
    top: 12px;
    z-index: 150;
    width: min(1180px, calc(100% - 32px));
    min-height: 70px;
    margin: 16px auto 0;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid rgba(29, 140, 255, 0.18);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 16px 44px rgba(3, 18, 37, 0.12);
    backdrop-filter: blur(18px);
  }
  .contact-brand,
  .contact-links,
  .contact-actions,
  .hero-badge,
  .contact-card .card-action,
  .form-copy span,
  .footer-brand,
  .footer-links {
    display: flex;
    align-items: center;
  }
  .contact-brand {
    gap: 10px;
    color: #061B33;
    text-decoration: none;
    font-weight: 950;
  }
  .contact-logo {
    border-radius: 14px;
    object-fit: cover;
    box-shadow: 0 10px 24px rgba(3, 18, 37, 0.16);
  }
  .contact-links {
    gap: 8px;
    justify-content: center;
    flex: 1;
  }
  .mobile-menu-ctas {
    display: none;
  }
  .contact-links a,
  .nav-login,
  .nav-login-mobile {
    min-height: 38px;
    padding: 8px 12px;
    border: 1px solid transparent;
    border-radius: 999px;
    color: #0B2748;
    text-decoration: none;
    font-size: 13px;
    font-weight: 900;
    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease, color 180ms ease;
  }
  .contact-links a:hover,
  .nav-login:hover,
  .nav-login-mobile:hover {
    background: #EEF6FF;
    border-color: rgba(29, 140, 255, 0.24);
    color: #061B33;
    box-shadow: 0 10px 26px rgba(3, 18, 37, 0.08);
    transform: translateY(-1px);
  }
  .contact-actions {
    gap: 8px;
    justify-content: flex-end;
  }
  .nav-primary,
  .nav-primary-mobile {
    min-height: 40px;
    display: grid;
    place-items: center;
    padding: 8px 14px;
    border: 1px solid rgba(24, 212, 212, 0.24);
    border-radius: 999px;
    background: linear-gradient(135deg, #1D8CFF 0%, #18D4D4 100%);
    color: #FFFFFF;
    box-shadow: 0 10px 30px rgba(29, 140, 255, 0.22);
    text-decoration: none;
    font-size: 13px;
    font-weight: 950;
    transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
  }
  .nav-primary:hover,
  .nav-primary-mobile:hover {
    filter: saturate(1.08) brightness(1.04);
    transform: translateY(-2px);
    box-shadow: 0 16px 40px rgba(24, 212, 212, 0.30);
  }
  .nav-primary:active,
  .nav-primary-mobile:active {
    transform: translateY(0) scale(0.98);
    box-shadow: 0 8px 22px rgba(29, 140, 255, 0.18);
  }
  .mobile-menu-button {
    display: none;
    width: 40px;
    height: 40px;
    border-radius: 14px;
    border: 1px solid rgba(29, 140, 255, 0.24);
    background: #FFFFFF;
    color: #061B33;
    cursor: pointer;
  }
  .contact-hero,
  .contact-cards,
  .contact-form-section,
  .contact-footer {
    width: min(1180px, calc(100% - 32px));
    margin-inline: auto;
  }
  .contact-hero {
    padding: 54px 0 38px;
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
    align-items: stretch;
    gap: 22px;
  }
  .hero-copy {
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(167, 243, 240, 0.18);
    border-radius: 34px;
    padding: clamp(28px, 5vw, 52px);
    color: #EAF6FF;
    background:
      radial-gradient(circle at 16% 14%, rgba(24, 212, 212, 0.28), transparent 32%),
      radial-gradient(circle at 82% 22%, rgba(29, 140, 255, 0.25), transparent 34%),
      linear-gradient(135deg, #031225 0%, #061B33 52%, #0B2748 100%);
    box-shadow: 0 30px 90px rgba(3, 18, 37, 0.22);
  }
  .hero-badge {
    width: fit-content;
    gap: 8px;
    border: 1px solid rgba(167, 243, 240, 0.24);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: #A7F3F0;
    padding: 8px 13px;
    font-size: 12px;
    font-weight: 950;
  }
  .hero-copy h1 {
    margin: 22px 0 12px;
    color: #FFFFFF;
    font-size: clamp(38px, 6vw, 66px);
    line-height: 1.04;
    font-weight: 950;
    letter-spacing: 0;
  }
  .hero-copy p {
    max-width: 780px;
    margin: 0;
    color: #D9ECFF;
    font-size: 18px;
    line-height: 1.9;
    font-weight: 760;
  }
  .hero-panel {
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.15);
    border-radius: 34px;
    background: #FFFFFF;
    box-shadow: 0 18px 46px rgba(3, 18, 37, 0.08);
    padding: clamp(24px, 4vw, 34px);
    display: grid;
    align-content: center;
    gap: 16px;
  }
  .hero-panel-icon {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba(29, 140, 255, 0.12), rgba(24, 212, 212, 0.16));
    color: #0B76E0;
    border: 1px solid rgba(29, 140, 255, 0.14);
  }
  .hero-panel strong {
    color: #061B33;
    font-size: 20px;
    line-height: 1.55;
    font-weight: 950;
  }
  .hero-panel span {
    color: #475569;
    line-height: 1.8;
    font-weight: 800;
  }
  .contact-cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    padding-top: 10px;
  }
  .contact-card {
    min-width: 0;
    min-height: 100%;
    border: 1px solid rgba(29, 140, 255, 0.14);
    border-radius: 26px;
    background: #FFFFFF;
    box-shadow: 0 14px 36px rgba(3, 18, 37, 0.07);
    padding: 22px;
    display: grid;
    align-content: start;
    gap: 12px;
    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  }
  .contact-card:hover {
    border-color: rgba(24, 212, 212, 0.38);
    box-shadow: 0 18px 46px rgba(29, 140, 255, 0.13);
    transform: translateY(-2px);
  }
  .card-icon {
    width: 50px;
    height: 50px;
    display: grid;
    place-items: center;
    border-radius: 17px;
    background: linear-gradient(135deg, rgba(29, 140, 255, 0.12), rgba(24, 212, 212, 0.14));
    border: 1px solid rgba(29, 140, 255, 0.14);
    color: #18D4D4;
  }
  .contact-card h2,
  .form-copy h2 {
    margin: 0;
    color: #061B33;
    font-size: 22px;
    line-height: 1.35;
    font-weight: 950;
  }
  .contact-card p,
  .form-copy p,
  .contact-form-preview p,
  .footer-brand p {
    margin: 0;
    color: #475569;
    line-height: 1.75;
    font-weight: 760;
  }
  .contact-card strong {
    color: #0B2748;
    overflow-wrap: anywhere;
    font-size: 15px;
    line-height: 1.55;
    font-weight: 950;
  }
  .support-email-link,
  .inline-email-link,
  .form-status a {
    width: fit-content;
    color: #0B76E0;
    cursor: pointer;
    overflow-wrap: anywhere;
    font-size: 15px;
    line-height: 1.55;
    font-weight: 950;
    text-decoration: underline;
    text-decoration-color: rgba(24, 212, 212, 0.55);
    text-underline-offset: 4px;
    transition: color 180ms ease, text-decoration-color 180ms ease;
  }
  .support-email-link:hover,
  .inline-email-link:hover,
  .form-status a:hover {
    color: #061B33;
    text-decoration-color: #18D4D4;
  }
  .contact-card .card-action {
    width: fit-content;
    min-height: 42px;
    gap: 8px;
    margin-top: 4px;
    padding: 9px 13px;
    border: 1px solid rgba(29, 140, 255, 0.22);
    border-radius: 999px;
    background: #F8FBFF;
    color: #0B76E0;
    text-decoration: none;
    font-size: 13px;
    font-weight: 950;
    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease;
  }
  .contact-card .card-action:hover {
    border-color: rgba(24, 212, 212, 0.42);
    background: #EEF6FF;
    box-shadow: 0 12px 28px rgba(24, 212, 212, 0.16);
    transform: translateY(-1px);
  }
  .contact-form-section {
    margin-top: 18px;
    display: grid;
    grid-template-columns: minmax(260px, 0.78fr) minmax(0, 1.22fr);
    gap: 16px;
    align-items: stretch;
    border: 1px solid rgba(29, 140, 255, 0.14);
    border-radius: 30px;
    background: rgba(255, 255, 255, 0.86);
    box-shadow: 0 18px 46px rgba(3, 18, 37, 0.08);
    padding: 22px;
  }
  .form-copy {
    min-width: 0;
    display: grid;
    align-content: center;
    gap: 12px;
  }
  .form-copy span {
    width: fit-content;
    gap: 8px;
    border: 1px solid rgba(24, 212, 212, 0.22);
    border-radius: 999px;
    background: rgba(24, 212, 212, 0.1);
    color: #0B76E0;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 950;
  }
  .contact-form-preview {
    min-width: 0;
    display: grid;
    gap: 12px;
  }
  .contact-honeypot {
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .contact-form-preview label {
    min-width: 0;
    display: grid;
    gap: 7px;
    color: #0B2748;
    font-size: 13px;
    font-weight: 950;
  }
  .contact-form-preview input,
  .contact-form-preview textarea {
    width: 100%;
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.16);
    border-radius: 16px;
    background: #F8FBFF;
    color: #475569;
    padding: 12px 13px;
    font: 800 14px Tajawal, Arial, sans-serif;
    resize: vertical;
  }
  .contact-form-preview input:focus,
  .contact-form-preview textarea:focus {
    outline: none;
    border-color: rgba(24, 212, 212, 0.58);
    box-shadow: 0 0 0 4px rgba(24, 212, 212, 0.14);
    background: #FFFFFF;
  }
  .contact-form-preview input:disabled,
  .contact-form-preview textarea:disabled,
  .contact-form-preview button:disabled {
    opacity: 0.78;
    cursor: not-allowed;
  }
  .form-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .contact-form-preview button {
    min-height: 44px;
    border: 1px solid rgba(24, 212, 212, 0.26);
    border-radius: 999px;
    background: linear-gradient(135deg, #1D8CFF 0%, #18D4D4 100%);
    color: #FFFFFF;
    box-shadow: 0 10px 30px rgba(29, 140, 255, 0.20);
    padding: 10px 16px;
    cursor: pointer;
    font: 950 13px Tajawal, Arial, sans-serif;
    transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
  }
  .contact-form-preview button:hover:not(:disabled) {
    filter: saturate(1.08) brightness(1.04);
    transform: translateY(-1px);
    box-shadow: 0 14px 34px rgba(24, 212, 212, 0.24);
  }
  .form-status {
    border-radius: 16px;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 900;
    line-height: 1.7;
  }
  .form-status.success {
    border: 1px solid rgba(16, 185, 129, 0.20);
    background: #ECFDF5;
    color: #047857;
  }
  .form-status.error {
    border: 1px solid rgba(239, 68, 68, 0.18);
    background: #FEF2F2;
    color: #B91C1C;
  }
  .contact-footer {
    margin-top: 38px;
    padding: 26px 0 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    border-top: 1px solid rgba(29, 140, 255, 0.12);
  }
  .footer-brand {
    max-width: 620px;
    gap: 12px;
    color: #061B33;
  }
  .footer-brand strong {
    display: block;
    color: #061B33;
    font-weight: 950;
  }
  .footer-links {
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .footer-links a {
    color: #64748B;
    text-decoration: none;
    font-size: 13px;
    font-weight: 900;
    transition: color 180ms ease, text-decoration-color 180ms ease;
  }
  .footer-links a:hover {
    color: #0B76E0;
    text-decoration: underline;
    text-decoration-color: rgba(24, 212, 212, 0.72);
  }
  a:focus-visible,
  button:focus-visible,
  input:focus-visible,
  textarea:focus-visible {
    outline: 3px solid rgba(24, 212, 212, 0.58);
    outline-offset: 3px;
  }
  @media (max-width: 980px) {
    .contact-nav {
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .contact-links {
      order: 3;
      flex-basis: 100%;
      display: none;
      grid-template-columns: 1fr;
      justify-content: stretch;
      padding-top: 8px;
    }
    .contact-links.open {
      display: grid;
    }
    .contact-links a {
      background: #F8FBFF;
    }
    .mobile-menu-ctas {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      padding-top: 8px;
    }
    .nav-login,
    .nav-primary {
      display: none;
    }
    .mobile-menu-button {
      display: grid;
      place-items: center;
    }
    .contact-hero,
    .contact-form-section {
      grid-template-columns: 1fr;
    }
    .contact-cards {
      grid-template-columns: 1fr;
    }
    .contact-footer {
      align-items: flex-start;
      flex-direction: column;
    }
    .footer-links {
      justify-content: flex-start;
    }
  }
  @media (max-width: 620px) {
    .contact-nav,
    .contact-hero,
    .contact-cards,
    .contact-form-section,
    .contact-footer {
      width: min(100% - 24px, 1180px);
    }
    .contact-nav {
      margin-top: 12px;
      border-radius: 20px;
    }
    .contact-brand span {
      display: none;
    }
    .contact-actions {
      gap: 6px;
    }
    .hero-copy,
    .hero-panel,
    .contact-form-section {
      border-radius: 26px;
      padding: 22px;
    }
    .hero-copy h1 {
      font-size: 38px;
    }
    .hero-copy p {
      font-size: 16px;
    }
    .mobile-menu-ctas,
    .form-grid {
      grid-template-columns: 1fr;
    }
    .nav-login-mobile,
    .nav-primary-mobile,
    .contact-form-preview button {
      width: 100%;
    }
    .form-actions {
      display: grid;
      grid-template-columns: 1fr;
    }
  }
`;
