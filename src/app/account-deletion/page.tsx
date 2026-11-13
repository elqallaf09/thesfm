'use client';

import Link from 'next/link';
import { Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLanguage } from '@/hooks/useLanguage';
import { SUPPORT_EMAIL, SUPPORT_EMAIL_MAILTO } from '@/lib/constants/contact';

const TEXT = {
  ar: {
    title: 'حذف الحساب والبيانات',
    intro: 'يمكنك طلب حذف حساب THE SFM وبياناته المرتبطة، بما فيها البيانات المستخدمة لربط SFM TV. يمكنك استخدام هذه الصفحة من متصفحك دون تثبيت تطبيق التلفزيون.',
    language: 'اللغة',
    home: 'الرئيسية',
    profile: 'فتح الملف الشخصي',
    signInTitle: 'إذا كان بإمكانك تسجيل الدخول',
    steps: [
      'سجّل الدخول إلى حساب THE SFM، ثم افتح صفحة الملف الشخصي.',
      'انتقل إلى «منطقة الخطر». يمكنك اختيار «تصدير نسخة من بياناتي قبل الحذف» إذا احتجت نسخة.',
      'اختر «حذف الحساب»، ثم اقرأ تنبيه الحذف النهائي.',
      'اكتب DELETE أو حذف، ثم اختر «تأكيد الحذف النهائي». انتظر ظهور رسالة نجاح الحذف.',
    ],
    supportTitle: 'إذا تعذّر تسجيل الدخول أو إكمال الحذف',
    supportBody: 'أرسل طلب حذف حساب THE SFM أو SFM TV من البريد المسجّل في حسابك إلى بريد الدعم أدناه. اذكر أنك تريد حذف الحساب والبيانات المرتبطة به. قد نطلب التحقق من ملكية الحساب لحمايتك.',
    emailAction: 'طلب الحذف عبر البريد',
    emailSubject: 'طلب حذف حساب THE SFM أو SFM TV',
    emailBody: 'أطلب حذف حساب THE SFM والبيانات المرتبطة به. أرسل هذا الطلب من البريد المسجّل في حسابي.',
    safeEmail: 'لا ترسل كلمة المرور أو رمز التحقق أو بيانات مالية حساسة في رسالة الدعم.',
    dataTitle: 'ما الذي يشمله الحذف؟',
    dataBody: 'يشمل حذف الحساب ملفك الشخصي وسجلات الدخل والمصروفات والمدخرات والاستثمارات والأهداف والتقارير وسجلات المشاريع المرتبطة بحسابك. يُحذف حساب تسجيل الدخول وتنتهي إمكانية وصول أجهزة SFM TV المرتبطة به. الحذف النهائي لا يمكن التراجع عنه.',
    retentionBody: 'توضح سياسة الخصوصية طريقة التعامل مع طلبات حذف البيانات والمتطلبات النظامية ذات الصلة. للاستفسار عن بيانات أخرى أو تفاصيل الاحتفاظ بها، تواصل مع الدعم قبل تأكيد الحذف.',
    privacy: 'قراءة سياسة الخصوصية',
    unlinkTitle: 'إلغاء ربط التلفزيون',
    unlinkBody: 'إلغاء ربط جهاز SFM TV يوقف وصول هذا الجهاز إلى حسابك، لكنه لا يحذف حساب THE SFM أو استثماراتك. لحذف الحساب والبيانات، استخدم خطوات الملف الشخصي أو طلب البريد الموضّح أعلاه.',
  },
  en: {
    title: 'Delete your account and data',
    intro: 'You can request deletion of your THE SFM account and its associated data, including the data used to link SFM TV. You can use this page in a browser without installing the TV app.',
    language: 'Language',
    home: 'Home',
    profile: 'Open your profile',
    signInTitle: 'If you can sign in',
    steps: [
      'Sign in to your THE SFM account and open your profile.',
      'Go to Danger Zone. Choose Export my data before deletion if you need a copy.',
      'Choose Delete account and read the permanent-deletion notice.',
      'Type DELETE or حذف, then choose Confirm final deletion. Wait for the deletion-success message.',
    ],
    supportTitle: 'If you cannot sign in or complete deletion',
    supportBody: 'Send a THE SFM or SFM TV account-deletion request from your registered email address to the support address below. State that you want your account and its associated data deleted. We may ask you to verify account ownership to protect your account.',
    emailAction: 'Request deletion by email',
    emailSubject: 'THE SFM or SFM TV account deletion request',
    emailBody: 'Please delete my THE SFM account and its associated data. I am sending this request from my registered email address.',
    safeEmail: 'Do not send your password, verification code or sensitive financial information in a support message.',
    dataTitle: 'What does deletion cover?',
    dataBody: 'Account deletion includes your profile and account-linked income, expense, savings, investment, goal, report and project records. Your sign-in account is deleted and linked SFM TV devices lose access. Permanent deletion cannot be undone.',
    retentionBody: 'The privacy policy explains how data-deletion requests and applicable legal requirements are handled. Contact support before confirming deletion if you need details about other data or its retention.',
    privacy: 'Read the privacy policy',
    unlinkTitle: 'Unlinking your TV',
    unlinkBody: 'Unlinking an SFM TV device stops that device from accessing your account. It does not delete your THE SFM account or investments. To delete your account and data, use the profile steps or email request above.',
  },
  fr: {
    title: 'Supprimer votre compte et vos données',
    intro: 'Vous pouvez demander la suppression de votre compte THE SFM et des données associées, y compris celles utilisées pour connecter SFM TV. Cette page est accessible dans un navigateur sans installer l’application TV.',
    language: 'Langue',
    home: 'Accueil',
    profile: 'Ouvrir votre profil',
    signInTitle: 'Si vous pouvez vous connecter',
    steps: [
      'Connectez-vous à votre compte THE SFM et ouvrez votre profil.',
      'Accédez à Zone de danger. Choisissez Exporter mes données avant suppression si vous souhaitez une copie.',
      'Choisissez Supprimer le compte et lisez l’avertissement de suppression définitive.',
      'Saisissez DELETE ou حذف, puis choisissez Confirmer la suppression finale. Attendez le message confirmant la suppression.',
    ],
    supportTitle: 'Si la connexion ou la suppression est impossible',
    supportBody: 'Envoyez une demande de suppression du compte THE SFM ou SFM TV depuis l’adresse e-mail enregistrée sur votre compte à l’adresse d’assistance ci-dessous. Précisez que vous souhaitez supprimer le compte et ses données associées. Nous pouvons vous demander de vérifier que le compte vous appartient.',
    emailAction: 'Demander la suppression par e-mail',
    emailSubject: 'Demande de suppression du compte THE SFM ou SFM TV',
    emailBody: 'Veuillez supprimer mon compte THE SFM et ses données associées. J’envoie cette demande depuis mon adresse e-mail enregistrée.',
    safeEmail: 'N’envoyez pas de mot de passe, de code de vérification ou de données financières sensibles dans un message d’assistance.',
    dataTitle: 'Quelles données sont concernées ?',
    dataBody: 'La suppression comprend votre profil et les enregistrements de revenus, dépenses, épargne, investissements, objectifs, rapports et projets liés à votre compte. Votre compte de connexion est supprimé et les appareils SFM TV associés perdent leur accès. La suppression définitive est irréversible.',
    retentionBody: 'La politique de confidentialité explique le traitement des demandes de suppression et des obligations légales applicables. Contactez l’assistance avant de confirmer la suppression pour toute précision sur d’autres données ou leur conservation.',
    privacy: 'Lire la politique de confidentialité',
    unlinkTitle: 'Dissocier votre téléviseur',
    unlinkBody: 'Dissocier un appareil SFM TV coupe son accès à votre compte, sans supprimer votre compte THE SFM ni vos investissements. Pour supprimer le compte et les données, suivez les étapes du profil ou envoyez la demande par e-mail indiquée ci-dessus.',
  },
} as const;

