'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';

type DbInvestmentRow = {
  id: string;
  name: string;
  amount: number | string | null;
  type?: InvestmentType | null;
  current_value?: number | string | null;
  monthly_contribution?: number | string | null;
  start_date?: string | null;
  risk_level?: RiskLevel | null;
  expected_annual_return?: number | string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type InvestmentMeta = Omit<InvestmentInput, 'name' | 'currentValue'>;

const GUEST_KEY = 'sfm_guest_investments';
const OLD_GUEST_KEY = 'sfm_guest_invest';

function nowIso() {
  return new Date().toISOString();
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function metaKey(userId?: string | null) {
  return `sfm_investment_meta_${userId || 'anonymous'}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function rowToInvestment(row: DbInvestmentRow, meta?: Partial<InvestmentMeta>): Investment {
  const createdAt = row.created_at || nowIso();
  const currentValue = Number(row.current_value ?? row.amount ?? 0) || 0;
  return {
    id: row.id,
    name: row.name || '',
    type: row.type || meta?.type || 'investment',
    currentValue,
    monthlyContribution: Number(row.monthly_contribution ?? meta?.monthlyContribution ?? 0) || 0,
    startDate: row.start_date || meta?.startDate || createdAt.slice(0, 10) || todayInput(),
    riskLevel: row.risk_level || meta?.riskLevel || 'medium',
    expectedAnnualReturn: row.expected_annual_return !== undefined && row.expected_annual_return !== null
      ? Number(row.expected_annual_return)
      : meta?.expectedAnnualReturn ?? 0,
    notes: row.notes ?? meta?.notes ?? '',
    createdAt,
    updatedAt: row.updated_at || createdAt,
  };
}

function toLegacyRow(item: Investment): DbInvestmentRow {
  return {
    id: item.id,
    name: item.name,
    amount: item.currentValue,
    created_at: item.createdAt,
  };
}

function metaFromInvestment(item: Investment | InvestmentInput): InvestmentMeta {
  return {
    type: item.type,
    monthlyContribution: item.monthlyContribution,
    startDate: item.startDate,
    riskLevel: item.riskLevel,
    expectedAnnualReturn: item.expectedAnnualReturn,
    notes: item.notes,
  };
}

export function useInvestments() {
  const { user, isGuest, loading } = useAuth();
  const [items, setItems] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userMetaKey = useMemo(() => metaKey(user?.id), [user?.id]);

  const persistGuest = useCallback((next: Investment[]) => {
    setItems(next);
    writeJson(GUEST_KEY, next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (loading) return;
      setIsLoading(true);
      setError(null);

      if (isGuest || !user) {
        const saved = readJson<Investment[]>(GUEST_KEY, []);
        const legacy = saved.length > 0 ? saved : readJson<DbInvestmentRow[]>(OLD_GUEST_KEY, []).map(row => rowToInvestment(row));
        if (!cancelled) {
          setItems(legacy);
          setIsLoading(false);
        }
        return;
      }

      const meta = readJson<Record<string, InvestmentMeta>>(userMetaKey, {});
      const extended = await supabase
        .from('investment_items')
        .select('id,name,amount,type,current_value,monthly_contribution,start_date,risk_level,expected_annual_return,notes,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled && !extended.error) {
        setItems((extended.data ?? []).map(row => rowToInvestment(row as DbInvestmentRow, meta[(row as DbInvestmentRow).id])));
        setIsLoading(false);
        return;
      }

      const legacy = await supabase
        .from('investment_items')
        .select('id,name,amount,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (legacy.error) {
          setError(legacy.error.message);
          setItems([]);
        } else {
          setItems((legacy.data ?? []).map(row => rowToInvestment(row as DbInvestmentRow, meta[(row as DbInvestmentRow).id])));
        }
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isGuest, loading, persistGuest, user, userMetaKey]);

  const add = useCallback(async (data: InvestmentInput) => {
    const createdAt = nowIso();
    const optimistic: Investment = {
      ...data,
      id: newId(),
      createdAt,
      updatedAt: createdAt,
    };

    if (isGuest || !user) {
      persistGuest([optimistic, ...items]);
      return optimistic;
    }

    const extendedPayload = {
      user_id: user.id,
      name: data.name,
      amount: data.currentValue,
      type: data.type,
      current_value: data.currentValue,
      monthly_contribution: data.monthlyContribution,
      start_date: data.startDate,
      risk_level: data.riskLevel,
      expected_annual_return: data.expectedAnnualReturn ?? null,
      notes: data.notes ?? null,
    };

    const created = await supabase.from('investment_items').insert(extendedPayload).select('*').single();
    if (!created.error && created.data) {
      const next = rowToInvestment(created.data as DbInvestmentRow);
      setItems(prev => [next, ...prev]);
      return next;
    }

    const legacy = await supabase.from('investment_items').insert({
      user_id: user.id,
      name: data.name,
      amount: data.currentValue,
    }).select('id,name,amount,created_at').single();

    if (legacy.error || !legacy.data) throw new Error(legacy.error?.message || created.error?.message || 'Could not save investment');

    const next = rowToInvestment(legacy.data as DbInvestmentRow, metaFromInvestment(data));
    const meta = readJson<Record<string, InvestmentMeta>>(userMetaKey, {});
    writeJson(userMetaKey, { ...meta, [next.id]: metaFromInvestment(data) });
    setItems(prev => [next, ...prev]);
    return next;
  }, [isGuest, items, persistGuest, user, userMetaKey]);

  const update = useCallback(async (id: string, data: InvestmentInput) => {
    const updatedAt = nowIso();
    const previous = items.find(item => item.id === id);
    if (!previous) throw new Error('Investment not found');

    const nextItem: Investment = {
      ...previous,
      ...data,
      updatedAt,
    };

    if (isGuest || !user) {
      persistGuest(items.map(item => item.id === id ? nextItem : item));
      return nextItem;
    }

    const extendedPayload = {
      name: data.name,
      amount: data.currentValue,
      type: data.type,
      current_value: data.currentValue,
      monthly_contribution: data.monthlyContribution,
      start_date: data.startDate,
      risk_level: data.riskLevel,
      expected_annual_return: data.expectedAnnualReturn ?? null,
      notes: data.notes ?? null,
    };

    const extended = await supabase.from('investment_items').update(extendedPayload).eq('id', id).eq('user_id', user.id);
    if (!extended.error) {
      setItems(prev => prev.map(item => item.id === id ? nextItem : item));
      return nextItem;
    }

    const legacy = await supabase.from('investment_items').update({
      name: data.name,
      amount: data.currentValue,
    }).eq('id', id).eq('user_id', user.id);

    if (legacy.error) throw new Error(legacy.error.message || extended.error.message);

    const meta = readJson<Record<string, InvestmentMeta>>(userMetaKey, {});
    writeJson(userMetaKey, { ...meta, [id]: metaFromInvestment(data) });
    setItems(prev => prev.map(item => item.id === id ? nextItem : item));
    return nextItem;
  }, [isGuest, items, persistGuest, user, userMetaKey]);

  const remove = useCallback(async (id: string) => {
    if (isGuest || !user) {
      persistGuest(items.filter(item => item.id !== id));
      return;
    }

    const result = await supabase.from('investment_items').delete().eq('id', id).eq('user_id', user.id);
    if (result.error) throw new Error(result.error.message);

    const meta = readJson<Record<string, InvestmentMeta>>(userMetaKey, {});
    const rest = { ...meta };
    delete rest[id];
    writeJson(userMetaKey, rest);
    setItems(prev => prev.filter(item => item.id !== id));
  }, [isGuest, items, persistGuest, user, userMetaKey]);

  return {
    items,
    isLoading,
    error,
    add,
    update,
    remove,
  };
}
