'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';

type CompletionKey =
  | 'profile'
  | 'currency'
  | 'income'
  | 'expense'
  | 'goal'
  | 'savingOrInvestment'
  | 'zakat'
  | 'project';

type CompletionState = Record<CompletionKey, boolean>;

type AccountCompletionCardProps = {
  compact?: boolean;
  className?: string;
};

const COPY = {
  ar: {
    title: 'اكتمال الحساب',
    subtitle: 'أكمل الخطوات الأساسية حتى تصبح تحليلاتك وتنبيهاتك أدق داخل THE SFM.',
    loading: 'جارٍ فحص إعداد الحساب...',
    complete: 'مكتمل',
    needsSteps: 'يحتاج خطوات',
    incomplete: 'غير مكتمل',
    remaining: 'خطوات متبقية',
    optional: 'اختياري',
    completed: 'مكتمل',
    missing: 'ناقص',
    nextSteps: 'الخطوات التالية',
    allComplete: 'كل الخطوات الأساسية مكتملة.',
    viewDetails: 'عرض تفاصيل الإعداد',
    hideDetails: 'إخفاء التفاصيل',
    profile: 'أكمل الملف الشخصي',
    profileDesc: 'أضف بياناتك الأساسية لربط التجربة بحسابك.',
    profileAction: 'فتح الملف الشخصي',
    currency: 'اختر عملتك الافتراضية',
    currencyDesc: 'حدد العملة المستخدمة في الملخصات والتقارير.',
    currencyAction: 'اختيار العملة',
    income: 'أضف دخلك',
    incomeDesc: 'أضف مصدر دخل واحد على الأقل لتفعيل التحليل المالي.',
    incomeAction: 'إضافة دخل',
    expense: 'أضف مصروفاتك',
    expenseDesc: 'سجل مصروفاً واحداً على الأقل لحساب الرصيد والتقارير.',
    expenseAction: 'إضافة مصروف',
    goal: 'حدد هدفاً مالياً',
    goalDesc: 'أنشئ هدفاً لمتابعة التقدم والادخار بوضوح.',
    goalAction: 'فتح الأهداف',
    savingOrInvestment: 'أضف مدخرات أو استثماراً',
    savingOrInvestmentDesc: 'أضف رصيد ادخار أو استثمار لتكتمل صورة أصولك.',
    savingOrInvestmentAction: 'فتح المدخرات',
    zakat: 'إعداد الزكاة اختياري',
    zakatDesc: 'فعّل الزكاة إذا كنت تريد تتبع النصاب والحول.',
    zakatAction: 'فتح الزكاة',
    project: 'أضف مشروعك',
    projectDesc: 'أضف مشروعاً إذا كنت تستخدم THE SFM للأعمال والمشاريع.',
    projectAction: 'فتح المشاريع',
    open: 'فتح',
  },
  en: {
    title: 'Account Completion',
    subtitle: 'Complete the core setup steps so THE SFM can make your insights and alerts more accurate.',
    loading: 'Checking account setup...',
    complete: 'Complete',
    needsSteps: 'Needs steps',
    incomplete: 'Incomplete',
    remaining: 'steps remaining',
    optional: 'Optional',
    completed: 'Complete',
    missing: 'Missing',
    nextSteps: 'Next steps',
    allComplete: 'All basic steps are complete.',
    viewDetails: 'View setup details',
    hideDetails: 'Hide details',
    profile: 'Complete your profile',
    profileDesc: 'Add your basic details to connect the experience to your account.',
    profileAction: 'Open Profile',
    currency: 'Choose your default currency',
    currencyDesc: 'Set the currency used in summaries and reports.',
    currencyAction: 'Choose Currency',
    income: 'Add your income',
    incomeDesc: 'Add at least one income source to activate financial analysis.',
    incomeAction: 'Add Income',
    expense: 'Add your expenses',
    expenseDesc: 'Record at least one expense to calculate balance and reports.',
    expenseAction: 'Add Expense',
    goal: 'Set a financial goal',
    goalDesc: 'Create a goal to track progress and saving clearly.',
    goalAction: 'Open Goals',
    savingOrInvestment: 'Add savings or an investment',
    savingOrInvestmentDesc: 'Add savings or an investment balance to complete your asset picture.',
    savingOrInvestmentAction: 'Open Savings',
    zakat: 'Set up zakat optional',
    zakatDesc: 'Enable zakat if you want to track nisab and hawl.',
    zakatAction: 'Open Zakat',
    project: 'Add your project',
    projectDesc: 'Add a project if you use THE SFM for business and projects.',
    projectAction: 'Open Projects',
    open: 'Open',
  },
  fr: {
    title: 'Complétion du compte',
    subtitle: 'Complétez les étapes de base afin que THE SFM rende vos analyses et alertes plus précises.',
    loading: 'Vérification de la configuration du compte...',
    complete: 'Terminé',
    needsSteps: 'Étapes requises',
    incomplete: 'Incomplet',
    remaining: 'étapes restantes',
    optional: 'Facultatif',
    completed: 'Terminé',
    missing: 'Manquant',
    nextSteps: 'Prochaines étapes',
    allComplete: 'Toutes les étapes de base sont terminées.',
    viewDetails: 'Voir les détails',
    hideDetails: 'Masquer les détails',
    profile: 'Compléter le profil',
    profileDesc: 'Ajoutez vos informations de base pour relier l’expérience à votre compte.',
    profileAction: 'Ouvrir le profil',
    currency: 'Choisir la devise par défaut',
    currencyDesc: 'Définissez la devise utilisée dans les résumés et rapports.',
    currencyAction: 'Choisir la devise',
    income: 'Ajouter vos revenus',
    incomeDesc: 'Ajoutez au moins une source de revenu pour activer l’analyse financière.',
    incomeAction: 'Ajouter un revenu',
    expense: 'Ajouter vos dépenses',
    expenseDesc: 'Enregistrez au moins une dépense pour calculer le solde et les rapports.',
    expenseAction: 'Ajouter une dépense',
    goal: 'Définir un objectif financier',
    goalDesc: 'Créez un objectif pour suivre clairement les progrès et l’épargne.',
    goalAction: 'Ouvrir les objectifs',
    savingOrInvestment: 'Ajouter une épargne ou un investissement',
    savingOrInvestmentDesc: 'Ajoutez une épargne ou un investissement pour compléter la vue de vos actifs.',
    savingOrInvestmentAction: 'Ouvrir l’épargne',
    zakat: 'Configurer la zakat facultatif',
    zakatDesc: 'Activez la zakat si vous souhaitez suivre le nisab et le hawl.',
    zakatAction: 'Ouvrir la zakat',
    project: 'Ajouter votre projet',
    projectDesc: 'Ajoutez un projet si vous utilisez THE SFM pour l’activité et les projets.',
    projectAction: 'Ouvrir les projets',
    open: 'Ouvrir',
  },
} as const;