export default function AccountDeletionPage() {
  const { lang, dir, setLang } = useLanguage();
  const text = TEXT[lang];
  const emailHref = `${SUPPORT_EMAIL_MAILTO}?subject=${encodeURIComponent(text.emailSubject)}&body=${encodeURIComponent(text.emailBody)}`;

  return (
    <main className="deletion-page" dir={dir}>
      <header className="deletion-header">
        <Link href="/">THE SFM</Link>
        <div className="deletion-controls">
          <label>{text.language}<select value={lang} onChange={event => setLang(event.target.value === 'en' ? 'en' : event.target.value === 'fr' ? 'fr' : 'ar')}>
            <option value="ar">العربية</option><option value="en">English</option><option value="fr">Français</option>
          </select></label>
          <ThemeToggle />
        </div>
      </header>
      <section className="deletion-hero" aria-labelledby="deletion-title">
        <span className="deletion-brand"><Trash2 size={18} aria-hidden="true" />THE SFM · SFM TV</span>
        <h1 id="deletion-title">{text.title}</h1>
        <p>{text.intro}</p>
      </section>
      <div className="deletion-content">
        <section aria-labelledby="profile-deletion-title">
          <h2 id="profile-deletion-title">{text.signInTitle}</h2>
          <ol>{text.steps.map(step => <li key={step}>{step}</li>)}</ol>
          <Link className="deletion-action deletion-primary" href="/profile">{text.profile}</Link>
        </section>
        <section id="request" aria-labelledby="support-deletion-title">
          <h2 id="support-deletion-title">{text.supportTitle}</h2>
          <p>{text.supportBody}</p>
          <a className="deletion-email" href={emailHref} dir="ltr">{SUPPORT_EMAIL}</a>
          <a className="deletion-action deletion-primary" href={emailHref}><Mail size={18} aria-hidden="true" />{text.emailAction}</a>
          <p className="deletion-note"><ShieldCheck size={18} aria-hidden="true" />{text.safeEmail}</p>
        </section>
        <section aria-labelledby="deletion-data-title">
          <h2 id="deletion-data-title">{text.dataTitle}</h2>
          <p>{text.dataBody}</p><p>{text.retentionBody}</p>
          <Link className="deletion-action" href="/privacy">{text.privacy}</Link>
        </section>
        <section aria-labelledby="tv-unlink-title">
          <h2 id="tv-unlink-title">{text.unlinkTitle}</h2>
          <p>{text.unlinkBody}</p>
        </section>
        <footer><Link href="/">{text.home}</Link><Link href="/privacy">{text.privacy}</Link></footer>
      </div>
      <style jsx>{`
        .deletion-page{min-height:100vh;background:var(--background);color:var(--foreground);font-family:var(--font-ui);padding:24px}
        .deletion-header,.deletion-hero,.deletion-content{width:min(100%,960px);margin-inline:auto}
        .deletion-header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
        .deletion-header a{color:var(--foreground);font-weight:700;text-decoration:none}
        .deletion-controls,.deletion-controls label{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        select{min-height:44px;border:1px solid var(--border-strong);border-radius:var(--radius-control);background:var(--surface);color:var(--foreground);font:inherit;padding:8px 12px}
        .deletion-hero{padding-block:40px 28px}
        .deletion-brand{display:inline-flex;align-items:center;gap:8px;color:var(--primary-hover);font-weight:600}
        h1{font-size:var(--fs-page);line-height:var(--lh-page);font-weight:700;margin:16px 0 12px;overflow-wrap:anywhere}
        h2{font-size:var(--fs-section);line-height:var(--lh-section);font-weight:700;margin:0 0 12px}
        p,li{color:var(--foreground-secondary);line-height:1.9;overflow-wrap:anywhere}
        p{margin:0 0 16px}.deletion-hero p{margin:0}
        .deletion-content{display:grid;gap:16px;padding-bottom:48px}
        section:not(.deletion-hero){background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);box-shadow:var(--shadow-card);padding:24px;scroll-margin-top:24px}
        ol{margin:0 0 20px;padding-inline-start:24px}li+li{margin-top:10px}
        .deletion-action{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 16px;border:1px solid var(--border-strong);border-radius:var(--radius-control);background:var(--surface);color:var(--foreground);font-weight:600;text-decoration:none}
        .deletion-primary{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}
        .deletion-action:hover{background:var(--surface-hover)}.deletion-primary:hover{background:var(--primary-hover);border-color:var(--primary-hover)}
        .deletion-email{display:block;width:fit-content;margin-bottom:16px;max-width:100%;overflow-wrap:anywhere;color:var(--primary-hover);font-weight:600}
        .deletion-note{display:flex;align-items:flex-start;gap:8px;margin:16px 0 0}.deletion-note svg{flex-shrink:0;margin-top:5px}
        footer{display:flex;flex-wrap:wrap;gap:20px}footer a{color:var(--foreground-secondary)}
        a:focus-visible,select:focus-visible{outline:2px solid var(--focus-ring);outline-offset:3px;box-shadow:var(--focus-shadow)}
        @media(max-width:680px){.deletion-page{padding:16px}.deletion-hero{padding-top:28px}section:not(.deletion-hero){padding:18px}.deletion-action{width:100%}}
      `}</style>
    </main>
  );
}
