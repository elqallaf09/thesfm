'use client';

import Link from 'next/link';
import { Database, Download, LockKeyhole, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { SUPPORT_EMAIL, SUPPORT_EMAIL_ARIA_LABEL, SUPPORT_EMAIL_SUPPORT_MAILTO } from '@/lib/constants/contact';

type Lang = 'ar' | 'en' | 'fr';

const TEXT = {
  ar: {
    title: 'سياسة الخصوصية',
    subtitle: 'تشرح هذه السياسة كيف يتعامل THE SFM مع بياناتك المالية والشخصية داخل المنصة. هدفنا أن تبقى التحليلات والتقارير مبنية على بياناتك الحقيقية فقط.',
    updated: 'آخر تحديث: مايو 2026',
    home: 'العودة إلى الرئيسية',
    contact: 'تواصل معنا',
    contactAria: 'تواصل معنا بخصوص سياسة الخصوصية',
    sections: [
      ['ما البيانات التي نجمعها؟', 'نجمع بيانات الحساب الأساسية مثل البريد الإلكتروني واسم المستخدم والتفضيلات، والبيانات التي تضيفها أنت داخل المنصة مثل الدخل والمصروفات والأهداف والاستثمارات والزكاة والمشاريع والمستندات والتقارير.'],
      ['كيف تُستخدم البيانات؟', 'تُستخدم بياناتك لتشغيل وظائف المنصة، عرض الملخصات، إنشاء التقارير، تنظيم التنبيهات، وتحسين تجربة الاستخدام داخل حسابك. لا نستخدم بيانات وهمية داخل حسابات المستخدمين الحقيقيين.'],
      ['التخزين والحماية', 'تُخزّن البيانات عبر خدمات البنية الخلفية المعتمدة للتطبيق، وتُفصل حسب حساب المستخدم وصلاحياته. نستخدم ضوابط وصول وسياسات قاعدة بيانات للمساعدة في منع وصول مستخدم إلى بيانات مستخدم آخر.'],
      ['مدة الاحتفاظ', 'نحتفظ ببياناتك ما دام حسابك نشطاً أو ما دامت مطلوبة لتقديم الخدمة. عند طلب حذف الحساب أو البيانات، نعمل على حذفها أو تعطيل الوصول إليها وفق الإمكانات الفنية والمتطلبات النظامية.'],
      ['الكوكيز والتخزين المحلي', 'قد نستخدم الكوكيز أو التخزين المحلي لحفظ حالة تسجيل الدخول، اللغة، السمات، وبعض تفضيلات الواجهة. لا تستخدم هذه العناصر لعرض أرقام مالية وهمية.'],
      ['الأطراف الثالثة', 'قد تعتمد المنصة على مزودي خدمات مثل الاستضافة، قاعدة البيانات، المصادقة، وقراءة المستندات. لا نشارك مفاتيحك أو بياناتك الحساسة علناً، ويجب عدم إرسال كلمات المرور عبر رسائل الدعم.'],
      ['حقوقك', 'يمكنك طلب تصدير بياناتك أو حذفها أو تصحيحها عند الحاجة. قد تتطلب بعض الطلبات تحققاً من الهوية لحماية الحساب.'],
      ['القانون الحاكم', 'تُفسّر هذه السياسة وفق القوانين والأنظمة المطبقة على تشغيل الخدمة ومكان تقديمها، مع احترام المتطلبات النظامية ذات الصلة بحماية البيانات.'],
    ],
  },
  en: {
    title: 'Privacy Policy',
    subtitle: 'This policy explains how THE SFM handles your financial and personal data. The platform is designed so analysis and reports rely on your real data only.',
    updated: 'Last updated: May 2026',
    home: 'Back to home',
    contact: 'Contact us',
    contactAria: 'Contact us about the privacy policy',
    sections: [
      ['What data do we collect?', 'We collect basic account data such as email, username, and preferences, plus the data you add inside the platform, including income, expenses, goals, investments, zakat, projects, documents, and reports.'],
      ['How is data used?', 'Your data is used to run platform features, show summaries, generate reports, organize notifications, and improve your account experience. We do not use fake data inside real user accounts.'],
      ['Storage and protection', 'Data is stored through the application’s backend services and separated by user account and permissions. Database policies help prevent one user from accessing another user’s data.'],
      ['Retention', 'We keep your data while your account is active or as needed to provide the service. When deletion is requested, we work to delete or restrict access according to technical capability and legal requirements.'],
      ['Cookies and local storage', 'We may use cookies or local storage to keep sign-in state, language, theme, and interface preferences. These are not used to show fictional financial numbers.'],
      ['Third parties', 'The platform may rely on providers for hosting, database, authentication, and document reading. We do not publicly expose keys or sensitive data, and passwords should not be sent in support messages.'],
      ['Your rights', 'You may request export, deletion, or correction of your data. Some requests may require identity verification to protect the account.'],
      ['Governing law', 'This policy is interpreted under the laws and regulations applicable to operating and providing the service, including relevant data protection requirements.'],
    ],
  },
  fr: {
    title: 'Politique de confidentialité',
    subtitle: 'Cette politique explique comment THE SFM traite vos données financières et personnelles. Les analyses et rapports reposent uniquement sur vos données réelles.',
    updated: 'Dernière mise à jour : mai 2026',
    home: 'Retour à l’accueil',
    contact: 'Nous contacter',
    contactAria: 'Nous contacter à propos de la politique de confidentialité',
    sections: [
      ['Quelles données collectons-nous ?', 'Nous collectons les données de compte de base comme e-mail, nom d’utilisateur et préférences, ainsi que les données ajoutées dans la plateforme : revenus, dépenses, objectifs, investissements, zakat, projets, documents et rapports.'],
      ['Comment les données sont-elles utilisées ?', 'Vos données servent à faire fonctionner la plateforme, afficher des synthèses, générer des rapports, organiser les notifications et améliorer l’expérience de votre compte. Nous n’utilisons pas de données fictives dans les comptes réels.'],
      ['Stockage et protection', 'Les données sont stockées via les services backend de l’application et séparées par compte utilisateur et autorisations. Des règles de base de données aident à empêcher l’accès d’un utilisateur aux données d’un autre.'],
      ['Durée de conservation', 'Nous conservons vos données tant que votre compte est actif ou nécessaire au service. En cas de demande de suppression, nous supprimons ou limitons l’accès selon les capacités techniques et obligations légales.'],
      ['Cookies et stockage local', 'Nous pouvons utiliser cookies ou stockage local pour conserver session, langue, thème et préférences d’interface. Ils ne servent pas à afficher de faux chiffres financiers.'],
      ['Tiers', 'La plateforme peut utiliser des fournisseurs pour hébergement, base de données, authentification et lecture de documents. Nous n’exposons pas publiquement les clés ou données sensibles, et les mots de passe ne doivent pas être envoyés au support.'],
      ['Vos droits', 'Vous pouvez demander l’export, la suppression ou la correction de vos données. Certaines demandes peuvent exiger une vérification d’identité pour protéger le compte.'],
      ['Droit applicable', 'Cette politique est interprétée selon les lois et règles applicables à l’exploitation et à la fourniture du service, y compris les exigences de protection des données.'],
    ],
  },
} as const;

const icons = [Database, ShieldCheck, LockKeyhole, Trash2, ShieldCheck, Database, Download, LockKeyhole];

export default function PrivacyPage() {
  const { lang, dir } = useLanguage();
  const text = TEXT[lang as Lang];

  return (
    <main className="legal-page" dir={dir}>
      <section className="legal-hero">
        <span><LockKeyhole size={18} />THE SFM</span>
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
        <small>{text.updated}</small>
        <div className="legal-actions">
          <Link href="/">{text.home}</Link>
          <Link href="/contact" aria-label={text.contactAria}><Mail size={16} />{text.contact}</Link>
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
          <a className="privacy-email" href={SUPPORT_EMAIL_SUPPORT_MAILTO} aria-label={SUPPORT_EMAIL_ARIA_LABEL}>{SUPPORT_EMAIL}</a>
          <Link className="privacy-contact-link" href="/contact" aria-label={text.contactAria}>
            <Mail size={16} aria-hidden="true" />
            <span>{text.contact}</span>
          </Link>
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
  footer{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;border-radius:20px;background:#071E3A;color:#EAF6FF;padding:18px 20px}
  footer a{color:inherit;text-decoration:none}
  .privacy-email{overflow-wrap:anywhere;font-weight:950;cursor:pointer;transition:color .18s ease,text-decoration-color .18s ease}
  .privacy-email:hover{color:#A7F3F0;text-decoration:underline;text-decoration-color:rgba(24,212,212,.7);text-underline-offset:4px}
  .privacy-contact-link{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(167,243,240,.22);border-radius:999px;background:rgba(24,212,212,.1);color:#A7F3F0!important;padding:9px 12px;font-weight:950}
  .privacy-contact-link:hover{border-color:rgba(167,243,240,.42);background:rgba(24,212,212,.16)}
  footer span{color:inherit;font-weight:950}
  a:focus-visible{outline:3px solid rgba(24,212,212,.58);outline-offset:4px}
  @media(max-width:680px){.legal-page{padding:16px}.legal-hero{padding-top:34px}article{grid-template-columns:1fr}.legal-actions a{width:100%}}
`;