type CompletionCopy = typeof COPY.ar;
type CompletionCopyKey = keyof CompletionCopy;
type CompletionItem = {
  key: CompletionKey;
  href: string;
  descriptionKey: CompletionCopyKey;
  actionKey: CompletionCopyKey;
};

const REQUIRED_ITEMS: CompletionItem[] = [
  { key: 'profile', href: '/profile', descriptionKey: 'profileDesc', actionKey: 'profileAction' },
  { key: 'currency', href: '/profile#preferences', descriptionKey: 'currencyDesc', actionKey: 'currencyAction' },
  { key: 'income', href: '/income', descriptionKey: 'incomeDesc', actionKey: 'incomeAction' },
  { key: 'expense', href: '/expenses', descriptionKey: 'expenseDesc', actionKey: 'expenseAction' },
  { key: 'goal', href: '/goals', descriptionKey: 'goalDesc', actionKey: 'goalAction' },
  { key: 'savingOrInvestment', href: '/savings', descriptionKey: 'savingOrInvestmentDesc', actionKey: 'savingOrInvestmentAction' },
];

const OPTIONAL_ITEMS: CompletionItem[] = [
  { key: 'zakat', href: '/zakat', descriptionKey: 'zakatDesc', actionKey: 'zakatAction' },
  { key: 'project', href: '/projects', descriptionKey: 'projectDesc', actionKey: 'projectAction' },
];

async function hasRows(db: any, table: string, userId: string) {
  try {
    const { count, error } = await db
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    return !error && (count ?? 0) > 0;
  } catch {
    return false;
  }
}

