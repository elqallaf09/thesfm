'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  CircleDollarSign,
  FileText,
  Landmark,
  Settings,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { flattenNavigationItems, SUPPORT_LINKS, type NavigationItem } from '@/components/navigationConfig';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';

type CommandGroupId = 'pages' | 'records' | 'goals' | 'reports' | 'decisions' | 'settings';

type CommandResult = {
  id: string;
  group: CommandGroupId;
  title: string;
  description: string;
  href: string;
  external?: boolean;
  keywords: string[];
  icon: LucideIcon;
};

function itemTitle(row: any, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function describeAmount(row: any) {
  const amount = row?.amount ?? row?.target_amount ?? row?.current_value;
  const currency = row?.currency ? String(row.currency) : '';
  if (amount === null || amount === undefined || amount === '') return '';
  return `${currency} ${amount}`.trim();
}

function pageResults(items: NavigationItem[], t: (key: any) => string): CommandResult[] {
  return items
    .filter(item => item.href && !item.href.includes('#'))
    .map(item => ({
      id: `page:${item.id}`,
      group: item.id === 'profile' || item.id === 'security' || item.id.startsWith('support-') ? 'settings' : 'pages',
      title: t(item.labelKey),
      description: item.caption ?? item.href ?? '',
      href: item.href ?? '/',
      external: item.external,
      keywords: [item.id, t(item.labelKey), item.caption ?? '', item.href ?? ''],
      icon: item.icon as LucideIcon,
    }));
}

export function CommandMenu({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(defaultOpen);
  const [dynamicResults, setDynamicResults] = useState<CommandResult[]>([]);

  const staticResults = useMemo(() => pageResults([...flattenNavigationItems(), ...SUPPORT_LINKS], t), [t]);

  const loadUserResults = useCallback(async () => {
    if (!user) {
      setDynamicResults([]);
      return;
    }

    const db = supabase as any;
    const safeQuery = async (table: string, select: string, orderColumn = 'created_at') => {
      try {
        const result = await db.from(table).select(select).eq('user_id', user.id).order(orderColumn, { ascending: false }).limit(8);
        if (result.error) return [];
        return result.data ?? [];
      } catch {
        return [];
      }
    };

    const [goals, income, expenses, investments, decisions, reports] = await Promise.all([
      safeQuery('financial_goals', 'id,name,title,goal_name,target_amount,current_amount,currency,created_at'),
      safeQuery('monthly_income_sources', 'id,label,source_name,amount,currency,created_at'),
      safeQuery('expense_items', 'id,name,amount,currency,created_at'),
      safeQuery('investment_items', 'id,name,symbol,amount,current_value,currency,created_at'),
      safeQuery('user_decisions', 'id,title,decision_type,target_date,created_at'),
      safeQuery('reports', 'id,title,report_type,created_at'),
    ]);

    setDynamicResults([
      ...goals.map((row: any) => ({
        id: `goal:${row.id}`,
        group: 'goals' as const,
        title: itemTitle(row, ['name', 'title', 'goal_name'], t('nav_goals')),
        description: describeAmount(row) || t('nav_goals'),
        href: `/goals?search=${encodeURIComponent(itemTitle(row, ['name', 'title', 'goal_name'], ''))}`,
        keywords: ['goal', 'هدف', t('nav_goals'), itemTitle(row, ['name', 'title', 'goal_name'], '')],
        icon: Target,
      })),
      ...income.map((row: any) => ({
        id: `income:${row.id}`,
        group: 'records' as const,
        title: itemTitle(row, ['label', 'source_name'], t('nav_income')),
        description: describeAmount(row) || t('nav_income'),
        href: `/income?search=${encodeURIComponent(itemTitle(row, ['label', 'source_name'], ''))}`,
        keywords: ['income', 'دخل', t('nav_income'), itemTitle(row, ['label', 'source_name'], '')],
        icon: CircleDollarSign,
      })),
      ...expenses.map((row: any) => ({
        id: `expense:${row.id}`,
        group: 'records' as const,
        title: itemTitle(row, ['name'], t('nav_expenses')),
        description: describeAmount(row) || t('nav_expenses'),
        href: `/expenses?search=${encodeURIComponent(itemTitle(row, ['name'], ''))}`,
        keywords: ['expense', 'مصروف', 'المصاريف', t('nav_expenses'), itemTitle(row, ['name'], '')],
        icon: CircleDollarSign,
      })),
      ...investments.map((row: any) => ({
        id: `investment:${row.id}`,
        group: 'records' as const,
        title: itemTitle(row, ['name', 'symbol'], t('nav_invest')),
        description: describeAmount(row) || t('nav_invest'),
        href: `/invest?search=${encodeURIComponent(itemTitle(row, ['name', 'symbol'], ''))}`,
        keywords: ['investment', 'استثمار', t('nav_invest'), itemTitle(row, ['name', 'symbol'], '')],
        icon: BarChart3,
      })),
      ...decisions.map((row: any) => ({
        id: `decision:${row.id}`,
        group: 'decisions' as const,
        title: itemTitle(row, ['title'], t('command_decisions')),
        description: row?.decision_type ? String(row.decision_type) : t('command_decisions'),
        href: `/decisions?decision=${encodeURIComponent(String(row.id))}`,
        keywords: ['decision', 'قرار', t('command_decisions'), itemTitle(row, ['title'], '')],
        icon: Landmark,
      })),
      ...reports.map((row: any) => ({
        id: `report:${row.id}`,
        group: 'reports' as const,
        title: itemTitle(row, ['title'], t('nav_reports_center')),
        description: row?.report_type ? String(row.report_type) : t('nav_reports_center'),
        href: '/reports-center',
        keywords: ['report', 'تقرير', t('nav_reports_center'), itemTitle(row, ['title'], '')],
        icon: FileText,
      })),
    ]);
  }, [t, user]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('sfm:open-command-menu', onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('sfm:open-command-menu', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) void loadUserResults();
  }, [loadUserResults, open]);

  const groups = useMemo(() => {
    const all = [...staticResults, ...dynamicResults];
    return {
      pages: all.filter(item => item.group === 'pages'),
      records: all.filter(item => item.group === 'records'),
      goals: all.filter(item => item.group === 'goals'),
      reports: all.filter(item => item.group === 'reports'),
      decisions: all.filter(item => item.group === 'decisions'),
      settings: all.filter(item => item.group === 'settings'),
    };
  }, [dynamicResults, staticResults]);

  const openResult = (item: CommandResult) => {
    setOpen(false);
    if (item.external) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(item.href);
  };

  const renderGroup = (id: CommandGroupId, label: string, items: CommandResult[]) => {
    if (items.length === 0) return null;
    return (
      <CommandGroup heading={label} key={id}>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <CommandItem key={item.id} value={[item.title, item.description, ...item.keywords].join(' ')} onSelect={() => openResult(item)}>
              <span className="sfm-command-icon"><Icon size={17} aria-hidden="true" /></span>
              <span className="sfm-command-copy">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <CommandShortcut>{t('command_open_action')}</CommandShortcut>
            </CommandItem>
          );
        })}
      </CommandGroup>
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="sfm-command-dialog" dir={dir}>
        <div className="sfm-command-heading">
          <Sparkles size={18} aria-hidden="true" />
          <span>{t('command_title')}</span>
        </div>
        <CommandInput placeholder={t('command_placeholder')} />
        <CommandList>
          <CommandEmpty>{t('command_no_results')}</CommandEmpty>
          {renderGroup('pages', t('command_pages'), groups.pages)}
          {renderGroup('records', t('command_records'), groups.records)}
          {renderGroup('goals', t('command_goals'), groups.goals)}
          {renderGroup('reports', t('command_reports'), groups.reports)}
          {renderGroup('decisions', t('command_decisions'), groups.decisions)}
          {renderGroup('settings', t('command_settings'), groups.settings)}
        </CommandList>
      </div>
      <style jsx global>{`
        [cmdk-dialog] {
          z-index: 10000;
        }
        .sfm-command-dialog {
          font-family: Tajawal, Arial, sans-serif;
          background:
            radial-gradient(circle at 10% 0%, rgba(167, 243, 240, .22), transparent 32%),
            linear-gradient(180deg, #FFFFFF, #F8FBFF);
          color: var(--sfm-primary-dark);
        }
        .sfm-command-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 16px 2px;
          color: var(--sfm-primary-dark);
          font-weight: 950;
        }
        .sfm-command-heading svg,
        .sfm-command-icon {
          color: var(--sfm-primary);
        }
        .sfm-command-dialog [cmdk-input-wrapper] {
          border-bottom-color: rgba(29, 140, 255, .14);
        }
        .sfm-command-dialog [cmdk-input] {
          color: var(--sfm-primary-dark);
          font-family: Tajawal, Arial, sans-serif;
          font-weight: 850;
        }
        .sfm-command-dialog [cmdk-list] {
          max-height: min(62vh, 520px);
          padding: 8px;
        }
        .sfm-command-dialog [cmdk-group-heading] {
          color: var(--sfm-muted);
          font-family: Tajawal, Arial, sans-serif;
          font-weight: 950;
          padding: 10px 8px 6px;
        }
        .sfm-command-dialog [cmdk-item] {
          border: 1px solid transparent;
          border-radius: 14px;
          padding: 10px;
          margin: 2px 0;
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease, transform .18s ease, box-shadow .18s ease;
        }
        .sfm-command-dialog [cmdk-item][data-selected="true"] {
          background: rgba(29, 140, 255, .10);
          border-color: rgba(24, 212, 212, .26);
          box-shadow: 0 8px 22px rgba(3, 18, 37, .08);
          transform: translateY(-1px);
        }
        .sfm-command-icon {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(29, 140, 255, .10);
          flex: 0 0 34px;
        }
        .sfm-command-copy {
          min-width: 0;
          display: grid;
          gap: 2px;
          flex: 1;
        }
        .sfm-command-copy strong {
          color: var(--sfm-primary-dark);
          font-size: 13.5px;
          font-weight: 950;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sfm-command-copy small {
          color: var(--sfm-muted);
          font-size: 11.5px;
          font-weight: 850;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sfm-command-dialog [cmdk-item] span[cmdk-shortcut] {
          color: var(--sfm-primary);
          font-family: Tajawal, Arial, sans-serif;
          font-weight: 950;
          letter-spacing: 0;
        }
      `}</style>
    </CommandDialog>
  );
}
