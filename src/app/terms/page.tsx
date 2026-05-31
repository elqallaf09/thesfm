'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, FileText, Mail, Scale, ShieldCheck, UserCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { SUPPORT_EMAIL, SUPPORT_EMAIL_ARIA_LABEL, SUPPORT_EMAIL_SUPPORT_MAILTO } from '@/lib/constants/contact';

type Lang = 'ar' | 'en' | 'fr';

const TEXT = {
  ar: {
    title: 'الشروط والأحكام',
    subtitle: 'باستخدام THE SFM، فإنك توافق على استخدام المنصة كأداة تنظيم وتحليل مالي مبنية على بياناتك الحقيقية، وليست بديلاً عن الاستشارة المتخصصة.',
    updated: 'آخر تحديث: مايو 2026',
    home: 'العودة إلى الرئيسية',
    contact: 'تواصل معنا',
    sections: [
      ['قبول الشروط', 'عند إنشاء حساب أو استخدام المنصة، توافق على هذه الشروط وعلى سياسة الخصوصية. إذا لم توافق، يجب التوقف عن استخدام الخدمة.'],
      ['طبيعة الخدمة', 'THE SFM يساعدك على تنظيم الدخل والمصروفات والمدخرات والاستثمارات والزكاة والمشاريع والتقارير. النتائج تعتمد على البيانات التي تدخلها أنت.'],
      ['مسؤولية المستخدم', 'أنت مسؤول عن صحة البيانات التي تضيفها، وحماية حسابك، وعدم مشاركة كلمات المرور أو معلومات مالية حساسة خارج القنوات الرسمية.'],
      ['إخلاء المسؤولية', 'لا تُعد المخرجات استشارة مالية أو قانونية أو ضريبية أو شرعية رسمية. راجع مختصاً مؤهلاً قبل اتخاذ قرارات مالية أو تجارية أو زكوية مهمة.'],
      ['الاستخدام المقبول', 'لا يجوز استخدام المنصة لمحاولة الوصول إلى بيانات مستخدمين آخرين، تعطيل الخدمة، إساءة استخدام التكاملات، أو إدخال محتوى مخالف للقانون.'],
      ['الدقة والتوفر', 'نسعى لتقديم خدمة مستقرة وواضحة، لكن قد تحدث أخطاء أو انقطاعات أو تأخر في بعض التكاملات. لن نعرض أرقاماً وهمية بدلاً من البيانات المفقودة.'],
      ['الملكية الفكرية', 'الشعار، التصميم، النصوص، والواجهة مملوكة أو مرخصة لـ THE SFM. بياناتك التي تضيفها إلى حسابك تبقى مرتبطة بك وبحسابك.'],
      ['تعديل الشروط', 'قد نحدّث هذه الشروط عند تطور المنتج أو المتطلبات النظامية. استمرار استخدامك للمنصة بعد التحديث يعني قبول الشروط المحدّثة.'],
    ],
  },
  en: {
    title: 'Terms and Conditions',
    subtitle: 'By using THE SFM, you agree to use the platform as an organization and financial analysis tool based on your real data, not as a substitute for qualified advice.',
    updated: 'Last updated: May 2026',
    home: 'Back to home',
    contact: 'Contact us',
    sections: [
      ['Acceptance', 'By creating an account or using the platform, you agree to these terms and the Privacy Policy. If you do not agree, stop using the service.'],
      ['Nature of the service', 'THE SFM helps organize income, expenses, savings, investments, zakat, projects, and reports. Outputs depend on the data you enter.'],
      ['User responsibility', 'You are responsible for the accuracy of the data you add, protecting your account, and not sharing passwords or sensitive financial information outside official channels.'],
      ['Disclaimer', 'Outputs are not official financial, legal, tax, or religious advice. Consult a qualified professional before important financial, business, or zakat decisions.'],
      ['Acceptable use', 'You may not use the platform to access other users’ data, disrupt the service, abuse integrations, or submit unlawful content.'],
      ['Accuracy and availability', 'We aim to provide a stable and clear service, but errors, interruptions, or integration delays may occur. We will not show fake numbers in place of missing data.'],
      ['Intellectual property', 'The logo, design, text, and interface are owned by or licensed to THE SFM. Data you add to your account remains associated with you and your account.'],
      ['Changes to terms', 'We may update these terms as the product or legal requirements evolve. Continued use after updates means acceptance of the updated terms.'],
    ],
  },
  fr: {
    title: 'Conditions générales',
    subtitle: 'En utilisant THE SFM, vous acceptez d’utiliser la plateforme comme outil d’organisation et d’analyse financière basé sur vos données réelles, sans remplacer un conseil qualifié.',
    updated: 'Dernière mise à jour : mai 2026',
    home: 'Retour à l’accueil',
    contact: 'Nous contacter',
    sections: [
      ['Acceptation', 'En créant un compte ou en utilisant la plateforme, vous acceptez ces conditions et la Politique de confidentialité. Si vous n’acceptez pas, cessez d’utiliser le service.'],
      ['Nature du service', 'THE SFM aide à organiser revenus, dépenses, épargne, investissements, zakat, projets et rapports. Les résultats dépendent des données que vous saisissez.'],
      ['Responsabilité utilisateur', 'Vous êtes responsable de l’exactitude des données ajoutées, de la protection du compte et de ne pas partager mots de passe ou données financières sensibles hors des canaux officiels.'],
      ['Avertissement', 'Les résultats ne constituent pas un conseil financier, juridique, fiscal ou religieux officiel. Consultez un professionnel qualifié avant toute décision importante.'],
      ['Utilisation acceptable', 'Vous ne pouvez pas utiliser la plateforme pour accéder aux données d’autres utilisateurs, perturber le service, abuser des intégrations ou soumettre un contenu illégal.'],
      ['Exactitude et disponibilité', 'Nous visons un service stable et clair, mais des erreurs, interruptions ou retards d’intégration peuvent survenir. Nous n’afficherons pas de faux chiffres à la place des données manquantes.'],
      ['Propriété intellectuelle', 'Le logo, le design, les textes et l’interface appartiennent à THE SFM ou lui sont concédés sous licence. Les données ajoutées restent associées à vous et à votre compte.'],
      ['Modification des conditions', 'Nous pouvons mettre à jour ces conditions selon l’évolution du produit ou des exigences légales. Continuer à utiliser la plateforme vaut acceptation des conditions mises à jour.'],
    ],
  },
} as const;

