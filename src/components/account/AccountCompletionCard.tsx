'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
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
    subtitle: 'أكمل الأساسيات لتصبح تجربة THE SFM أوضح وأكثر تنظيماً.',
    loading: 'جارٍ فحص إعداد الحساب...',
    complete: 'مكتمل',
    remaining: 'خطوات متبقية',
    optional: 'اختياري',
    profile: 'أكمل الملف الشخصي',
    currency: 'اختر عملتك الافتراضية',
    income: 'أضف دخلك',
    expense: 'أضف مصروفاتك',
    goal: 'حدد هدفاً مالياً',
    savingOrInvestment: 'أضف مدخرات أو استثماراً',
    zakat: 'إعداد الزكاة',
    project: 'أضف مشروعاً',
    open: 'فتح',
  },
  en: {
    title: 'Account Completion',
    subtitle: 'Complete the essentials so THE SFM feels clearer and better organized.',
    loading: 'Checking account setup...',
    complete: 'Complete',
    remaining: 'steps remaining',
    optional: 'Optional',
    profile: 'Complete your profile',
    currency: 'Choose your default currency',
    income: 'Add your income',
    expense: 'Add your expenses',
    goal: 'Set a financial goal',
    savingOrInvestment: 'Add savings or an investment',
    zakat: 'Set up zakat',
    project: 'Add a project',
    open: 'Open',
  },
  fr: {
    title: 'Complétion du compte',
    subtitle: 'Complétez les bases pour rendre THE SFM plus clair et mieux organisé.',
    loading: 'Vérification de la configuration du compte...',
    complete: 'Terminé',
    remaining: 'étapes restantes',
    optional: 'Facultatif',
    profile: 'Compléter le profil',
    currency: 'Choisir la devise par défaut',
    income: 'Ajouter vos revenus',
    expense: 'Ajouter vos dépenses',
    goal: 'Définir un objectif financier',
    savingOrInvestment: 'Ajouter une épargne ou un investissement',
    zakat: 'Configurer la zakat',
    project: 'Ajouter un projet',
    open: 'Ouvrir',
  },
} as const;

const REQUIRED_ITEMS: Array<{ key: CompletionKey; href: string }> = [
  { key: 'profile', href: '/profile' },
  { key: 'currency', href: '/settings' },
  { key: 'income', href: '/income' },
  { key: 'expense', href: '/expenses' },
  { key: 'goal', href: '/goals' },
  { key: 'savingOrInvestment', href: '/savings' },
];

const OPTIONAL_ITEMS: Array<{ key: CompletionKey; href: string }> = [
  { key: 'zakat', href: '/zakat' },
  { key: 'project', href: '/projects' },
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

  return (
    <section className={`account-completion-card ${compact ? 'compact' : ''} ${className}`.trim()} dir={dir}>
      <div className="account-completion-head">
        <div>
          <span>{text.title}</span>
          <h2>{completion.percent}%</h2>
          <p>{text.subtitle}</p>
        </div>
        <div
          className="account-completion-ring"
          role="img"
          aria-label={`${text.title}: ${completion.percent}%`}
          style={{ ['--completion' as string]: `${completion.percent * 3.6}deg` }}
        >
          <strong>{completion.done}/{completion.total}</strong>
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
          </div>
          <div className="account-completion-list">
            {[...REQUIRED_ITEMS, ...OPTIONAL_ITEMS].map(item => {
              const complete = state[item.key];
              const optional = OPTIONAL_ITEMS.some(optionalItem => optionalItem.key === item.key);
              return (
                <Link key={item.key} href={item.href} className={complete ? 'done' : ''}>
                  <span aria-hidden="true">{complete ? <CheckCircle2 size={18} /> : <Circle size={18} />}</span>
                  <b>{text[item.key]}</b>
                  {optional ? <em>{text.optional}</em> : null}
                </Link>
              );
            })}
          </div>
        </>
      )}

      <style jsx>{`
        .account-completion-card {
          display: grid;
          gap: 16px;
          min-width: 0;
          padding: 18px;
          border: 1px solid rgba(29, 140, 255, .14);
          border-radius: var(--sfm-card-radius);
          background: var(--sfm-card);
          box-shadow: 0 12px 32px rgba(3, 18, 37, .07);
          color: var(--sfm-foreground);
          font-family: Tajawal, Arial, sans-serif;
        }
        .account-completion-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          min-width: 0;
        }
        .account-completion-head div:first-child {
          min-width: 0;
        }
        .account-completion-head span {
          color: var(--sfm-primary);
          font-size: 12px;
          font-weight: 950;
        }
        .account-completion-head h2 {
          margin: 4px 0;
          color: var(--sfm-primary-dark);
          font-size: 30px;
          line-height: 1;
        }
        .account-completion-head p {
          margin: 0;
          color: var(--sfm-muted);
          line-height: 1.65;
        }
        .account-completion-ring {
          width: 74px;
          height: 74px;
          flex: 0 0 74px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: conic-gradient(var(--sfm-accent) var(--completion), rgba(29, 140, 255, .1) 0deg);
        }
        .account-completion-ring strong {
          width: 54px;
          height: 54px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #FFFFFF;
          color: var(--sfm-primary-dark);
          font-size: 13px;
        }
        .account-completion-loading,
        .account-completion-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--sfm-muted);
          min-width: 0;
        }
        .account-completion-loading svg {
          animation: spin 1s linear infinite;
        }
        .account-completion-status strong {
          color: var(--sfm-primary-dark);
        }
        .account-completion-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
          gap: 8px;
        }
        .account-completion-list a {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
          min-height: 44px;
          padding: 9px 11px;
          border: 1px solid rgba(29, 140, 255, .12);
          border-radius: 14px;
          background: #F8FBFF;
          color: var(--sfm-foreground);
          text-decoration: none;
        }
        .account-completion-list a.done {
          border-color: rgba(16, 185, 129, .2);
          background: rgba(16, 185, 129, .08);
        }
        .account-completion-list span {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--sfm-primary);
        }
        .account-completion-list a.done span {
          color: #10B981;
        }
        .account-completion-list b {
          min-width: 0;
          flex: 1;
          font-size: 13px;
          overflow-wrap: anywhere;
        }
        .account-completion-list em {
          color: var(--sfm-muted);
          font-size: 11px;
          font-style: normal;
          font-weight: 800;
        }
        .account-completion-card.compact .account-completion-head {
          align-items: flex-start;
        }
        .account-completion-card.compact .account-completion-head h2 {
          font-size: 24px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .account-completion-head {
            align-items: flex-start;
          }
        }
      `}</style>
    </section>
  );
}

export default AccountCompletionCard;
