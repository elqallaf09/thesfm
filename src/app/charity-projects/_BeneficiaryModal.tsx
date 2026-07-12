'use client';
import { X } from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { AccessibleDialog } from './_AccessibleDialog';
import type { Lang, BeneficiaryCategory, BeneficiaryStatus, CharityProject, CharityDocument, CharityBeneficiary } from './_types';

interface BeneficiaryModalProps {
  open: boolean;
  onClose: () => void;
  tr: Record<string, string>;
  lang: string;
  beneficiaryForm: {
    display_name: string;
    reference_code: string;
    category: BeneficiaryCategory;
    project_id: string;
    organization_name: string;
    country: string;
    city: string;
    monthly_support_amount: string;
    currency: string;
    sponsorship_start_date: string;
    sponsorship_end_date: string;
    next_renewal_date: string;
    status: BeneficiaryStatus;
    notes: string;
  };
  setBeneficiaryForm: React.Dispatch<React.SetStateAction<BeneficiaryModalProps['beneficiaryForm']>>;
  projects: CharityProject[];
  documents: CharityDocument[];
  saving: boolean;
  saveBeneficiary: () => void;
  resetBeneficiaryForm: () => void;
  beneficiaryDetails: CharityBeneficiary | null;
  setBeneficiaryDetails: (b: CharityBeneficiary | null) => void;
  money: (amount: number, currency: string) => string;
  toNum: (v: string | number | null | undefined) => number;
  dateLabel: (date: string | null | undefined) => string;
  beneficiaryCategories: BeneficiaryCategory[];
  beneficiaryStatuses: BeneficiaryStatus[];
}

export function BeneficiaryModal({
  open, onClose, tr, lang, beneficiaryForm, setBeneficiaryForm,
  projects, saving, saveBeneficiary, resetBeneficiaryForm,
  beneficiaryCategories, beneficiaryStatuses,
}: BeneficiaryModalProps) {
  if (!open) return null;
  const close = () => { onClose(); resetBeneficiaryForm(); };
  const titleId = 'charity-beneficiary-modal-title';
  return (
    <AccessibleDialog labelledBy={titleId} onClose={close}>
        <div className="modal-head">
          <div>
            <span className="modal-kicker">{tr.beneficiaryTracking}</span>
            <h2 id={titleId}>{tr.addBeneficiary}</h2>
          </div>
          <button type="button" aria-label={tr.cancel} onClick={close}><X size={18} /></button>
        </div>
        <div className="modal-form-stack">
          <section className="form-section">
            <h3>{tr.beneficiaryIdentity}</h3>
            <div className="form-grid">
              <label><span>{tr.shortName}</span><input value={beneficiaryForm.display_name} onChange={e => setBeneficiaryForm(prev => ({ ...prev, display_name: e.target.value }))} /></label>
              <label><span>{tr.referenceNumber}</span><input value={beneficiaryForm.reference_code} onChange={e => setBeneficiaryForm(prev => ({ ...prev, reference_code: e.target.value }))} /></label>
              <label><span>{tr.beneficiaryType}</span><select value={beneficiaryForm.category} onChange={e => setBeneficiaryForm(prev => ({ ...prev, category: e.target.value as BeneficiaryCategory }))}>{beneficiaryCategories.map(category => <option key={category} value={category}>{tr[category]}</option>)}</select></label>
              <label><span>{tr.status}</span><select value={beneficiaryForm.status} onChange={e => setBeneficiaryForm(prev => ({ ...prev, status: e.target.value as BeneficiaryStatus }))}>{beneficiaryStatuses.map(status => <option key={status} value={status}>{tr[status]}</option>)}</select></label>
              <p className="privacy-note wide">{tr.privacyNote}</p>
            </div>
          </section>
          <section className="form-section">
            <h3>{tr.sponsorshipDetails}</h3>
            <div className="form-grid">
              <label><span>{tr.linkedProject}</span><select value={beneficiaryForm.project_id} onChange={e => setBeneficiaryForm(prev => ({ ...prev, project_id: e.target.value }))}><option value="">-</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label><span>{tr.responsibleOrg}</span><input value={beneficiaryForm.organization_name} onChange={e => setBeneficiaryForm(prev => ({ ...prev, organization_name: e.target.value }))} /></label>
              <label><span>{tr.monthlySupport}</span><input inputMode="decimal" value={beneficiaryForm.monthly_support_amount} onChange={e => setBeneficiaryForm(prev => ({ ...prev, monthly_support_amount: e.target.value }))} /></label>
              <div className="currency-field"><CurrencySelect value={beneficiaryForm.currency || 'KWD'} onChange={value => setBeneficiaryForm(prev => ({ ...prev, currency: value }))} lang={lang as Lang} label={tr.currency} ariaLabel={tr.currency} /></div>
              <label><span>{tr.sponsorshipStart}</span><input type="date" value={beneficiaryForm.sponsorship_start_date} onChange={e => setBeneficiaryForm(prev => ({ ...prev, sponsorship_start_date: e.target.value }))} /></label>
              <label><span>{tr.sponsorshipEnd}</span><input type="date" value={beneficiaryForm.sponsorship_end_date} onChange={e => setBeneficiaryForm(prev => ({ ...prev, sponsorship_end_date: e.target.value }))} /></label>
              <label><span>{tr.nextRenewal}</span><input type="date" value={beneficiaryForm.next_renewal_date} onChange={e => setBeneficiaryForm(prev => ({ ...prev, next_renewal_date: e.target.value }))} /></label>
            </div>
          </section>
          <section className="form-section">
            <h3>{tr.additionalDetails}</h3>
            <div className="form-grid">
              <label><span>{tr.country}</span><input value={beneficiaryForm.country} onChange={e => setBeneficiaryForm(prev => ({ ...prev, country: e.target.value }))} /></label>
              <label><span>{tr.city}</span><input value={beneficiaryForm.city} onChange={e => setBeneficiaryForm(prev => ({ ...prev, city: e.target.value }))} /></label>
              <label className="wide"><span>{tr.notes}</span><textarea value={beneficiaryForm.notes} onChange={e => setBeneficiaryForm(prev => ({ ...prev, notes: e.target.value }))} /></label>
            </div>
          </section>
          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={close}>{tr.cancel}</button>
            <button type="button" className="gold-btn" disabled={saving} onClick={saveBeneficiary}>{tr.addBeneficiary}</button>
          </div>
        </div>
    </AccessibleDialog>
  );
}

