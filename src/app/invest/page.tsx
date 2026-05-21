'use client';

import { useMemo, useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { InvestmentFormModal } from '@/components/invest/InvestmentFormModal';
import { InvestmentList } from '@/components/invest/InvestmentList';
import { InvestmentDetailDrawer } from '@/components/invest/InvestmentDetailDrawer';
import { ConfirmDeleteModal } from '@/components/invest/ConfirmDeleteModal';
import { EmptyState } from '@/components/invest/EmptyState';
import { useInvestments } from '@/hooks/useInvestments';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/lib/useCurrency';
import { formatCurrency } from '@/lib/format';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';

const TYPES: InvestmentType[] = ['stocks', 'realEstate', 'fund', 'gold', 'cash', 'crypto', 'project', 'other'];
const RISKS: RiskLevel[] = ['low', 'medium', 'high'];

export default function InvestPage() {
  const { lang, dir, t } = useLanguage();
  const { currency } = useCurrency();
  const { items, isLoading, error, add, update, remove } = useInvestments();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<Investment | null>(null);
  const [details, setDetails] = useState<Investment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Investment | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

  const labels = useMemo(() => ({
    heroTitle: t('invest_hero_title'),
    heroSubtitle: t('invest_hero_subtitle'),
    activeBadge: t('invest_hero_activeBadge'),
    addCta: t('invest_hero_addCta'),
    emptyTitle: t('invest_empty_title'),
    emptyDescription: t('invest_empty_description'),
    emptyCta: t('invest_empty_cta'),
    search: t('invest_list_search'),
    allTypes: t('invest_list_allTypes'),
    sortBy: t('invest_list_sortBy'),
    valueDesc: t('invest_list_valueDesc'),
    valueAsc: t('invest_list_valueAsc'),
    monthlyDesc: t('invest_list_monthlyDesc'),
    riskDesc: t('invest_list_riskDesc'),
    newest: t('invest_list_newest'),
    details: t('invest_list_details'),
    edit: t('invest_list_edit'),
    delete: t('invest_list_delete'),
    monthly: t('invest_form_monthly'),
    risk: t('invest_form_risk'),
    expectedReturn: t('invest_form_expectedReturn'),
    ofPortfolio: t('invest_list_ofPortfolio'),
    currentValue: t('invest_form_currentValue'),
    type: t('invest_form_type'),
    startDate: t('invest_form_startDate'),
    notes: t('invest_form_notes'),
    close: t('close'),
  }), [t]);

  const formLabels = useMemo(() => ({
    titleAdd: t('invest_form_titleAdd'),
    titleEdit: t('invest_form_titleEdit'),
    close: t('close'),
    name: t('invest_form_name'),
    namePlaceholder: t('invest_form_namePlaceholder'),
    type: t('invest_form_type'),
    currentValue: t('invest_form_currentValue'),
    monthly: t('invest_form_monthly'),
    startDate: t('invest_form_startDate'),
    risk: t('invest_form_risk'),
    expectedReturn: t('invest_form_expectedReturn'),
    notes: t('invest_form_notes'),
    save: t('invest_form_save'),
    update: t('invest_form_update'),
    cancel: t('cancel'),
    errors: {
      nameRequired: t('invest_form_errors_nameRequired'),
      valuePositive: t('invest_form_errors_valuePositive'),
      contributionPositive: t('invest_form_errors_contributionPositive'),
      returnRange: t('invest_form_errors_returnRange'),
    },
  }), [t]);

  const totalValue = useMemo(() => items.reduce((sum, item) => sum + item.currentValue, 0), [items]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  }

  function openCreate() {
    setSelected(null);
    setMode('create');
    setModalOpen(true);
  }

  function openEdit(item: Investment) {
    setSelected(item);
    setMode('edit');
    setModalOpen(true);
  }

  async function handleSave(input: InvestmentInput) {
    setSaving(true);
    try {
      if (mode === 'create') {
        await add(input);
        showToast(t('invest_form_successAdd'));
      } else if (selected) {
        await update(selected.id, input);
        showToast(t('invest_form_successUpdate'));
      }
      setModalOpen(false);
      setSelected(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      showToast(t('invest_delete_success'));
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('error'));
    } finally {
      setDeleting(false);
    }
  }

  const typeLabel = (type: InvestmentType) => t(`invest_types_${type}`);
  const riskLabel = (risk: RiskLevel) => t(`invest_risks_${risk}`);
  const money = (amount: number) => formatCurrency(amount, currency, lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en');

  return (
    <div className="invest-shell" dir={dir}>
      <Sidebar />
      <main className="invest-main">
        <header className="invest-topbar">
          <div>
            <span>{labels.activeBadge}</span>
            <h1>{labels.heroTitle}</h1>
          </div>
          <LanguageSwitcher variant="gold" compact />
        </header>

        <section className="invest-hero">
          <div className="invest-hero-content">
            <div className="invest-badge">
              <span />
              {labels.activeBadge}
            </div>
            <h2>{labels.heroTitle}</h2>
            <p>{labels.heroSubtitle}</p>
            <button type="button" className="invest-primary-btn" onClick={openCreate}>
              <Plus size={17} />
              {labels.addCta}
            </button>
          </div>
          <div className="invest-hero-total">
            <TrendingUp size={25} />
            <span>{t('invest_summary_portfolioValue')}</span>
            <strong>{money(totalValue)}</strong>
          </div>
        </section>

        {error && <div className="invest-notice">{error}</div>}

        {isLoading ? (
          <div className="invest-panel invest-loading">{t('loading')}</div>
        ) : items.length === 0 ? (
          <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} cta={labels.emptyCta} onCreate={openCreate} />
        ) : (
          <InvestmentList
            investments={items}
            labels={labels}
            types={TYPES}
            typeLabel={typeLabel}
            riskLabel={riskLabel}
            formatMoney={money}
            onDetails={setDetails}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        )}

        <InvestmentFormModal
          open={modalOpen}
          mode={mode}
          currency={currency}
          dir={dir}
          labels={formLabels}
          typeOptions={TYPES}
          riskOptions={RISKS}
          typeLabel={typeLabel}
          riskLabel={riskLabel}
          initialValues={selected}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />

        <InvestmentDetailDrawer
          open={Boolean(details)}
          investment={details}
          labels={labels}
          typeLabel={typeLabel}
          riskLabel={riskLabel}
          formatMoney={money}
          onClose={() => setDetails(null)}
        />

        <ConfirmDeleteModal
          open={Boolean(deleteTarget)}
          investment={deleteTarget}
          title={t('invest_delete_title')}
          message={t('invest_delete_message')}
          cancelLabel={t('cancel')}
          confirmLabel={t('invest_delete_confirm')}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
        />

        {toast && <div className="invest-toast">{toast}</div>}
      </main>

      <style jsx global>{`
        .invest-shell{min-height:100vh;background:#F7F3EA;color:#111;display:flex;font-family:Tajawal,Arial,sans-serif}
        .invest-main{flex:1;width:100%;max-width:1280px;margin:0 auto;padding:22px;margin-inline-start:230px}
        .invest-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
        .invest-topbar span{font-size:12px;color:#9A6C3C;font-weight:900}.invest-topbar h1{font-size:25px;margin:4px 0 0;font-weight:900;color:#111}
        .invest-hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#111 0%,#2B1A0D 58%,#D8AE63 140%);border:1px solid rgba(216,174,99,.22);border-radius:26px;padding:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;color:#FFFDFC;box-shadow:0 20px 55px rgba(45,26,10,.16);margin-bottom:18px}
        .invest-hero:before{content:"";position:absolute;inset-inline-end:-80px;top:-90px;width:240px;height:240px;border-radius:50%;background:rgba(216,174,99,.12);filter:blur(18px)}
        .invest-hero-content{position:relative;z-index:1}.invest-badge{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(34,197,94,.3);background:rgba(34,197,94,.14);color:#86EFAC;border-radius:999px;padding:5px 11px;font-size:12px;font-weight:900;margin-bottom:14px}.invest-badge span{width:7px;height:7px;border-radius:50%;background:#22C55E;animation:pulse 1.6s infinite}
        .invest-hero h2{font-size:34px;line-height:1.05;margin:0 0 10px;font-weight:900}.invest-hero p{max-width:680px;margin:0 0 18px;color:rgba(255,255,255,.72);line-height:1.8;font-size:14px}
        .invest-hero-total{position:relative;z-index:1;min-width:230px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:18px;display:grid;gap:7px;backdrop-filter:blur(12px)}.invest-hero-total svg{color:#D8AE63}.invest-hero-total span{color:rgba(255,255,255,.68);font-size:12px;font-weight:800}.invest-hero-total strong{font-size:23px;color:#D8AE63}
        .invest-primary-btn,.invest-secondary-btn,.invest-danger-btn{height:43px;border-radius:14px;border:0;padding:0 17px;font:900 13px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all .2s}.invest-primary-btn{background:linear-gradient(135deg,#D8AE63,#9A6C3C);color:#111;box-shadow:0 10px 24px rgba(216,174,99,.22)}.invest-primary-btn:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(216,174,99,.28)}.invest-secondary-btn{background:#FFFDFC;color:#5B4332;border:1px solid rgba(216,174,99,.22)}.invest-danger-btn{background:#B91C1C;color:#fff}.invest-primary-btn:disabled,.invest-secondary-btn:disabled,.invest-danger-btn:disabled{opacity:.6;cursor:wait}
        .invest-panel,.invest-empty{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:22px;box-shadow:0 4px 22px rgba(90,67,51,.06)}
        .invest-empty{min-height:280px;padding:42px 20px;text-align:center;display:grid;place-items:center;align-content:center;gap:12px}.invest-empty-icon{width:68px;height:68px;border-radius:22px;background:rgba(216,174,99,.12);color:#D8AE63;display:grid;place-items:center}.invest-empty h3{margin:0;font-size:20px}.invest-empty p{max-width:520px;margin:0;color:#7C6A5D;line-height:1.8;font-size:14px}
        .invest-controls{display:grid;grid-template-columns:1fr 220px 220px;gap:10px;padding:16px;border-bottom:1px solid rgba(216,174,99,.1)}.invest-controls input,.invest-controls select,.invest-field input,.invest-field select,.invest-field textarea{height:48px;border:1.5px solid rgba(216,174,99,.22);border-radius:14px;background:#F7F3EA;color:#111;padding:0 13px;font:800 13px Tajawal,Arial,sans-serif;outline:0}.invest-controls input:focus,.invest-controls select:focus,.invest-field input:focus,.invest-field select:focus,.invest-field textarea:focus{border-color:#D8AE63;background:#FFFDFC;box-shadow:0 0 0 4px rgba(216,174,99,.12)}
        .invest-list{display:grid;gap:0;padding:4px 16px 16px}.invest-row{padding:16px 0;border-bottom:1px solid rgba(216,174,99,.1);display:grid;gap:11px}.invest-row:last-child{border-bottom:0}.invest-row-main{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.invest-row-main h3{margin:0 0 5px;font-size:16px;font-weight:900}.invest-row-main p{margin:0;color:#8B7A6D;font-size:12px;font-weight:800}.invest-row-main strong{font-size:16px;color:#D8AE63;white-space:nowrap}.invest-row-meta{display:flex;flex-wrap:wrap;gap:8px}.invest-row-meta span{font-size:12px;font-weight:800;color:#5B4332;background:#F7F3EA;border:1px solid rgba(216,174,99,.12);border-radius:999px;padding:6px 10px}.invest-row-actions{display:flex;gap:7px;flex-wrap:wrap}.invest-row-actions button{height:34px;border-radius:11px;border:1px solid rgba(216,174,99,.16);background:#FFFDFC;color:#5B4332;padding:0 10px;font:900 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:6px;cursor:pointer}.invest-row-actions button:hover{background:rgba(216,174,99,.09);color:#9A6C3C}.invest-row-actions button.danger:hover{background:rgba(185,28,28,.08);color:#B91C1C}
        .invest-overlay{position:fixed;inset:0;z-index:80;background:rgba(17,17,17,.42);backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:18px}.invest-modal{width:min(720px,100%);max-height:92vh;overflow:auto;background:#FFFDFC;border:1px solid rgba(216,174,99,.18);border-radius:26px;box-shadow:0 28px 90px rgba(45,26,10,.3)}.invest-modal-head{position:sticky;top:0;background:rgba(255,253,252,.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(216,174,99,.12);padding:18px 20px;display:flex;justify-content:space-between;align-items:center}.invest-modal-head h2{margin:0;font-size:21px}.invest-icon-btn{width:38px;height:38px;border-radius:12px;border:1px solid rgba(216,174,99,.18);background:#FFFDFC;color:#5B4332;display:grid;place-items:center;cursor:pointer}.invest-form{padding:20px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.invest-field{display:grid;gap:7px}.invest-field>span{font-size:12px;font-weight:900;color:#5B4332}.invest-field b{color:#B91C1C;margin-inline-start:3px}.invest-field textarea{height:auto;min-height:88px;padding-top:12px;resize:vertical}.invest-field small{font-size:11px;color:#B91C1C;font-weight:800}.span-2{grid-column:1/-1}.invest-form-actions{display:flex;justify-content:flex-end;gap:10px}.invest-form-actions.center{justify-content:center}
        .invest-confirm{position:relative;width:min(430px,100%);background:#FFFDFC;border-radius:24px;border:1px solid rgba(216,174,99,.18);box-shadow:0 24px 75px rgba(45,26,10,.28);padding:26px;text-align:center}.invest-close{position:absolute;top:14px;inset-inline-end:14px}.invest-confirm-icon{width:62px;height:62px;margin:0 auto 12px;border-radius:20px;background:rgba(185,28,28,.08);color:#B91C1C;display:grid;place-items:center}.invest-confirm h3{margin:0 0 8px}.invest-confirm p{margin:0 0 18px;color:#5B4332;line-height:1.8;font-weight:800}
        .invest-drawer{width:min(460px,100%);max-height:92vh;overflow:auto;background:#FFFDFC;border:1px solid rgba(216,174,99,.18);border-radius:24px;padding:20px;box-shadow:0 28px 90px rgba(45,26,10,.3)}.invest-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.invest-drawer-title{display:flex;align-items:center;gap:12px}.invest-drawer-title>span{width:42px;height:42px;border-radius:14px;background:rgba(216,174,99,.12);color:#D8AE63;display:grid;place-items:center}.invest-drawer-title p{margin:0 0 4px;color:#9A6C3C;font-size:12px;font-weight:900}.invest-drawer-title h3{margin:0;font-size:19px}.invest-detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.invest-detail-grid div,.invest-notes-box{background:#F7F3EA;border:1px solid rgba(216,174,99,.12);border-radius:15px;padding:12px}.invest-detail-grid span,.invest-notes-box strong{display:block;color:#9A6C3C;font-size:11px;font-weight:900;margin-bottom:6px}.invest-detail-grid strong,.invest-notes-box p{margin:0;color:#111;font-size:13px;font-weight:800;line-height:1.7}.invest-notes-box{margin-top:10px}
        .invest-toast{position:fixed;z-index:100;inset-inline-end:22px;bottom:22px;background:#111;color:#D8AE63;border:1px solid rgba(216,174,99,.28);border-radius:16px;padding:13px 16px;font:900 13px Tajawal,Arial,sans-serif;box-shadow:0 18px 45px rgba(45,26,10,.2)}.invest-notice{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#B91C1C;border-radius:15px;padding:12px 14px;margin-bottom:14px;font-weight:800}.invest-loading{padding:34px;text-align:center;color:#9A6C3C;font-weight:900}
        @keyframes pulse{50%{opacity:.45}}@media(max-width:1024px){.invest-main{margin-inline-start:0}}@media(max-width:760px){.invest-main{padding:14px}.invest-hero{display:grid;padding:22px}.invest-hero h2{font-size:28px}.invest-hero-total{min-width:0}.invest-controls{grid-template-columns:1fr}.invest-form{grid-template-columns:1fr}.span-2{grid-column:auto}.invest-row-main{display:grid}.invest-row-main strong{white-space:normal}.invest-row-actions button{flex:1}.invest-detail-grid{grid-template-columns:1fr}.invest-overlay{align-items:flex-end;padding:0}.invest-modal,.invest-drawer{border-radius:24px 24px 0 0;max-height:95vh}.invest-confirm{margin:16px}}
      `}</style>
    </div>
  );
}

