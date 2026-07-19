'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BellRing, BriefcaseBusiness, CircleAlert, ListPlus, Settings2, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { normalizeAiAnalystSymbol } from '@/lib/ai-analyst/legacyRoutes';
import { RecentAnalysesPanel } from './RecentAnalysesPanel';
import styles from './AiAnalystWorkspace.module.css';

type Locale = 'ar' | 'en' | 'fr';

function localeFor(language: string | null | undefined): Locale {
  return language === 'en' || language === 'fr' ? language : 'ar';
}

function text(locale: Locale, values: Record<Locale, string>) {
  return values[locale];
}

function number(locale: Locale, value: number) {
  const languageTag = locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR-u-nu-latn' : 'en-GB-u-nu-latn';
  return new Intl.NumberFormat(languageTag, { maximumFractionDigits: 2 }).format(value);
}

function formatMoney(locale: Locale, value: number | null | undefined, currency?: string | null) {
  if (!Number.isFinite(value)) return '—';
  const languageTag = locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR-u-nu-latn' : 'en-GB-u-nu-latn';
  if (!currency || !/^[A-Z]{3}$/.test(currency)) return number(locale, Number(value));
  try {
    return new Intl.NumberFormat(languageTag, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value));
  } catch {
    return `${number(locale, Number(value))} ${currency}`;
  }
}

type WatchlistRow = { id: string; symbol: string; asset_type: string; name: string | null; created_at: string };
type AlertRow = { id: string; symbol: string; asset_type: string; alert_type: string; threshold: number; status: string; created_at: string };

