'use client';

import Link from 'next/link';
import { Database, EyeOff, FileWarning, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { CardsGrid } from '@/components/layout/LayoutPrimitives';
import { AppCard } from '@/components/layout/AppCard';
import { ActionRow } from '@/components/layout/ActionRow';
import { useLanguage } from '@/hooks/useLanguage';

type Lang = 'ar' | 'en' | 'fr';

const TEXT = {
  ar: {
    title: 'الأمان والخصوصية',
    subtitle: 'مبادئ واضحة لبناء الثقة: بياناتك خاصة، والتحليلات تعتمد على ما تدخله فعلياً فقط.',
    eyebrow: 'ثقة وشفافية',
    privateData: 'بياناتك خاصة',
    privateDataDesc: 'لا نعرض بياناتك المالية إلا داخل حسابك وبحسب صلاحيات الجلسة.',
    noSale: 'لا نبيع بياناتك',
    noSaleDesc: 'لا يتم تقديم بياناتك الشخصية أو المالية كمنتج للغير داخل التطبيق.',
    realData: 'تحليلات من بياناتك فقط',
    realDataDesc: 'لا نعرض أرقاماً وهمية أو توصيات مبنية على افتراضات غير موجودة.',
    deleteData: 'يمكنك حذف بياناتك',
    deleteDataDesc: 'تتوفر مسارات إدارة البيانات داخل الملف الشخصي عند دعمها في التطبيق.',
    securityInfo: 'معلومات الأمان',
    securityInfoDesc: 'نعمل على حماية بياناتك وفق أفضل الممارسات المتاحة داخل التطبيق.',
    disclaimer: 'إخلاء مسؤولية مالية',
    disclaimerDesc: 'THE SFM يساعدك على التنظيم والتحليل، ولا يعتبر بديلاً عن مستشار مالي أو قانوني مختص.',
    openProfile: 'فتح الملف الشخصي',
    openMap: 'فتح خريطة THE SFM',
  },
  en: {
    title: 'Security & Privacy',
    subtitle: 'Clear trust principles: your data is private, and analysis is based only on what you actually enter.',
    eyebrow: 'Trust and transparency',
    privateData: 'Your data is private',
    privateDataDesc: 'Your financial data is shown only inside your account and according to session permissions.',
    noSale: 'We do not sell your data',
    noSaleDesc: 'Your personal or financial data is not treated as a third-party product inside the app.',
    realData: 'Analysis from your data only',
    realDataDesc: 'We do not show fake numbers or recommendations based on missing assumptions.',
    deleteData: 'You can delete your data',
    deleteDataDesc: 'Profile includes data-management paths where available.',
    securityInfo: 'Security information',
    securityInfoDesc: 'We work to protect your data using best practices available within the app.',
    disclaimer: 'Financial disclaimer',
    disclaimerDesc: 'THE SFM helps with organization and analysis, and is not a substitute for a qualified financial or legal advisor.',
    openProfile: 'Open Profile',
    openMap: 'Open THE SFM Map',
  },
  fr: {
    title: 'Sécurité et confidentialité',
    subtitle: 'Des principes de confiance clairs : vos données restent privées et l’analyse se base uniquement sur ce que vous saisissez.',
    eyebrow: 'Confiance et transparence',
    privateData: 'Vos données sont privées',
    privateDataDesc: 'Vos données financières sont affichées seulement dans votre compte et selon les permissions de session.',
    noSale: 'Nous ne vendons pas vos données',
    noSaleDesc: 'Vos données personnelles ou financières ne sont pas traitées comme un produit tiers dans l’application.',
    realData: 'Analyse basée uniquement sur vos données',
    realDataDesc: 'Nous n’affichons pas de chiffres fictifs ni de recommandations fondées sur des hypothèses manquantes.',
    deleteData: 'Vous pouvez supprimer vos données',
    deleteDataDesc: 'Le profil inclut les parcours de gestion des données lorsqu’ils sont disponibles.',
    securityInfo: 'Informations de sécurité',
    securityInfoDesc: 'Nous travaillons à protéger vos données avec les meilleures pratiques disponibles dans l’application.',
    disclaimer: 'Avertissement financier',
    disclaimerDesc: 'THE SFM aide à organiser et analyser, mais ne remplace pas un conseiller financier ou juridique qualifié.',
    openProfile: 'Ouvrir le profil',
    openMap: 'Ouvrir la carte THE SFM',
  },
} as const;

export default function SecurityPage() {
  const { lang, dir } = useLanguage();
  const text = TEXT[(lang as Lang) || 'ar'];
  const cards = [
    { title: text.privateData, body: text.privateDataDesc, icon: ShieldCheck },
    { title: text.noSale, body: text.noSaleDesc, icon: EyeOff },
    { title: text.realData, body: text.realDataDesc, icon: Database },
    { title: text.deleteData, body: text.deleteDataDesc, icon: Trash2 },
    { title: text.securityInfo, body: text.securityInfoDesc, icon: LockKeyhole },
    { title: text.disclaimer, body: text.disclaimerDesc, icon: FileWarning },
  ];

  return (
    <div className="security-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="security-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>
        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<ShieldCheck size={28} />}
          actions={(
            <ActionRow>
              <Link className="sfm-primary-link" href="/profile">{text.openProfile}</Link>
            </ActionRow>
          )}
        />

        <CardsGrid>
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <AppCard key={card.title} className="security-card">
                <span aria-hidden="true"><Icon size={22} /></span>
                <h2>{card.title}</h2>
                <p>{card.body}</p>
              </AppCard>
            );
          })}
        </CardsGrid>

        <AppCard className="security-map-card">
          <div>
            <h2>{text.openMap}</h2>
            <p>{text.subtitle}</p>
          </div>
          <Link className="sfm-secondary-link" href="/site-map">{text.openMap}</Link>
        </AppCard>
      </DashboardPageShell>

      <style jsx global>{`
        .security-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 18% 12%, rgba(29, 140, 255, .10), transparent 34%),
            linear-gradient(160deg, var(--sfm-background), #F8FBFF 62%, #E7F1FF 100%);
        }
        .security-content {
          display: grid;
          gap: var(--sfm-section-gap);
        }
        .sfm-page-topbar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }
        .sfm-primary-link,
        .sfm-secondary-link {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 16px;
          text-decoration: none;
          font: 950 13px Tajawal, Arial, sans-serif;
          white-space: normal;
        }
        .sfm-primary-link {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 12px 24px rgba(29, 140, 255, .2);
        }
        .sfm-secondary-link {
          border: 1px solid rgba(29, 140, 255, .18);
          background: #FFFFFF;
          color: var(--sfm-primary-dark);
        }
        .security-card {
          display: grid;
          gap: 10px;
        }
        .security-card span {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        .security-card h2,
        .security-map-card h2 {
          margin: 0;
          color: var(--sfm-primary-dark);
          font-size: 19px;
        }
        .security-card p,
        .security-map-card p {
          margin: 0;
          color: var(--sfm-muted);
          line-height: 1.7;
        }
        .security-map-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .security-map-card div {
          min-width: 0;
        }
        @media (max-width: 720px) {
          .sfm-page-topbar {
            display: none;
          }
          .security-map-card {
            display: grid;
          }
          .security-map-card .sfm-secondary-link {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
