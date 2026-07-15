'use client';

import { useMemo, useState } from 'react';
import { Building2, Check, CircleOff, Merge, Save, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { INVESTMENT_PLATFORM_TYPES, type InvestmentPlatformDirectoryItem, type InvestmentPlatformStatus, type InvestmentPlatformType } from '@/types/investmentPlatform';

type ModerationItem = InvestmentPlatformDirectoryItem & {
  potentialDuplicates?: Array<{ id: string; name: string; status: InvestmentPlatformStatus }>;
};

type Props = { initialItems: ModerationItem[] };

const COPY = {
  ar: {
    eyebrow: 'دليل الاستثمار المشترك', title: 'مراجعة منصات الاستثمار', description: 'راجع الاقتراحات قبل إتاحتها في الدليل العام. لا تعرض هذه الصفحة هوية مقدم الاقتراح أو أي بيانات استثمارية.',
    all: 'الكل', pending: 'بانتظار المراجعة', approved: 'معتمد للدليل', rejected: 'مرفوض', disabled: 'معطّل', search: 'البحث بالاسم', empty: 'لا توجد منصات مطابقة.',
    select: 'اختر منصة لمراجعتها.', name: 'اسم المنصة', type: 'نوع المنصة', website: 'الموقع الرسمي الاختياري', aliases: 'الأسماء البديلة، مفصولة بفواصل', normalized: 'الهوية المعيارية', possible: 'تطابقات محتملة', mergeTarget: 'دمج مع منصة موجودة', noMerge: 'اختر منصة معتمدة', save: 'حفظ التعديلات', approve: 'اعتماد', reject: 'رفض', disable: 'تعطيل', merge: 'دمج', saved: 'تم تحديث المنصة.', failed: 'تعذر تنفيذ الإجراء.', loading: 'جارٍ الحفظ…', directoryNote: 'الاعتماد يعني الإتاحة في الدليل فقط، وليس توصية أو تصنيف أمان.', seeded: 'خيار أساسي', custom: 'اقتراح مستخدم',
  },
  en: {
    eyebrow: 'Shared investment directory', title: 'Investment platform moderation', description: 'Review suggestions before they become public directory options. Submitter identity and investment data are never shown here.',
    all: 'All', pending: 'Pending review', approved: 'Approved for directory', rejected: 'Rejected', disabled: 'Disabled', search: 'Search by name', empty: 'No matching platforms.',
    select: 'Select a platform to review.', name: 'Platform name', type: 'Platform type', website: 'Optional official website', aliases: 'Aliases, separated by commas', normalized: 'Normalized identity', possible: 'Potential duplicate matches', mergeTarget: 'Merge into an existing platform', noMerge: 'Choose an approved platform', save: 'Save changes', approve: 'Approve', reject: 'Reject', disable: 'Disable', merge: 'Merge', saved: 'Platform updated.', failed: 'The action could not be completed.', loading: 'Saving…', directoryNote: 'Approval makes an option available in the directory; it is not a recommendation or safety rating.', seeded: 'Seeded option', custom: 'User suggestion',
  },
  fr: {
    eyebrow: 'Répertoire d’investissement partagé', title: 'Modération des plateformes d’investissement', description: 'Examinez les suggestions avant leur publication dans le répertoire. L’identité de l’auteur et les données d’investissement ne sont jamais affichées ici.',
    all: 'Toutes', pending: 'En attente de validation', approved: 'Approuvée pour le répertoire', rejected: 'Rejetée', disabled: 'Désactivée', search: 'Rechercher par nom', empty: 'Aucune plateforme correspondante.',
    select: 'Sélectionnez une plateforme à examiner.', name: 'Nom de la plateforme', type: 'Type de plateforme', website: 'Site officiel facultatif', aliases: 'Alias, séparés par des virgules', normalized: 'Identité normalisée', possible: 'Doublons potentiels', mergeTarget: 'Fusionner avec une plateforme existante', noMerge: 'Choisir une plateforme approuvée', save: 'Enregistrer', approve: 'Approuver', reject: 'Rejeter', disable: 'Désactiver', merge: 'Fusionner', saved: 'Plateforme mise à jour.', failed: 'Impossible d’effectuer l’action.', loading: 'Enregistrement…', directoryNote: 'L’approbation rend une option disponible dans le répertoire ; ce n’est ni une recommandation ni une note de sécurité.', seeded: 'Option initiale', custom: 'Suggestion utilisateur',
  },
} as const;

const TYPE_LABELS: Record<'ar' | 'en' | 'fr', Record<InvestmentPlatformType, string>> = {
  ar: { stock_broker: 'وسيط أسهم', bank_brokerage: 'وساطة مصرفية', multi_asset_broker: 'وسيط متعدد الأصول', crypto_exchange: 'منصة عملات رقمية', fund_platform: 'منصة صناديق', robo_advisor: 'مستشار آلي', precious_metals_dealer: 'تاجر معادن ثمينة', real_estate_platform: 'منصة عقارية', private_investment_provider: 'جهة استثمار خاص', other: 'أخرى' },
  en: { stock_broker: 'Stock broker', bank_brokerage: 'Bank brokerage', multi_asset_broker: 'Multi-asset broker', crypto_exchange: 'Cryptocurrency exchange', fund_platform: 'Fund platform', robo_advisor: 'Robo-advisor', precious_metals_dealer: 'Precious-metals dealer', real_estate_platform: 'Real-estate platform', private_investment_provider: 'Private investment provider', other: 'Other' },
  fr: { stock_broker: 'Courtier en actions', bank_brokerage: 'Courtage bancaire', multi_asset_broker: 'Courtier multi-actifs', crypto_exchange: 'Plateforme de cryptomonnaies', fund_platform: 'Plateforme de fonds', robo_advisor: 'Robot-conseiller', precious_metals_dealer: 'Négociant en métaux précieux', real_estate_platform: 'Plateforme immobilière', private_investment_provider: 'Prestataire d’investissement privé', other: 'Autre' },
};

export default function InvestmentPlatformsAdminClient({ initialItems }: Props) {
  const { lang, dir } = useLanguage();
  const locale = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
  const c = COPY[locale];
  const [items, setItems] = useState(initialItems);
  const [status, setStatus] = useState<'all' | InvestmentPlatformStatus>('pending');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialItems.find(item => item.status === 'pending')?.id ?? null);
  const selected = items.find(item => item.id === selectedId) ?? null;
  const [draft, setDraft] = useState(() => toDraft(selected));
  const [mergeTarget, setMergeTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return items.filter(item => (status === 'all' || item.status === status) && (!needle || item.canonicalName.toLocaleLowerCase(locale).includes(needle)));
  }, [items, locale, query, status]);
  const approvedTargets = items.filter(item => item.status === 'approved' && item.id !== selectedId);

  function choose(item: ModerationItem) {
    setSelectedId(item.id);
    setDraft(toDraft(item));
    setMergeTarget('');
    setMessage('');
  }

  async function moderate(action: 'approve' | 'reject' | 'disable' | 'update' | 'merge') {
    if (!selected) return;
    if (action === 'merge' && !mergeTarget) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/investment-platforms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          action,
          targetId: action === 'merge' ? mergeTarget : undefined,
          name: draft.name,
          platformType: draft.platformType,
          websiteUrl: draft.websiteUrl,
          aliases: draft.aliases.split(',').map(value => value.trim()).filter(Boolean),
        }),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; item?: ModerationItem };
      if (!response.ok || !payload.ok) throw new Error('moderation_failed');
      if (action === 'merge') {
        setItems(current => current.map(item => item.id === selected.id ? { ...item, status: 'disabled' } : item));
      } else if (payload.item) {
        setItems(current => current.map(item => item.id === selected.id ? payload.item as ModerationItem : item));
        setDraft(toDraft(payload.item));
      }
      setMessage(c.saved);
    } catch {
      setMessage(c.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir={dir} className="platform-admin-page">
      <header className="platform-admin-header">
        <p>{c.eyebrow}</p>
        <h1>{c.title}</h1>
        <span>{c.description}</span>
      </header>

      <section className="platform-admin-toolbar" aria-label={c.title}>
        <label><span>{c.search}</span><input value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label><span>{c.all}</span><select value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="all">{c.all}</option><option value="pending">{c.pending}</option><option value="approved">{c.approved}</option><option value="rejected">{c.rejected}</option><option value="disabled">{c.disabled}</option></select></label>
      </section>

      <section className="platform-admin-workspace">
        <div className="platform-admin-list" role="list" aria-label={c.title}>
          {filtered.map(item => (
            <button key={item.id} type="button" role="listitem" className={item.id === selectedId ? 'selected' : ''} onClick={() => choose(item)}>
              <Building2 size={18} aria-hidden="true" />
              <span><strong>{item.canonicalName}</strong><small>{TYPE_LABELS[locale][item.platformType]} · {item.isSeeded ? c.seeded : c.custom}</small></span>
              <em className={`status-${item.status}`}>{c[item.status]}</em>
            </button>
          ))}
          {!filtered.length ? <p className="platform-admin-empty">{c.empty}</p> : null}
        </div>

        <aside className="platform-admin-review">
          {selected ? (
            <>
              <div className="platform-admin-review-title"><Building2 aria-hidden="true" /><div><h2>{selected.canonicalName}</h2><span>{c[selected.status]}</span></div></div>
              <p className="platform-admin-note">{c.directoryNote}</p>
              <label>{c.name}<input value={draft.name} maxLength={80} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label>
              <label>{c.type}<select value={draft.platformType} onChange={event => setDraft(current => ({ ...current, platformType: event.target.value as InvestmentPlatformType }))}>{INVESTMENT_PLATFORM_TYPES.map(type => <option key={type} value={type}>{TYPE_LABELS[locale][type]}</option>)}</select></label>
              <label>{c.website}<input dir="ltr" type="url" inputMode="url" maxLength={300} value={draft.websiteUrl} onChange={event => setDraft(current => ({ ...current, websiteUrl: event.target.value }))} placeholder="https://" /></label>
              <label>{c.aliases}<textarea rows={3} value={draft.aliases} onChange={event => setDraft(current => ({ ...current, aliases: event.target.value }))} /></label>
              <dl><div><dt>{c.normalized}</dt><dd dir="ltr">{selected.normalizedName}</dd></div><div><dt>{c.possible}</dt><dd>{selected.potentialDuplicates?.map(item => item.name).join(', ') || '—'}</dd></div></dl>
              <div className="platform-admin-actions">
                <button type="button" onClick={() => void moderate('update')} disabled={busy}><Save size={17} />{c.save}</button>
                {selected.status !== 'approved' ? <button type="button" className="approve" onClick={() => void moderate('approve')} disabled={busy}><Check size={17} />{c.approve}</button> : null}
                {selected.status !== 'rejected' ? <button type="button" className="reject" onClick={() => void moderate('reject')} disabled={busy}><X size={17} />{c.reject}</button> : null}
                {selected.status !== 'disabled' ? <button type="button" onClick={() => void moderate('disable')} disabled={busy}><CircleOff size={17} />{c.disable}</button> : null}
              </div>
              <div className="platform-admin-merge"><label>{c.mergeTarget}<select value={mergeTarget} onChange={event => setMergeTarget(event.target.value)}><option value="">{c.noMerge}</option>{approvedTargets.map(item => <option key={item.id} value={item.id}>{item.canonicalName}</option>)}</select></label><button type="button" onClick={() => void moderate('merge')} disabled={busy || !mergeTarget}><Merge size={17} />{c.merge}</button></div>
              {message ? <p role="status" className={message === c.saved ? 'success' : 'error'}>{busy ? c.loading : message}</p> : null}
            </>
          ) : <p className="platform-admin-empty">{c.select}</p>}
        </aside>
      </section>

      <style jsx>{`
        .platform-admin-page{display:grid;gap:18px;min-width:0;color:var(--foreground);font-family:var(--font-ui)}.platform-admin-header{display:grid;gap:7px}.platform-admin-header :is(p,h1,span){margin:0}.platform-admin-header p{color:var(--primary);font-size:13px;font-weight:600}.platform-admin-header h1{font-size:clamp(28px,4vw,42px);font-weight:600;line-height:1.15}.platform-admin-header span{max-width:78ch;color:var(--foreground-secondary);line-height:1.7}
        .platform-admin-toolbar{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(180px,.5fr);gap:12px;padding:14px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface)}label{display:grid;gap:7px;min-width:0;color:var(--foreground-secondary);font-size:13px;font-weight:600}input,select,textarea{width:100%;min-height:44px;padding:9px 11px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-elevated);color:var(--foreground);font:inherit}textarea{resize:vertical}
        .platform-admin-workspace{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);gap:16px;align-items:start;min-width:0}.platform-admin-list,.platform-admin-review{min-width:0;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-sm)}.platform-admin-list{display:grid;max-height:680px;overflow-y:auto}.platform-admin-list>button{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:center;min-height:62px;padding:11px 13px;border:0;border-bottom:1px solid var(--border);background:transparent;color:var(--foreground);text-align:start;cursor:pointer}.platform-admin-list>button:hover,.platform-admin-list>button.selected{background:var(--surface-hover)}.platform-admin-list>button.selected{border-inline-start:3px solid var(--primary)}.platform-admin-list strong,.platform-admin-list small{display:block;overflow-wrap:anywhere}.platform-admin-list small{margin-top:3px;color:var(--foreground-muted);font-weight:500}.platform-admin-list em{padding:4px 8px;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface-muted);color:var(--foreground-secondary);font-size:11px;font-style:normal;font-weight:600}.platform-admin-list em.status-pending{color:var(--warning)}.platform-admin-list em.status-approved{color:var(--success)}.platform-admin-list em.status-rejected{color:var(--danger)}
        .platform-admin-review{display:grid;gap:13px;padding:18px}.platform-admin-review-title{display:flex;gap:11px;align-items:center}.platform-admin-review-title h2{margin:0;font-size:21px}.platform-admin-review-title span{color:var(--foreground-muted);font-size:12px;font-weight:600}.platform-admin-note{margin:0;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground-secondary);font-size:12px;line-height:1.6}.platform-admin-review dl{display:grid;gap:8px;margin:0}.platform-admin-review dl div{display:grid;grid-template-columns:minmax(110px,.4fr) minmax(0,1fr);gap:8px}.platform-admin-review :is(dt,dd){margin:0;overflow-wrap:anywhere}.platform-admin-review dt{color:var(--foreground-muted);font-size:12px;font-weight:600}.platform-admin-review dd{color:var(--foreground-secondary);font-size:12px}.platform-admin-actions{display:flex;flex-wrap:wrap;gap:8px}.platform-admin-actions button,.platform-admin-merge button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-elevated);color:var(--foreground);font:600 12px var(--font-ui);cursor:pointer}.platform-admin-actions button.approve{border-color:color-mix(in srgb,var(--success) 40%,var(--border));color:var(--success)}.platform-admin-actions button.reject{border-color:color-mix(in srgb,var(--danger) 40%,var(--border));color:var(--danger)}.platform-admin-merge{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}.platform-admin-review>p[role=status]{margin:0;padding:9px 11px;border-radius:var(--radius-control);font-size:13px;font-weight:600}.platform-admin-review>p.success{background:var(--success-soft);color:var(--success)}.platform-admin-review>p.error{background:var(--danger-soft);color:var(--danger)}.platform-admin-empty{margin:0;padding:30px;text-align:center;color:var(--foreground-muted)}button:disabled{cursor:not-allowed;opacity:.62}.platform-admin-page :is(button,input,select,textarea):focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}
        @media(max-width:900px){.platform-admin-workspace{grid-template-columns:minmax(0,1fr)}}@media(max-width:520px){.platform-admin-toolbar,.platform-admin-merge{grid-template-columns:minmax(0,1fr)}.platform-admin-list>button{grid-template-columns:auto minmax(0,1fr)}.platform-admin-list em{grid-column:2}.platform-admin-review{padding:15px}.platform-admin-actions button,.platform-admin-merge button{width:100%}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
      `}</style>
    </main>
  );
}

function toDraft(item: ModerationItem | null | undefined) {
  return {
    name: item?.canonicalName ?? '',
    platformType: item?.platformType ?? 'other' as InvestmentPlatformType,
    websiteUrl: item?.websiteUrl ?? '',
    aliases: item?.aliases.join(', ') ?? '',
  };
}
