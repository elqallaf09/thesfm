'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
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
    subtitle: 'أكمل هذه الخطوات لتحصل على تجربة أدق وتحليلات أفضل.',
    loading: 'جارٍ فحص إعداد الحساب...',
    complete: 'مكتمل',
    needsSteps: 'يحتاج خطوات إضافية',
    missingData: 'بيانات ناقصة',
    remaining: 'خطوات متبقية',
    optional: 'اختياري',
    completed: 'مكتمل',
    missing: 'ناقص',
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
    subtitle: 'Complete these steps to get a more accurate experience and better analysis.',
    loading: 'Checking account setup...',
    complete: 'Complete',
    needsSteps: 'Needs more steps',
    missingData: 'Missing data',
    remaining: 'steps remaining',
    optional: 'Optional',
    completed: 'Complete',
    missing: 'Missing',
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
    subtitle: 'Complétez ces étapes pour obtenir une expérience plus précise et de meilleures analyses.',
    loading: 'Vérification de la configuration du compte...',
    complete: 'Terminé',
    needsSteps: 'Étapes supplémentaires requises',
    missingData: 'Données manquantes',
    remaining: 'étapes restantes',
    optional: 'Facultatif',
    completed: 'Terminé',
    missing: 'Manquant',
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
  const statusText = completion.remaining === 0
    ? text.complete
    : completion.done === 0
      ? text.missingData
      : text.needsSteps;

  return (
    <section className={`account-completion-card ${compact ? 'compact' : ''} ${className}`.trim()} dir={dir}>
      <div className="account-completion-head">
        <div className="account-completion-copy">
          <span>{text.title}</span>
          <h2>{statusText}</h2>
          <p>{text.subtitle}</p>
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
          <small>{completion.done}/{completion.total}</small>
        </div>
      </div>

      {loading ? (
        <div className="account-completion-loading" role="status">
          <Loader2 size={18} aria-hidden="true" />
          <span>{text.loading}</span>
        </div>
      ) : (
        <>
          <div className="account-completion-status">
            <strong>{completion.remaining === 0 ? text.complete : `${completion.remaining} ${text.remaining}`}</strong>
            <div className="account-completion-bar" role="progressbar" aria-label={`${text.title}: ${completion.percent}%`} aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${completion.percent}%` }} />
            </div>
          </div>
          <div className="account-completion-list">
            {[...REQUIRED_ITEMS, ...OPTIONAL_ITEMS].map(item => {
              const complete = state[item.key];
              const optional = OPTIONAL_ITEMS.some(optionalItem => optionalItem.key === item.key);
              return (
                <Link key={item.key} href={item.href} className={complete ? 'done' : ''}>
                  <span className="step-icon" aria-hidden="true">{complete ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}</span>
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
        </>
      )}

      <style jsx>{`
        .account-completion-card {
          display: grid;
          gap: 18px;
          min-width: 0;
          padding: clamp(18px, 2.2vw, 26px);
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: 24px;
          background:
            radial-gradient(circle at 10% 10%, rgba(24, 212, 212, .10), transparent 28%),
            var(--sfm-card);
          box-shadow: 0 18px 46px rgba(3, 18, 37, .08);
          color: var(--sfm-foreground);
          font-family: Tajawal, Arial, sans-serif;
        }
        .account-completion-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: center;
          min-width: 0;
        }
        .account-completion-copy {
          min-width: 0;
        }
        .account-completion-copy > span {
          color: var(--sfm-primary);
          font-size: 12px;
          font-weight: 950;
        }
        .account-completion-copy h2 {
          margin: 7px 0;
          color: var(--sfm-primary-dark);
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.15;
        }
        .account-completion-copy p {
          margin: 0;
          color: var(--sfm-muted);
          line-height: 1.75;
          font-weight: 800;
          max-width: 760px;
        }
        .account-completion-score {
          display: grid;
          justify-items: center;
          gap: 8px;
        }
        .account-completion-ring {
          width: 112px;
          height: 112px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: conic-gradient(var(--sfm-accent) var(--completion), rgba(29, 140, 255, .1) 0deg);
          box-shadow: inset 0 0 0 1px rgba(29, 140, 255, .12), 0 12px 26px rgba(29, 140, 255, .12);
        }
        .account-completion-ring strong {
          width: 82px;
          height: 82px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #FFFFFF;
          color: var(--sfm-primary-dark);
          font-size: 24px;
          font-weight: 950;
        }
        .account-completion-score small {
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 950;
        }
        .account-completion-loading,
        .account-completion-status {
          display: grid;
          gap: 10px;
          color: var(--sfm-muted);
          min-width: 0;
        }
        .account-completion-loading svg {
          animation: spin 1s linear infinite;
        }
        .account-completion-status strong {
          color: var(--sfm-primary-dark);
          font-size: 14px;
        }
        .account-completion-bar {
          height: 12px;
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
        .account-completion-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
          gap: 12px;
        }
        .account-completion-list a {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 11px 12px;
          align-items: center;
          min-width: 0;
          min-height: 108px;
          padding: 14px;
          border: 1px solid rgba(29, 140, 255, .16);
          border-radius: 18px;
          background: #F8FBFF;
          color: var(--sfm-foreground);
          text-decoration: none;
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .account-completion-list a:hover,
        .account-completion-list a:focus-visible {
          border-color: rgba(24, 212, 212, .38);
          box-shadow: 0 14px 32px rgba(29, 140, 255, .12);
          transform: translateY(-1px);
          outline: none;
        }
        .account-completion-list a.done {
          border-color: rgba(16, 185, 129, .2);
          background: rgba(16, 185, 129, .08);
        }
        .step-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--sfm-primary);
          background: rgba(29, 140, 255, .10);
        }
        .account-completion-list a.done .step-icon {
          color: #10B981;
          background: rgba(16, 185, 129, .12);
        }
        .step-copy {
          min-width: 0;
          display: grid;
          gap: 5px;
        }
        .step-copy b {
          min-width: 0;
          color: var(--sfm-primary-dark);
          font-size: 15px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
        .step-copy small {
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 800;
          line-height: 1.6;
        }
        .step-state,
        .step-action {
          border-radius: 999px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }
        .step-state {
          padding: 5px 9px;
          border: 1px solid rgba(29, 140, 255, .14);
          background: #FFFFFF;
          color: var(--sfm-muted);
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
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          border: 1px solid rgba(29, 140, 255, .20);
          background: #FFFFFF;
          color: var(--sfm-primary-dark);
        }
        .account-completion-card.compact .account-completion-head {
          align-items: flex-start;
        }
        .account-completion-card.compact .account-completion-copy h2 {
          font-size: 24px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .account-completion-head {
            grid-template-columns: 1fr;
            align-items: flex-start;
          }
          .account-completion-score {
            justify-items: start;
          }
          .account-completion-list {
            grid-template-columns: 1fr;
          }
          .account-completion-list a {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .step-state {
            grid-column: 2;
            justify-self: start;
          }
          .step-action {
            grid-column: 1 / -1;
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}

export default AccountCompletionCard;