function SurfaceHeader({ icon: Icon, eyebrow, title, body, id }: {
  icon: typeof ListPlus;
  eyebrow: string;
  title: string;
  body: string;
  id: string;
}) {
  return (
    <header className={styles.cardHeader}>
      <div>
        <p className={styles.sectionEyebrow}>{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        <p>{body}</p>
      </div>
      <Icon aria-hidden="true" className={styles.placeholderIcon} />
    </header>
  );
}

export function AiAnalystWatchlistSurface() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = localeFor(lang);
  const [items, setItems] = useState<WatchlistRow[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState('STOCK');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setState('loading');
    setError(null);
    const { data, error: loadError } = await supabase
      .from('market_watchlist')
      .select('id,symbol,asset_type,name,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (loadError) {
      setState('unavailable');
      setError(text(locale, { ar: 'تعذر تحميل قائمة المتابعة. لم يتم عرض بيانات بديلة.', en: 'The watchlist could not be loaded. No substitute data is displayed.', fr: 'La liste de suivi est indisponible. Aucune donnée de remplacement n’est affichée.' }));
      return;
    }
    setItems((data ?? []) as WatchlistRow[]);
    setState('ready');
  }, [locale, user]);

  useEffect(() => { void load(); }, [load]);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const normalized = normalizeAiAnalystSymbol(symbol);
    if (!normalized) {
      setError(text(locale, { ar: 'أدخل رمز أصل صالحاً.', en: 'Enter a valid asset symbol.', fr: 'Saisissez un symbole d’actif valide.' }));
      return;
    }
    setError(null);
    const { data, error: saveError } = await supabase
      .from('market_watchlist')
      .insert({ user_id: user.id, symbol: normalized, asset_type: assetType })
      .select('id,symbol,asset_type,name,created_at')
      .single();
    if (saveError || !data) {
      setError(text(locale, { ar: 'تعذر حفظ الأصل في قائمة المتابعة.', en: 'The asset could not be saved to the watchlist.', fr: 'L’actif n’a pas pu être enregistré dans la liste de suivi.' }));
      return;
    }
    setItems(current => [data as WatchlistRow, ...current]);
    setSymbol('');
  };

  const remove = async (id: string) => {
    if (!user) return;
    const { error: removeError } = await supabase.from('market_watchlist').delete().eq('id', id).eq('user_id', user.id);
    if (removeError) {
      setError(text(locale, { ar: 'تعذر حذف الأصل من قائمة المتابعة.', en: 'The asset could not be removed from the watchlist.', fr: 'L’actif n’a pas pu être retiré de la liste de suivi.' }));
      return;
    }
    setItems(current => current.filter(item => item.id !== id));
  };

  return (
    <div className={styles.grid} data-testid="ai-analyst-watchlist-surface">
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-watchlist-title">
        <SurfaceHeader
          icon={ListPlus}
          eyebrow={text(locale, { ar: 'المتابعة', en: 'Monitoring', fr: 'Suivi' })}
          title={text(locale, { ar: 'قائمة المتابعة', en: 'Watchlist', fr: 'Liste de suivi' })}
          body={text(locale, { ar: 'تعرض هذه القائمة الأصول المحفوظة في حسابك فقط. لا تُنشأ قراءة أو توصية عند إضافتها.', en: 'This list shows only assets saved to your account. Adding an asset never generates a reading or recommendation.', fr: 'Cette liste affiche uniquement les actifs enregistrés dans votre compte. Ajouter un actif ne génère ni lecture ni recommandation.' })}
          id="ai-analyst-watchlist-title"
        />
        <form className={styles.pickerForm} onSubmit={add}>
          <label className={styles.field}>
            <span>{text(locale, { ar: 'رمز الأصل', en: 'Asset symbol', fr: 'Symbole de l’actif' })}</span>
            <input value={symbol} onChange={event => setSymbol(event.target.value)} inputMode="text" autoComplete="off" maxLength={32} />
          </label>
          <label className={styles.field}>
            <span>{text(locale, { ar: 'نوع الأصل', en: 'Asset type', fr: 'Type d’actif' })}</span>
            <select value={assetType} onChange={event => setAssetType(event.target.value)}>
              <option value="STOCK">{text(locale, { ar: 'أسهم', en: 'Stocks', fr: 'Actions' })}</option>
              <option value="CRYPTO">Crypto</option>
              <option value="FOREX">Forex</option>
              <option value="INDEX">{text(locale, { ar: 'مؤشرات', en: 'Indices', fr: 'Indices' })}</option>
              <option value="COMMODITY">{text(locale, { ar: 'سلع', en: 'Commodities', fr: 'Matières premières' })}</option>
              <option value="FUND">{text(locale, { ar: 'صناديق', en: 'Funds', fr: 'Fonds' })}</option>
            </select>
          </label>
          <button className={styles.primaryAction} type="submit">{text(locale, { ar: 'إضافة', en: 'Add', fr: 'Ajouter' })}</button>
        </form>
        {error ? <p className={styles.errorText} role="status">{error}</p> : null}
        {state === 'loading' ? <p className={styles.statusRail} role="status">{text(locale, { ar: 'جارٍ تحميل قائمة المتابعة…', en: 'Loading watchlist…', fr: 'Chargement de la liste de suivi…' })}</p> : null}
        {state === 'ready' && items.length === 0 ? <p className={styles.statusRail}>{text(locale, { ar: 'لا توجد أصول محفوظة بعد.', en: 'No assets are saved yet.', fr: 'Aucun actif n’est encore enregistré.' })}</p> : null}
        {state === 'ready' && items.length > 0 ? (
          <ul className={styles.groupList}>
            {items.map(item => (
              <li className={styles.groupItem} key={item.id}>
                <span className={styles.groupIdentity}><strong dir="ltr">{item.name || item.symbol}</strong><small dir="ltr">{item.symbol} · {item.asset_type}</small></span>
                <span className={styles.groupMetrics}>
                  <Link className={styles.linkAction} href={`/ai-analyst/analyze/${encodeURIComponent(item.symbol)}?assetType=${encodeURIComponent(item.asset_type)}`}>{text(locale, { ar: 'تحليل', en: 'Analyze', fr: 'Analyser' })}</Link>
                  <button className={styles.secondaryAction} type="button" onClick={() => void remove(item.id)} aria-label={text(locale, { ar: `حذف ${item.symbol}`, en: `Remove ${item.symbol}`, fr: `Retirer ${item.symbol}` })}><Trash2 size={15} aria-hidden="true" /></button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

export function AiAnalystAlertsSurface() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = localeFor(lang);
  const [items, setItems] = useState<AlertRow[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [symbol, setSymbol] = useState('');
  const [threshold, setThreshold] = useState('');
  const [alertType, setAlertType] = useState('above');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setState('loading');
    setError(null);
    const { data, error: loadError } = await supabase
      .from('market_price_alerts')
      .select('id,symbol,asset_type,alert_type,threshold,status,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (loadError) {
      setState('unavailable');
      setError(text(locale, { ar: 'تعذر تحميل التنبيهات. لم يتم افتراض أي حالة بديلة.', en: 'Alerts could not be loaded. No replacement state was assumed.', fr: 'Les alertes sont indisponibles. Aucun état de remplacement n’a été supposé.' }));
      return;
    }
    setItems((data ?? []) as AlertRow[]);
    setState('ready');
  }, [locale, user]);

  useEffect(() => { void load(); }, [load]);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const normalized = normalizeAiAnalystSymbol(symbol);
    const numericThreshold = Number(threshold);
    if (!normalized || !Number.isFinite(numericThreshold) || numericThreshold <= 0) {
      setError(text(locale, { ar: 'أدخل رمزاً صالحاً وقيمة تنبيه موجبة.', en: 'Enter a valid symbol and a positive alert value.', fr: 'Saisissez un symbole valide et une valeur d’alerte positive.' }));
      return;
    }
    setError(null);
    const { data, error: saveError } = await supabase
      .from('market_price_alerts')
      .insert({ user_id: user.id, symbol: normalized, asset_type: 'STOCK', alert_type: alertType, threshold: numericThreshold })
      .select('id,symbol,asset_type,alert_type,threshold,status,created_at')
      .single();
    if (saveError || !data) {
      setError(text(locale, { ar: 'تعذر حفظ التنبيه.', en: 'The alert could not be saved.', fr: 'L’alerte n’a pas pu être enregistrée.' }));
      return;
    }
    setItems(current => [data as AlertRow, ...current]);
    setSymbol('');
    setThreshold('');
  };

  const remove = async (id: string) => {
    if (!user) return;
    const { error: removeError } = await supabase.from('market_price_alerts').delete().eq('id', id).eq('user_id', user.id);
    if (removeError) {
      setError(text(locale, { ar: 'تعذر حذف التنبيه.', en: 'The alert could not be removed.', fr: 'L’alerte n’a pas pu être retirée.' }));
      return;
    }
    setItems(current => current.filter(item => item.id !== id));
  };

  return (
    <div className={styles.grid} data-testid="ai-analyst-alerts-surface">
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-alerts-title">
        <SurfaceHeader
          icon={BellRing}
          eyebrow={text(locale, { ar: 'المتابعة', en: 'Monitoring', fr: 'Suivi' })}
          title={text(locale, { ar: 'تنبيهات الأسعار', en: 'Price alerts', fr: 'Alertes de prix' })}
          body={text(locale, { ar: 'التنبيهات المحفوظة لا تعني توصية أو توقعاً. تعرض هذه الصفحة القواعد التي حفظتها فقط.', en: 'Saved alerts are not recommendations or predictions. This page shows only rules you saved.', fr: 'Les alertes enregistrées ne sont ni des recommandations ni des prévisions. Cette page affiche uniquement les règles que vous avez enregistrées.' })}
          id="ai-analyst-alerts-title"
        />
        <form className={styles.pickerForm} onSubmit={add}>
          <label className={styles.field}><span>{text(locale, { ar: 'الرمز', en: 'Symbol', fr: 'Symbole' })}</span><input value={symbol} onChange={event => setSymbol(event.target.value)} maxLength={32} /></label>
          <label className={styles.field}><span>{text(locale, { ar: 'القاعدة', en: 'Rule', fr: 'Règle' })}</span><select value={alertType} onChange={event => setAlertType(event.target.value)}><option value="above">{text(locale, { ar: 'أعلى من', en: 'Above', fr: 'Au-dessus de' })}</option><option value="below">{text(locale, { ar: 'أقل من', en: 'Below', fr: 'En dessous de' })}</option><option value="change_exceeds">{text(locale, { ar: 'تغير يتجاوز', en: 'Change exceeds', fr: 'Variation supérieure à' })}</option></select></label>
          <label className={styles.field}><span>{text(locale, { ar: 'القيمة', en: 'Value', fr: 'Valeur' })}</span><input value={threshold} onChange={event => setThreshold(event.target.value)} inputMode="decimal" /></label>
          <button className={styles.primaryAction} type="submit">{text(locale, { ar: 'حفظ التنبيه', en: 'Save alert', fr: 'Enregistrer l’alerte' })}</button>
        </form>
        {error ? <p className={styles.errorText} role="status">{error}</p> : null}
        {state === 'loading' ? <p className={styles.statusRail} role="status">{text(locale, { ar: 'جارٍ تحميل التنبيهات…', en: 'Loading alerts…', fr: 'Chargement des alertes…' })}</p> : null}
        {state === 'ready' && items.length === 0 ? <p className={styles.statusRail}>{text(locale, { ar: 'لا توجد تنبيهات محفوظة بعد.', en: 'No alerts are saved yet.', fr: 'Aucune alerte n’est encore enregistrée.' })}</p> : null}
        {state === 'ready' && items.length > 0 ? <ul className={styles.groupList}>{items.map(item => <li className={styles.groupItem} key={item.id}><span className={styles.groupIdentity}><strong dir="ltr">{item.symbol}</strong><small>{item.alert_type} · {number(locale, item.threshold)} · {item.status}</small></span><button className={styles.secondaryAction} type="button" onClick={() => void remove(item.id)} aria-label={text(locale, { ar: `حذف تنبيه ${item.symbol}`, en: `Remove ${item.symbol} alert`, fr: `Retirer l’alerte ${item.symbol}` })}><Trash2 size={15} aria-hidden="true" /></button></li>)}</ul> : null}
      </section>
    </div>
  );
}

export function AiAnalystPortfolioSurface({ performance = false }: { performance?: boolean }) {
  const { lang } = useLanguage();
  const locale = localeFor(lang);
  const { items, isLoading, error } = useInvestments();
  const title = performance
    ? text(locale, { ar: 'أداء المتابعة', en: 'Tracking performance', fr: 'Performance de suivi' })
    : text(locale, { ar: 'المحفظة', en: 'Portfolio', fr: 'Portefeuille' });
  const rows = useMemo(() => items.filter(item => item.displayValueStatus !== 'invalid'), [items]);

  return (
    <div className={styles.grid} data-testid={performance ? 'ai-analyst-trade-performance-surface' : 'ai-analyst-portfolio-surface'}>
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby={performance ? 'ai-analyst-performance-title' : 'ai-analyst-portfolio-title'}>
        <SurfaceHeader
          icon={performance ? CircleAlert : BriefcaseBusiness}
          eyebrow={text(locale, { ar: 'المتابعة', en: 'Monitoring', fr: 'Suivi' })}
          title={title}
          body={performance
            ? text(locale, { ar: 'يعرض هذا السجل حقول الأداء الفعلية المحفوظة لعناصر محفظتك. لا يحسب نتائج تحليلات الذكاء أو دقة تاريخية بديلة.', en: 'This view shows actual performance fields saved for your portfolio items. It does not calculate intelligence outcomes or substitute historical accuracy.', fr: 'Cette vue affiche les champs de performance réels enregistrés pour vos éléments de portefeuille. Elle ne calcule ni résultats d’intelligence ni précision historique de remplacement.' })
            : text(locale, { ar: 'تعرض المحفظة العناصر المحفوظة في حسابك. لا يتم عرض ملخص موحد ما لم تتوفر مصادر قيم موثقة.', en: 'The portfolio shows items saved in your account. No aggregate is shown unless verified value sources are available.', fr: 'Le portefeuille affiche les éléments enregistrés dans votre compte. Aucun agrégat n’est présenté sans sources de valeur vérifiées.' })}
          id={performance ? 'ai-analyst-performance-title' : 'ai-analyst-portfolio-title'}
        />
        {isLoading ? <p className={styles.statusRail} role="status">{text(locale, { ar: 'جارٍ تحميل العناصر…', en: 'Loading items…', fr: 'Chargement des éléments…' })}</p> : null}
        {error ? <p className={styles.errorText} role="status">{text(locale, { ar: 'تعذر تحميل عناصر المحفظة. لم يتم افتراض قيم.', en: 'Portfolio items could not be loaded. No values were assumed.', fr: 'Les éléments du portefeuille sont indisponibles. Aucune valeur n’a été supposée.' })}</p> : null}
        {!isLoading && !error && rows.length === 0 ? <p className={styles.statusRail}>{text(locale, { ar: 'لا توجد عناصر محفوظة بعد.', en: 'No portfolio items are saved yet.', fr: 'Aucun élément de portefeuille n’est encore enregistré.' })}</p> : null}
        {!isLoading && !error && rows.length > 0 ? <ul className={styles.groupList}>{rows.map(item => {
          const value = item.displayValue ?? item.currentMarketValue ?? item.currentValue;
          const currentCurrency = item.userCurrency || item.currency || item.priceCurrency || undefined;
          return <li className={styles.groupItem} key={item.id}><span className={styles.groupIdentity}><strong>{item.name}</strong><small dir="ltr">{item.symbol || item.type}</small></span><span className={styles.groupMetrics}>{performance ? <span className={styles.metricPill} dir="ltr">{item.profitLossPercent === undefined ? '—' : `${number(locale, item.profitLossPercent)}%`}</span> : null}<span className={styles.metricPill} dir="ltr">{formatMoney(locale, value, currentCurrency)}</span></span></li>;
        })}</ul> : null}
        <Link className={styles.linkAction} href="/invest">{text(locale, { ar: 'إدارة الاستثمارات', en: 'Manage investments', fr: 'Gérer les investissements' })}</Link>
      </section>
    </div>
  );
}

export function AiAnalystRecommendationsSurface() {
  const { lang } = useLanguage();
  const locale = localeFor(lang);
  return (
    <div className={styles.grid} data-testid="ai-analyst-recommendations-surface">
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-recommendations-title">
        <SurfaceHeader
          icon={CircleAlert}
          eyebrow={text(locale, { ar: 'التحليل', en: 'Analysis', fr: 'Analyse' })}
          title={text(locale, { ar: 'قراءات الذكاء المالي', en: 'Financial intelligence readings', fr: 'Lectures d’intelligence financière' })}
          body={text(locale, { ar: 'تعرض هذه المساحة نتائج المحرك القانوني فقط. لا يتم خلطها بإشارات السوق القديمة أو توصيات الطرفية.', en: 'This surface shows canonical-engine results only. It never mixes legacy market signals or terminal recommendations.', fr: 'Cette surface affiche uniquement les résultats du moteur canonique. Elle ne mélange jamais les signaux de marché historiques ni les recommandations du terminal.' })}
          id="ai-analyst-recommendations-title"
        />
      </section>
      <RecentAnalysesPanel className={styles.spanFull} />
    </div>
  );
}

export function AiAnalystSettingsSurface() {
  const { lang } = useLanguage();
  const locale = localeFor(lang);
  return (
    <div className={styles.grid} data-testid="ai-analyst-settings-surface">
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-settings-title">
        <SurfaceHeader
          icon={Settings2}
          eyebrow={text(locale, { ar: 'الإعدادات', en: 'Configuration', fr: 'Configuration' })}
          title={text(locale, { ar: 'إعدادات المحلل الذكي', en: 'AI Analyst settings', fr: 'Paramètres de l’Analyste IA' })}
          body={text(locale, { ar: 'لا توجد إعدادات نموذج أو مزود أو تشغيل آلي قابلة للتعديل هنا. تبقى هذه الضوابط إدارية فقط.', en: 'No model, provider, or automation settings are editable here. Those controls remain administrative only.', fr: 'Aucun paramètre de modèle, fournisseur ou automatisation n’est modifiable ici. Ces contrôles restent réservés à l’administration.' })}
          id="ai-analyst-settings-title"
        />
        <p className={styles.statusRail}>{text(locale, { ar: 'تُدار تفضيلات الحساب العامة من إعدادات الحساب ولا يتم اختراع تفضيلات خاصة بالمحلل.', en: 'General account preferences are managed in Account settings; no analyst-specific preferences are fabricated.', fr: 'Les préférences générales du compte sont gérées dans les paramètres du compte ; aucune préférence propre à l’analyste n’est inventée.' })}</p>
        <Link className={styles.linkAction} href="/settings">{text(locale, { ar: 'فتح إعدادات الحساب', en: 'Open account settings', fr: 'Ouvrir les paramètres du compte' })}</Link>
      </section>
    </div>
  );
}