export function BeneficiaryDetailsModal({
  beneficiaryDetails, setBeneficiaryDetails, tr, projects, documents, money, toNum, dateLabel,
}: {
  beneficiaryDetails: CharityBeneficiary | null;
  setBeneficiaryDetails: (b: CharityBeneficiary | null) => void;
  tr: Record<string, string>;
  projects: CharityProject[];
  documents: CharityDocument[];
  money: (amount: number, currency: string) => string;
  toNum: (v: string | number | null | undefined) => number;
  dateLabel: (date: string | null | undefined) => string;
}) {
  if (!beneficiaryDetails) return null;
  const titleId = 'charity-beneficiary-details-title';
  const close = () => setBeneficiaryDetails(null);
  return (
    <AccessibleDialog className="modal small" labelledBy={titleId} onClose={close}>
        <div className="modal-head">
          <div>
            <span className="modal-kicker">{tr.beneficiaryIdentity}</span>
            <h2 id={titleId}>{beneficiaryDetails.display_name}</h2>
          </div>
          <button type="button" aria-label={tr.cancel} onClick={close}><X size={18} /></button>
        </div>
        <div className="details-list">
          <p><b>{tr.referenceNumber}</b><span>{beneficiaryDetails.reference_code || '-'}</span></p>
          <p><b>{tr.beneficiaryType}</b><span>{tr[beneficiaryDetails.category]}</span></p>
          <p><b>{tr.linkedProject}</b><span>{projects.find(project => project.id === beneficiaryDetails.project_id)?.name || '-'}</span></p>
          <p><b>{tr.monthlySupport}</b><span>{money(toNum(beneficiaryDetails.monthly_support_amount), beneficiaryDetails.currency)}</span></p>
          <p><b>{tr.sponsorshipStart}</b><span>{dateLabel(beneficiaryDetails.sponsorship_start_date)}</span></p>
          <p><b>{tr.sponsorshipEnd}</b><span>{dateLabel(beneficiaryDetails.sponsorship_end_date)}</span></p>
          <p><b>{tr.nextRenewal}</b><span>{dateLabel(beneficiaryDetails.next_renewal_date)}</span></p>
          <p><b>{tr.linkedDocuments}</b><span>{documents.filter(document => document.project_id && document.project_id === beneficiaryDetails.project_id).length}</span></p>
          {beneficiaryDetails.notes && <p><b>{tr.notes}</b><span>{beneficiaryDetails.notes}</span></p>}
        </div>
    </AccessibleDialog>
  );
}
