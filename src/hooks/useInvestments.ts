'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Investment, InvestmentInput, InvestmentType } from '@/types/investment';
import {
  GUEST_KEY, OLD_GUEST_KEY, SNAPSHOT_PREFIX, MARKET_LINKED_TYPES, PRICE_REFRESH_UPDATE_KEYS,
  debugInvestments, metaKey, readJson, writeJson, normalizeInvestment,
  buildInvestmentPayload, normalizeInvestmentForSave, mergeInvestmentForUpdate,
  buildPriceRefreshPayload, mergeMarketPriceIntoInvestment, buildSnapshotFallbackPayload,
  metaFromInvestment, toLegacyRow, mutationErrorMessage,
  safeInvestmentSummary, nowIso, coreSavePayload, updateInvestmentWithAttempts,
  cleanInvestmentUpdatePayload, compactUpdatePayload, moneyNumber, newId,
  insertInvestmentWithAttempts,
  type InvestmentMeta, type InvestmentSelectResult, type DbInvestmentRow,
  type InvestmentMarketPriceUpdate,
} from '@/lib/investments/investmentUtils';

const DEBUG_INVESTMENTS = process.env.NODE_ENV === 'development';
let hasLoggedInvestmentDebug = false;

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
        const legacy = saved.length > 0 ? saved : readJson<DbInvestmentRow[]>(OLD_GUEST_KEY, []).map(row => normalizeInvestment(row));
        if (!cancelled) {
          setItems(legacy);
          setIsLoading(false);
        }
        return;
      }

      const meta = readJson<Record<string, InvestmentMeta>>(userMetaKey, {});
      const richSelect = 'id,user_id,name,asset_name,type,category,amount,value,current_value,initial_value,invested_amount,total_invested,purchase_price,purchase_date,entry_date,average_buy_price,purchase_total,monthly_contribution,expected_return,expected_annual_return,risk_level,currency,start_date,notes,symbol,provider_symbol,market,exchange,asset_type,quantity,shares,unit,profit_loss,profit_loss_percent,default_currency_value,location,property_type,expected_monthly_income,expected_monthly_expense,maturity_date,current_price,current_market_value,price_currency,native_currency,native_unit_price,native_market_value,user_currency,fx_rate_to_user_currency,converted_market_value,fx_source,fx_last_updated_at,valuation_source,valuation_last_updated_at,last_price,last_price_updated_at,price_updated_at,data_source,project_id,metal_type,metal_product_type,metal_karat,metal_purity,grams,pure_metal_grams,price_source,investment_snapshot,ai_analysis,created_at,updated_at';
      const standardSelect = 'id,user_id,name,type,category,amount,value,current_value,initial_value,invested_amount,purchase_price,purchase_total,monthly_contribution,expected_return,expected_annual_return,risk_level,currency,start_date,notes,symbol,provider_symbol,market,asset_type,quantity,unit,profit_loss,profit_loss_percent,default_currency_value,location,property_type,expected_monthly_income,expected_monthly_expense,maturity_date,current_price,current_market_value,price_currency,native_currency,native_unit_price,native_market_value,user_currency,fx_rate_to_user_currency,converted_market_value,fx_source,fx_last_updated_at,valuation_source,valuation_last_updated_at,last_price,last_price_updated_at,data_source,project_id,metal_type,metal_product_type,metal_karat,metal_purity,grams,pure_metal_grams,price_source,ai_analysis,created_at,updated_at';
      let full = await supabase
        .from('investment_items')
        .select(richSelect)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as unknown as InvestmentSelectResult;

      if (full.error) {
        debugInvestments('rich fetch failed, retrying standard schema', {
          message: full.error.message,
          code: full.error.code,
          details: full.error.details,
          hint: full.error.hint,
        });
        full = await supabase
          .from('investment_items')
          .select(standardSelect)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }) as unknown as InvestmentSelectResult;
      }

      if (!cancelled && !full.error) {
        const mapped = (full.data ?? []).map(row => normalizeInvestment(row as DbInvestmentRow, meta[(row as DbInvestmentRow).id]));
        debugInvestments('fetched investments', {
          source: 'full',
          count: mapped.length,
          sample: mapped.slice(0, 3).map(safeInvestmentSummary),
        });
        setItems(mapped);
        setIsLoading(false);
        return;
      }

      const extended = await supabase
        .from('investment_items')
        .select('id,name,amount,type,current_value,monthly_contribution,start_date,risk_level,expected_annual_return,notes,ai_analysis,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled && !extended.error) {
        const mapped = (extended.data ?? []).map(row => normalizeInvestment(row as DbInvestmentRow, meta[(row as DbInvestmentRow).id]));
        debugInvestments('fetched investments', {
          source: 'extended-fallback',
          count: mapped.length,
          sample: mapped.slice(0, 3).map(safeInvestmentSummary),
        });
        setItems(mapped);
        setIsLoading(false);
        return;
      }

      const minimal = await supabase
        .from('investment_items')
        .select('id,name,amount,ai_analysis,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (minimal.error) {
          setError(minimal.error.message);
          setItems([]);
        } else {
          const mapped = (minimal.data ?? []).map(row => normalizeInvestment(row as DbInvestmentRow, meta[(row as DbInvestmentRow).id]));
          debugInvestments('fetched investments', {
            source: 'minimal-snapshot-fallback',
            count: mapped.length,
            sample: mapped.slice(0, 3).map(safeInvestmentSummary),
          });
          setItems(mapped);
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
      displayValue: data.currentValue,
      displayValueStatus: 'valid',
      createdAt,
      updatedAt: createdAt,
    };

    if (isGuest || !user) {
      persistGuest([optimistic, ...items]);
      return optimistic;
    }

    const extendedPayload = buildInvestmentPayload(data, user.id);
    debugInvestments('add payload', safeInvestmentSummary({
      ...data,
      quantity: extendedPayload.quantity ?? undefined,
      purchasePrice: extendedPayload.purchase_price ?? undefined,
      purchaseTotal: extendedPayload.purchase_total ?? undefined,
      currentPrice: extendedPayload.current_price ?? undefined,
      currentMarketValue: extendedPayload.current_market_value ?? undefined,
    }));

    const savedRow = await insertInvestmentWithAttempts([
      { label: 'full_schema', source: 'add_form', payload: extendedPayload },
      { label: 'core_schema', source: 'add_form', payload: coreSavePayload(extendedPayload) },
      { label: 'snapshot_fallback', source: 'add_form', payload: buildSnapshotFallbackPayload(data, user.id) },
    ]);
    const next = normalizeInvestment(savedRow as DbInvestmentRow, metaFromInvestment(data));
    debugInvestments('normalized investment', safeInvestmentSummary(next));
    const meta = readJson<Record<string, InvestmentMeta>>(userMetaKey, {});
    writeJson(userMetaKey, { ...meta, [next.id]: metaFromInvestment(data) });
    setItems(prev => [next, ...prev]);
    return next;
  }, [isGuest, items, persistGuest, user, userMetaKey]);

  const update = useCallback(async (id: string, data: InvestmentInput) => {
    const updatedAt = nowIso();
    const previous = items.find(item => item.id === id);
    if (!previous) throw new Error('Investment not found');

    debugInvestments('investment row before edit update', safeInvestmentSummary(previous));
    const mergedData = mergeInvestmentForUpdate(previous, data);
    const nextItem: Investment = {
      ...previous,
      ...mergedData,
      displayValue: mergedData.currentValue,
      displayValueStatus: 'valid',
      updatedAt,
    };

    if (isGuest || !user) {
      persistGuest(items.map(item => item.id === id ? nextItem : item));
      return nextItem;
    }

    const rawPayload = buildInvestmentPayload(mergedData);
    const extendedPayload = compactUpdatePayload(rawPayload);
    debugInvestments('update payload', safeInvestmentSummary({
      ...mergedData,
      id,
      quantity: moneyNumber(extendedPayload.quantity),
      purchasePrice: moneyNumber(extendedPayload.purchase_price),
      purchaseTotal: moneyNumber(extendedPayload.purchase_total),
      currentPrice: moneyNumber(extendedPayload.current_price),
      currentMarketValue: moneyNumber(extendedPayload.current_market_value),
    }));

    const savedRow = await updateInvestmentWithAttempts(id, user.id, [
      { label: 'full_schema', source: 'edit_form', payload: extendedPayload },
      { label: 'core_schema', source: 'edit_form', payload: compactUpdatePayload(coreSavePayload(rawPayload)) },
      { label: 'snapshot_fallback', source: 'edit_form', payload: compactUpdatePayload(buildSnapshotFallbackPayload(mergedData)) },
    ]);
    const next = normalizeInvestment(savedRow as DbInvestmentRow, metaFromInvestment(mergedData));
    debugInvestments('normalized investment', safeInvestmentSummary(next));
    const meta = readJson<Record<string, InvestmentMeta>>(userMetaKey, {});
    writeJson(userMetaKey, { ...meta, [id]: metaFromInvestment(mergedData) });
    setItems(prev => prev.map(item => item.id === id ? next : item));
    return next;
  }, [isGuest, items, persistGuest, user, userMetaKey]);

  const updateMarketPrice = useCallback(async (id: string, data: InvestmentMarketPriceUpdate) => {
    const updatedAt = nowIso();
    const previous = items.find(item => item.id === id);
    if (!previous) throw new Error('Investment not found');

    const nextItem = mergeMarketPriceIntoInvestment(previous, data, updatedAt);

    if (isGuest || !user) {
      persistGuest(items.map(item => item.id === id ? nextItem : item));
      return nextItem;
    }

    const pricePayload = buildPriceRefreshPayload(data);
    const minimalPayload = cleanInvestmentUpdatePayload({
      current_price: pricePayload.current_price,
      last_price: pricePayload.last_price,
      last_price_updated_at: pricePayload.last_price_updated_at,
      data_source: pricePayload.data_source,
      price_source: pricePayload.price_source,
    }, { allowedKeys: PRICE_REFRESH_UPDATE_KEYS });

    debugInvestments('price refresh payload', {
      id,
      payloadKeys: Object.keys(pricePayload),
      criticalUserFieldsIncluded: Object.keys(pricePayload).filter(key => [
        'quantity',
        'shares',
        'purchase_price',
        'average_buy_price',
        'purchase_date',
        'entry_date',
        'currency',
        'asset_name',
        'symbol',
        'market',
        'exchange',
      ].includes(key)),
    });

    const savedRow = await updateInvestmentWithAttempts(id, user.id, [
      { label: 'price_refresh', source: 'price_refresh', payload: pricePayload },
      {
        label: 'price_refresh_core',
        source: 'price_refresh',
        payload: cleanInvestmentUpdatePayload(coreSavePayload(pricePayload), { allowedKeys: PRICE_REFRESH_UPDATE_KEYS }),
      },
      { label: 'price_refresh_minimal', source: 'price_refresh', payload: minimalPayload },
    ]);
    const next = normalizeInvestment(savedRow as DbInvestmentRow, metaFromInvestment(nextItem));
    debugInvestments('normalized investment after price refresh', safeInvestmentSummary(next));
    setItems(prev => prev.map(item => item.id === id ? next : item));
    return next;
  }, [isGuest, items, persistGuest, user]);

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
    updateMarketPrice,
    remove,
  };
}
