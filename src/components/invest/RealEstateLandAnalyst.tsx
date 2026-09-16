'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Database, ExternalLink, LandPlot, Loader2, Save, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/lib/useCurrency';
import { assessRealEstateReadiness } from '@/lib/investments/intelligence/readiness';
import type { RealEstateAssetInput } from '@/lib/investments/intelligence/real-estate';
import type { RealEstateAnalystResult } from '@/lib/investments/intelligence/analyst';
import { QatarPropertyLocationPicker } from './QatarPropertyLocationPicker';
import { OfficialPropertyContextPanel } from './OfficialPropertyContextPanel';

// Input choices only, NOT claims of provider or valuation coverage.
const COUNTRY_CODES = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');

function positiveNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
function sourceHref(value?: string): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function RealEstateLandAnalyst({ positionId, initialAsset, onSnapshotSaved }: { positionId?: string; initialAsset?: RealEstateAssetInput; onSnapshotSaved?: () => void }) {
  const { session, isGuest } = useAuth();
  const { currency } = useCurrency();
  const { lang, dir } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const [asset, setAsset] = useState<RealEstateAssetInput>(() => initialAsset ?? { countryCode: '', propertyType: 'LAND', landAreaUnit: 'M2', purchaseCurrency: currency.toUpperCase() });
  const [analysis, setAnalysis] = useState<RealEstateAnalystResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const revisionRef = useRef(0);
  const readiness = useMemo(() => assessRealEstateReadiness(asset, analysis?.evidence ?? []), [asset, analysis]);
  const countries = useMemo(() => {
    const display = new Intl.DisplayNames([lang], { type: 'region' });
    return COUNTRY_CODES.map(code => ({ code, name: display.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name, lang));
  }, [lang]);

  useEffect(() => () => { revisionRef.current += 1; requestRef.current?.abort(); }, []);
  useEffect(() => {
    revisionRef.current += 1; requestRef.current?.abort();
    setAnalysis(null); setSaved(false); setLoading(false); setSaving(false);
  }, [currency, session?.access_token]);

  function update(patch: Partial<RealEstateAssetInput>) {
    revisionRef.current += 1; requestRef.current?.abort();
    setAsset(current => ({ ...current, ...patch }));
    setAnalysis(null); setSaved(false); setError(false); setLoading(false); setSaving(false);
  }
  function money(value?: number, valueCurrency = currency) {
    if (typeof value !== 'number' || !Number.isFinite(value) || !/^[A-Z]{3}$/.test(valueCurrency)) return '—';
    return new Intl.NumberFormat(lang, { style: 'currency', currency: valueCurrency, numberingSystem: 'latn', maximumFractionDigits: 2 }).format(value);
  }
  async function analyze() {
    const token = session?.access_token;
    if (!token || isGuest) return;
    requestRef.current?.abort();
    const controller = new AbortController(); requestRef.current = controller;
    const revision = ++revisionRef.current;
    setLoading(true); setError(false); setSaved(false); setAnalysis(null);
    try {
      const response = await fetch('/api/investments/real-estate/analyze', {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ asset, outputCurrency: currency.toUpperCase() }),
      });
      const payload = await response.json() as { ok?: boolean; analysis?: RealEstateAnalystResult };
      if (!response.ok || !payload.ok || !payload.analysis || !Array.isArray(payload.analysis.evidence)) throw new Error('ANALYSIS_FAILED');
      if (revision === revisionRef.current) setAnalysis(payload.analysis);
    } catch { if (!controller.signal.aborted && revision === revisionRef.current) setError(true); }
    finally { if (revision === revisionRef.current) setLoading(false); }
  }
  async function save() {
    const token = session?.access_token;
    if (!token || isGuest || !positionId || analysis?.status !== 'VALUED' || !analysis.valuation || saved) return;
    const controller = new AbortController(); requestRef.current = controller;
    const revision = revisionRef.current;
    setSaving(true); setError(false);
    try {
      const response = await fetch('/api/investments/real-estate/snapshots', {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ positionId, valuation: analysis.valuation, evidence: analysis.evidence }),
      });
      const payload = await response.json() as { ok?: boolean };
      if (!response.ok || !payload.ok) throw new Error('SAVE_FAILED');
      if (revision === revisionRef.current) { setSaved(true); onSnapshotSaved?.(); }
    } catch { if (!controller.signal.aborted && revision === revisionRef.current) setError(true); }
    finally { if (revision === revisionRef.current) setSaving(false); }
  }

  const valuation = analysis?.status === 'VALUED' ? analysis.valuation : null;
  const status = analysis?.status === 'VALUED'
    ? L('نطاق تقديري مدعوم بالأدلة', 'Evidence-backed estimate', 'Estimation fondée sur des preuves')
    : analysis?.officialContext
      ? L('بيانات المصدر منفصلة عن تقييم العقار', 'Source data is separate from property valuation', 'Données source distinctes de la valorisation')
      : analysis?.status === 'SOURCE_COVERAGE_UNAVAILABLE'
        ? L('لم تُربط مصادر فعلية لهذه الدولة بعد', 'Live sources are not connected for this country yet', 'Les sources réelles ne sont pas encore connectées pour ce pays')
        : L('الأدلة غير كافية للتقييم', 'Insufficient valuation evidence', 'Preuves insuffisantes pour une estimation');
  const canAnalyze = Boolean(session?.access_token && !isGuest && asset.propertyType && readiness.checks.assetIdentity && readiness.checks.area
    && (asset.countryCode !== 'QA' || asset.district));

  return <section className="real-estate-analyst" dir={dir} aria-label={L('بيانات العقار وأدلته', 'Property details and evidence', 'Détails et preuves du bien')}>
    <div className="real-estate-analyst__layout">
      <form className="real-estate-analyst__form" onSubmit={event => { event.preventDefault(); if (canAnalyze && !loading && !saving) void analyze(); }}>
        <fieldset disabled={loading || saving}>
          <legend>{L('بيانات الأرض والعقار', 'Land and property details', 'Détails du terrain et du bien')}</legend>
          <div className="real-estate-analyst__grid">
            <label>{L('الدولة', 'Country', 'Pays')}<select value={asset.countryCode} required onChange={event => update({ countryCode: event.target.value, city: '', municipality: '', district: '' })}><option value="">{L('اختر الدولة', 'Select country', 'Choisir un pays')}</option>{countries.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
            <label>{L('نوع الأصل', 'Asset type', 'Type d’actif')}<select value={asset.propertyType} required onChange={event => update({ propertyType: event.target.value })}><option value="">{L('اختر النوع', 'Select type', 'Choisir un type')}</option><option value="LAND">{L('أرض', 'Land', 'Terrain')}</option><option value="APARTMENT">{L('شقة', 'Apartment', 'Appartement')}</option><option value="HOUSE">{L('منزل / فيلا', 'House / villa', 'Maison / villa')}</option><option value="COMMERCIAL">{L('تجاري', 'Commercial', 'Commercial')}</option><option value="BUILDING">{L('مبنى', 'Building', 'Immeuble')}</option></select></label>
            <label>{L('المنطقة / المحافظة', 'Region / state', 'Région / province')}<input value={asset.region ?? ''} maxLength={160} onChange={event => update({ region: event.target.value })} /></label>
            {asset.countryCode === 'QA' ? <QatarPropertyLocationPicker asset={asset} onChange={update} /> : <>
              <label>{L('المدينة / البلدية', 'City / municipality', 'Ville / municipalité')}<input value={asset.city ?? asset.municipality ?? ''} maxLength={160} onChange={event => update({ city: event.target.value, municipality: undefined })} /></label>
              <label>{L('الحي / المنطقة السكنية', 'District / neighborhood', 'Quartier')}<input value={asset.district ?? ''} maxLength={160} onChange={event => update({ district: event.target.value })} /></label>
            </>}
            <label>{L('رقم القطعة', 'Parcel / plot ID', 'Référence de parcelle')}<input value={asset.parcelIdentifier ?? ''} maxLength={160} onChange={event => update({ parcelIdentifier: event.target.value })} /></label>
            <label>{L('تاريخ الشراء', 'Purchase date', 'Date d’achat')}<input type="date" value={asset.purchaseDate ?? ''} onChange={event => update({ purchaseDate: event.target.value || undefined })} /></label>
            <label>{L('إجمالي سعر الشراء', 'Total purchase price', 'Prix d’achat total')}<input type="number" inputMode="decimal" min="0" step="any" value={asset.purchasePrice ?? ''} onChange={event => update({ purchasePrice: positiveNumber(event.target.value) })} /></label>
            <label>{L('عملة الشراء', 'Purchase currency', 'Devise d’achat')}<input dir="ltr" value={asset.purchaseCurrency ?? ''} pattern="[A-Z]{3}" maxLength={3} onChange={event => update({ purchaseCurrency: event.target.value.toUpperCase() })} /></label>
            <label>{L('مساحة الأرض', 'Land area', 'Surface du terrain')}<input type="number" inputMode="decimal" min="0" step="any" required value={asset.landArea ?? ''} onChange={event => update({ landArea: positiveNumber(event.target.value) })} /></label>
            <label>{L('وحدة المساحة', 'Area unit', 'Unité de surface')}<select value={asset.landAreaUnit ?? ''} required onChange={event => update({ landAreaUnit: event.target.value as 'M2' | 'FT2' })}><option value="">{L('اختر الوحدة', 'Select unit', 'Choisir une unité')}</option><option value="M2">m²</option><option value="FT2">ft²</option></select></label>
            <label>{L('العنوان', 'Address', 'Adresse')}<input value={asset.address ?? ''} maxLength={500} onChange={event => update({ address: event.target.value })} /></label>
          </div>
        </fieldset>
        <button className="real-estate-analyst__analyze" type="submit" disabled={!canAnalyze || loading || saving}>
          {loading ? <Loader2 size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
          {loading ? L('جارٍ البحث…', 'Searching…', 'Recherche…') : L('البحث عن أدلة موثقة', 'Search verified evidence', 'Rechercher des preuves vérifiées')}
        </button>
        {valuation && positionId ? <button className="real-estate-analyst__save" type="button" onClick={() => void save()} disabled={saving || saved}><Save size={18} aria-hidden="true" />{saved ? L('تم الحفظ', 'Saved', 'Enregistré') : L('حفظ التقييم وأدلته', 'Save valuation and evidence', 'Enregistrer l’estimation et ses preuves')}</button> : null}
        {error ? <p role="alert">{L('تعذر إكمال الطلب. حاول مجددًا دون تغيير بيانات العقار.', 'The request could not be completed. Please retry.', 'La demande n’a pas abouti. Veuillez réessayer.')}</p> : null}
        {saved ? <p role="status">{L('حُفظ التقييم وتم تحديث سجله التاريخي.', 'Valuation saved; history refreshed.', 'Estimation enregistrée ; historique actualisé.')}</p> : null}
        <p className="real-estate-analyst__guardrail">{L('لا نختلق الأسعار. توافر إدخال الدولة لا يعني توافر مصدر آلي لتقييمها.', 'No invented prices. Country input availability does not imply live valuation coverage.', 'Aucun prix inventé. La saisie d’un pays ne signifie pas une couverture de valorisation en direct.')}</p>
        {asset.countryCode === 'KW' ? <p>{L('ربط بيانات وزارة العدل الكويتية لإعادة الاستخدام ينتظر الموافقة الخطية المطلوبة بشروط المصدر.', 'Kuwait MOJ data reuse awaits the written permission required by its terms.', 'La réutilisation des données du ministère koweïtien attend l’autorisation écrite requise.')}</p> : null}
      </form>
      <aside className="real-estate-analyst__results" aria-live="polite" aria-busy={loading}>
        <h2 className="real-estate-analyst__section-title"><Database size={18} aria-hidden="true" />{L('الأدلة والتقييم', 'Evidence and valuation', 'Preuves et estimation')}</h2>
        <div className="real-estate-analyst__empty-result"><LandPlot size={30} aria-hidden="true" /><h3>{analysis ? status : L('لا يوجد تقييم بعد', 'No valuation yet', 'Aucune estimation pour le moment')}</h3><p>{L('يظهر نطاق القيمة فقط بعد اجتياز فحوص الأدلة. سعر الإعلان ليس صفقة بيع مكتملة.', 'A range appears only after evidence checks pass. An asking price is not a completed sale.', 'Une fourchette apparaît uniquement après validation des preuves. Un prix demandé n’est pas une vente conclue.')}</p></div>
        {analysis ? <div className="real-estate-analyst__future-grid">
          <div><span>{L('نطاق القيمة', 'Estimated range', 'Fourchette estimée')}</span><strong dir="ltr">{valuation ? `${money(valuation.lowValue, valuation.currency)} – ${money(valuation.highValue, valuation.currency)}` : '—'}</strong></div>
          <div><span>{L('القيمة الوسطية', 'Midpoint', 'Valeur médiane')}</span><strong dir="ltr">{money(valuation?.midpointValue, valuation?.currency)}</strong></div>
          <div><span>{L('الأدلة الصالحة لمحرك التقييم', 'Valuation engine evidence', 'Preuves pour le moteur de valorisation')}</span><strong>{analysis.evidenceCount}</strong></div>
          <div><span>{L('المصادر المتعذرة', 'Unavailable sources', 'Sources indisponibles')}</span><strong>{analysis.sourceFailures.length}</strong></div>
        </div> : null}
        {analysis?.officialContext ? <OfficialPropertyContextPanel report={analysis.officialContext} /> : null}
        {valuation ? <p>{L('جودة الأدلة وليست احتمالًا:', 'Evidence quality, not probability:', 'Qualité des preuves, pas une probabilité :')} {valuation.confidence}</p> : null}
        {analysis?.evidence.map(item => {
          const href = sourceHref(item.sourceUrl);
          return <article key={item.id} className="real-estate-analyst__evidence-row">
            <div><strong>{item.sourceName}</strong><span>{item.type.replaceAll('_', ' ')}</span><small>{L('تاريخ الدليل', 'Observation date', 'Date de constat')} : {item.observedOn ?? '—'}</small><small>{L('تاريخ الاسترجاع', 'Retrieved', 'Récupéré')} : {item.retrievedAt.slice(0, 10)}</small></div>
            <div><strong dir="ltr">{typeof item.unitValue === 'number' ? `${money(item.unitValue, item.currency)}/${item.unitCode ?? '—'}` : money(item.amount, item.currency)}</strong>{item.limitations ? <small>{item.limitations}</small> : null}</div>
            {href ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${L('فتح المصدر', 'Open source', 'Ouvrir la source')} ${item.sourceName}`}><ExternalLink size={18} aria-hidden="true" /></a> : null}
          </article>;
        })}
      </aside>
    </div>
  </section>;
}