export function AccountCompletionCard({ compact = false, className = '' }: AccountCompletionCardProps) {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const text = COPY[lang as keyof typeof COPY] ?? COPY.ar;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<CompletionState>({
    profile: false,
    currency: false,
    income: false,
    expense: false,
    goal: false,
    savingOrInvestment: false,
    zakat: false,
    project: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCompletion() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const db = supabase as any;
      const profileResult = await db
        .from('profiles')
        .select('id,display_name,default_currency')
        .eq('id', user.id)
        .maybeSingle();

      const [
        hasIncome,
        hasExpenses,
        hasGoals,
        hasSavings,
        hasInvestments,
        hasZakatCalculations,
        hasZakatAssets,
        hasProjects,
      ] = await Promise.all([
        hasRows(db, 'monthly_income_sources', user.id),
        hasRows(db, 'expense_items', user.id),
        hasRows(db, 'financial_goals', user.id),
        hasRows(db, 'savings_items', user.id),
        hasRows(db, 'investment_items', user.id),
        hasRows(db, 'zakat_calculations', user.id),
        hasRows(db, 'zakat_assets', user.id),
        hasRows(db, 'projects', user.id),
      ]);

      if (cancelled) return;

      const profile = profileResult.data ?? null;
      setState({
        profile: Boolean(profile?.id && (profile.display_name || user.email)),
        currency: Boolean(profile?.default_currency),
        income: hasIncome,
        expense: hasExpenses,
        goal: hasGoals,
        savingOrInvestment: hasSavings || hasInvestments,
        zakat: hasZakatCalculations || hasZakatAssets,
        project: hasProjects,
      });
      setLoading(false);
    }

    loadCompletion();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const completion = useMemo(() => {
    const done = REQUIRED_ITEMS.filter(item => state[item.key]).length;
    const total = REQUIRED_ITEMS.length;
    return {
      done,
      total,
      percent: Math.round((done / total) * 100),
      remaining: total - done,
    };
  }, [state]);

  const missingRequired = REQUIRED_ITEMS.filter(item => !state[item.key]);
  const nextSteps = missingRequired.slice(0, 3);
  const allItems = [...REQUIRED_ITEMS, ...OPTIONAL_ITEMS];
  const showDetails = !compact || detailsOpen;
  const statusText = completion.remaining === 0
    ? text.complete
    : completion.done === 0
      ? text.incomplete
      : text.needsSteps;

  return (
    <section className={`account-completion-card ${compact ? 'compact' : ''} ${className}`.trim()} dir={dir}>
      {loading ? (
        <div className="account-completion-loading" role="status">
          <Loader2 size={18} aria-hidden="true" />
          <span>{text.loading}</span>
        </div>
      ) : (
        <>
          <div className="account-completion-layout">
            <div className="account-completion-main">
              <span className="account-completion-eyebrow">{text.title}</span>
              <h2>{statusText}</h2>
              <p>{text.subtitle}</p>

              <div className="account-completion-next">
                <strong>{text.nextSteps}</strong>
                {nextSteps.length === 0 ? (
                  <div className="account-completion-done" role="status">
                    <CheckCircle2 size={20} aria-hidden="true" />
                    <span>{text.allComplete}</span>
                  </div>
                ) : (
                  <div className="account-completion-next-list">
                    {nextSteps.map(item => (
                      <Link key={item.key} href={item.href} className="account-next-step">
                        <span className="account-next-icon" aria-hidden="true">
                          <AlertCircle size={18} />
                        </span>
                        <span className="account-next-copy">
                          <b>{text[item.key]}</b>
                          <small>{text[item.descriptionKey]}</small>
                        </span>
                        <span className="account-next-action">{text[item.actionKey]}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {compact ? (
                <button
                  type="button"
                  className="account-detail-button"
                  aria-expanded={detailsOpen}
                  onClick={() => setDetailsOpen(value => !value)}
                >
                  <span>{detailsOpen ? text.hideDetails : text.viewDetails}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="account-completion-score">
              <div
                className="account-completion-ring"
                role="img"
                aria-label={`${text.title}: ${completion.percent}%`}
                style={{ ['--completion' as string]: `${completion.percent * 3.6}deg` }}
              >
                <strong>{completion.percent}%</strong>
              </div>
              <div className="account-completion-score-copy">
                <b>{completion.done}/{completion.total}</b>
                <span>{completion.remaining === 0 ? text.complete : `${completion.remaining} ${text.remaining}`}</span>
              </div>
              <div
                className="account-completion-bar"
                role="progressbar"
                aria-label={`${text.title}: ${completion.percent}%`}
                aria-valuenow={completion.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${completion.percent}%` }} />
              </div>
            </div>
          </div>

          {showDetails ? (
            <div className="account-completion-details">
              {allItems.map(item => {
                const complete = state[item.key];
                const optional = OPTIONAL_ITEMS.some(optionalItem => optionalItem.key === item.key);
                return (
                  <Link key={item.key} href={item.href} className={complete ? 'done' : ''}>
                    <span className="step-icon" aria-hidden="true">{complete ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}</span>
                    <span className="step-copy">
                      <b>{text[item.key]}</b>
                      <small>{text[item.descriptionKey]}</small>
                    </span>
                    <span className={complete ? 'step-state complete' : 'step-state missing'}>
                      {complete ? text.completed : optional ? text.optional : text.missing}
                    </span>
                    <span className="step-action">{complete ? text.open : text[item.actionKey]}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </>
      )}

      <style jsx>{`
        .account-completion-card {
          display: grid;
          gap: 18px;
          min-width: 0;
          padding: clamp(18px, 2.2vw, 26px);
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: var(--r-2xl);
          background:
            radial-gradient(circle at 10% 10%, rgba(24, 212, 212, .10), transparent 28%),
            var(--sfm-card);
          box-shadow: 0 18px 46px rgba(3, 18, 37, .08);
          color: var(--sfm-foreground);
          font-family: Tajawal, Arial, sans-serif;
        }
        .account-completion-card.compact {
          border-radius: var(--r-2xl);
        }
        .account-completion-loading {
          min-height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--sfm-muted);
          font-weight: 900;
        }
        .account-completion-loading svg {
          animation: spin 1s linear infinite;
        }
        .account-completion-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(210px, 280px);
          gap: clamp(18px, 3vw, 30px);
          align-items: center;
          min-width: 0;
        }
        .account-completion-main {
          min-width: 0;
          display: grid;
          gap: 13px;
        }
        .account-completion-eyebrow {
          width: fit-content;
          border-radius: 999px;
          padding: 5px 10px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
          font-size: 12px;
          font-weight: 950;
        }
        .account-completion-main h2 {
          margin: 0;
          color: var(--sfm-foreground);
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.15;
        }
        .account-completion-main p {
          max-width: 760px;
          margin: 0;
          color: var(--sfm-muted);
          line-height: 1.75;
          font-weight: 800;
        }
        .account-completion-next {
          display: grid;
          gap: 10px;
          min-width: 0;
        }
        .account-completion-next > strong {
          color: var(--sfm-foreground);
          font-size: 14px;
        }
        .account-completion-next-list {
          display: grid;
          gap: 8px;
        }
        .account-next-step {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          min-width: 0;
          padding: 11px;
          border: 1px solid rgba(29, 140, 255, .14);
          border-radius: var(--r-lg);
          background: rgba(255, 255, 255, .62);
          color: var(--sfm-foreground);
          text-decoration: none;
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .account-next-step:hover,
        .account-next-step:focus-visible {
          border-color: rgba(24, 212, 212, .34);
          box-shadow: 0 14px 28px rgba(29, 140, 255, .10);
          transform: translateY(-1px);
          outline: none;
        }
        .account-next-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: var(--r-md);
          background: rgba(245, 158, 11, .12);
          color: #B45309;
        }
        .account-next-copy {
          min-width: 0;
          display: grid;
          gap: 3px;
        }
        .account-next-copy b {
          color: var(--sfm-foreground);
          font-size: 14px;
          line-height: 1.35;
        }
        .account-next-copy small {
          color: var(--sfm-muted);
          font-size: 12px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
        .account-next-action,
        .account-detail-button,
        .step-action {
          border-radius: 999px;
          border: 1px solid rgba(29, 140, 255, .20);
          background: var(--sfm-card);
          color: var(--sfm-primary);
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }
        .account-next-action {
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 11px;
        }
        .account-completion-done {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          max-width: 100%;
          border-radius: var(--r-lg);
          padding: 12px 14px;
          background: rgba(16, 185, 129, .10);
          color: #047857;
          font-weight: 950;
        }
        .account-detail-button {
          width: fit-content;
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 14px;
          cursor: pointer;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .account-detail-button[aria-expanded='true'] svg {
          transform: rotate(180deg);
        }
        .account-detail-button:hover,
        .account-detail-button:focus-visible {
          border-color: rgba(24, 212, 212, .42);
          box-shadow: 0 0 0 4px rgba(24, 212, 212, .10);
          outline: none;
        }
        .account-completion-score {
          display: grid;
          justify-items: center;
          gap: 10px;
          min-width: 0;
          padding: 18px;
          border-radius: var(--r-2xl);
          border: 1px solid rgba(24, 212, 212, .16);
          background:
            radial-gradient(circle at 50% 0%, rgba(24, 212, 212, .14), transparent 45%),
            rgba(255, 255, 255, .64);
        }
        .account-completion-ring {
          width: 112px;
          height: 112px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: conic-gradient(var(--sfm-accent) var(--completion), rgba(29, 140, 255, .12) 0deg);
          box-shadow: inset 0 0 0 1px rgba(29, 140, 255, .12), 0 12px 26px rgba(29, 140, 255, .12);
        }
        .account-completion-ring strong {
          width: 82px;
          height: 82px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: var(--sfm-card);
          color: var(--sfm-foreground);
          font-size: 24px;
          font-weight: 950;
        }
        .account-completion-score-copy {
          display: grid;
          justify-items: center;
          gap: 3px;
          text-align: center;
        }
        .account-completion-score-copy b {
          color: var(--sfm-foreground);
          font-size: 15px;
        }
        .account-completion-score-copy span {
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 900;
        }
        .account-completion-bar {
          width: 100%;
          height: 10px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(29, 140, 255, .10);
          border: 1px solid rgba(29, 140, 255, .10);
        }
        .account-completion-bar span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--sfm-primary), var(--sfm-accent));
        }
        .account-completion-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
          gap: 10px;
          padding-top: 4px;
        }
        .account-completion-details a {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 9px 11px;
          align-items: center;
          min-width: 0;
          min-height: 96px;
          padding: 12px;
          border: 1px solid rgba(29, 140, 255, .14);
          border-radius: var(--r-lg);
          background: rgba(248, 251, 255, .78);
          color: var(--sfm-foreground);
          text-decoration: none;
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .account-completion-details a:hover,
        .account-completion-details a:focus-visible {
          border-color: rgba(24, 212, 212, .38);
          box-shadow: 0 14px 28px rgba(29, 140, 255, .10);
          transform: translateY(-1px);
          outline: none;
        }
        .account-completion-details a.done {
          border-color: rgba(16, 185, 129, .2);
          background: rgba(16, 185, 129, .08);
        }
        .step-icon {
          width: 38px;
          height: 38px;
          border-radius: var(--r-md);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--sfm-primary);
          background: rgba(29, 140, 255, .10);
        }
        .account-completion-details a.done .step-icon {
          color: #10B981;
          background: rgba(16, 185, 129, .12);
        }
        .step-copy {
          min-width: 0;
          display: grid;
          gap: 4px;
        }
        .step-copy b {
          min-width: 0;
          color: var(--sfm-foreground);
          font-size: 14px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }
        .step-copy small {
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 800;
          line-height: 1.5;
        }
        .step-state {
          border-radius: 999px;
          padding: 5px 9px;
          border: 1px solid rgba(29, 140, 255, .14);
          background: var(--sfm-card);
          color: var(--sfm-muted);
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }
        .step-state.complete {
          border-color: rgba(16, 185, 129, .22);
          background: rgba(16, 185, 129, .10);
          color: #047857;
        }
        .step-state.missing {
          border-color: rgba(245, 158, 11, .22);
          background: rgba(245, 158, 11, .10);
          color: #B45309;
        }
        .step-action {
          grid-column: 2 / -1;
          justify-self: start;
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 11px;
        }
        :global(.dark) .account-next-step,
        :global(.dark) .account-completion-score,
        :global(.dark) .account-completion-details a {
          background: rgba(15, 51, 92, .72);
          border-color: rgba(167, 243, 240, .16);
        }
        :global(.dark) .account-completion-done {
          color: #86EFAC;
        }
        :global(.dark) .step-state.complete {
          color: #86EFAC;
        }
        :global(.dark) .step-state.missing,
        :global(.dark) .account-next-icon {
          color: #FCD34D;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 840px) {
          .account-completion-layout {
            grid-template-columns: 1fr;
          }
          .account-completion-score {
            justify-items: start;
          }
          .account-completion-score-copy {
            justify-items: start;
            text-align: start;
          }
        }
        @media (max-width: 640px) {
          .account-next-step,
          .account-completion-details a {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .account-next-action,
          .step-state {
            grid-column: 2;
            justify-self: start;
          }
          .step-action,
          .account-detail-button {
            width: 100%;
          }
          .step-action {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </section>
  );
}

export default AccountCompletionCard;