const icons = [CheckCircle2, FileText, UserCheck, AlertTriangle, ShieldCheck, Scale, FileText, CheckCircle2];

export default function TermsPage() {
  const { lang, dir } = useLanguage();
  const text = TEXT[lang as Lang];

  return (
    <main className="legal-page" dir={dir}>
      <section className="legal-hero">
        <span><Scale size={18} />THE SFM</span>
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
        <small>{text.updated}</small>
        <div className="legal-actions">
          <Link href="/">{text.home}</Link>
          <a href={SUPPORT_EMAIL_SUPPORT_MAILTO} aria-label={SUPPORT_EMAIL_ARIA_LABEL}><Mail size={16} />{text.contact}</a>
        </div>
      </section>

      <section className="legal-content" aria-label={text.title}>
        {text.sections.map(([title, body], index) => {
          const Icon = icons[index] ?? ShieldCheck;
          return (
            <article key={title}>
              <Icon size={21} aria-hidden="true" />
              <div>
                <h2>{title}</h2>
                <p>{body}</p>
              </div>
            </article>
          );
        })}
        <footer>
          <a className="legal-email" href={SUPPORT_EMAIL_SUPPORT_MAILTO} aria-label={SUPPORT_EMAIL_ARIA_LABEL}>{SUPPORT_EMAIL}</a>
          <span>{text.contact}</span>
        </footer>
      </section>

      <style jsx>{legalStyles}</style>
    </main>
  );
}

const legalStyles = `
  .legal-page{min-height:100vh;background:radial-gradient(circle at 16% 10%,rgba(24,212,212,.16),transparent 28%),linear-gradient(180deg,#EEF6FF,#FFFFFF);font-family:Tajawal,Arial,sans-serif;color:#061B33;padding:24px}
  .legal-hero,.legal-content{width:min(100%,960px);margin:0 auto}
  .legal-hero{padding:54px 0 28px}
  .legal-hero span{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(24,212,212,.24);background:rgba(24,212,212,.10);border-radius:999px;padding:8px 12px;color:#0B2748;font-weight:950}
  h1{margin:18px 0 10px;font-size:clamp(36px,7vw,64px);line-height:1.05;font-weight:950}
  .legal-hero p{max-width:760px;margin:0;color:#334155;line-height:1.9;font-weight:800}
  small{display:block;margin-top:12px;color:#64748B;font-weight:850}
  .legal-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
  .legal-actions a{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;padding:0 16px;text-decoration:none;font-weight:950}
  .legal-actions a:first-child{background:linear-gradient(135deg,#1D8CFF,#18D4D4);color:#fff}
  .legal-actions a:last-child{background:#fff;color:#061B33;border:1px solid rgba(29,140,255,.18)}
  .legal-content{display:grid;gap:14px;padding-bottom:54px}
  article{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;background:#fff;border:1px solid rgba(29,140,255,.14);border-radius:22px;padding:20px;box-shadow:0 14px 38px rgba(3,18,37,.07)}
  article svg{margin-top:4px;color:#18D4D4}
  h2{margin:0 0 8px;color:#061B33;font-size:20px;font-weight:950}
  article p{margin:0;color:#475569;line-height:1.9;font-weight:780}
  footer{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;border-radius:20px;background:#071E3A;color:#EAF6FF;padding:18px 20px}
  .legal-email{color:inherit;cursor:pointer;overflow-wrap:anywhere;font-weight:950;text-decoration:none;transition:color .18s ease,text-decoration-color .18s ease}
  .legal-email:hover{color:#A7F3F0;text-decoration:underline;text-decoration-color:rgba(24,212,212,.7);text-underline-offset:4px}
  footer span{color:#A7F3F0;font-weight:900}
  a:focus-visible{outline:3px solid rgba(24,212,212,.58);outline-offset:4px}
  @media(max-width:680px){.legal-page{padding:16px}.legal-hero{padding-top:34px}article{grid-template-columns:1fr}.legal-actions a{width:100%}}
`;
