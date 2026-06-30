'use client';
import { X } from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import type { Lang, ContributorRole, PaymentStatus, CharityProject } from './_types';

interface ContributorModalProps {
  open: boolean;
  onClose: () => void;
  tr: Record<string, string>;
  lang: string;
  contributorForm: {
    project_id: string;
    contributor_name: string;
    contributor_email: string;
    role: ContributorRole;
    payment_status: PaymentStatus;
    pledged_amount: string;
    paid_amount: string;
    currency: string;
    due_date: string;
    notes: string;
  };
  setContributorForm: React.Dispatch<React.SetStateAction<ContributorModalProps['contributorForm']>>;
  projects: CharityProject[];
  saving: boolean;
  saveContributor: () => void;
  resetContributorForm: () => void;
  contributorRoles: ContributorRole[];
  paymentStatuses: PaymentStatus[];
}

export function ContributorModal({
  open, onClose, tr, lang, contributorForm, setContributorForm,
  projects, saving, saveContributor, resetContributorForm,
  contributorRoles, paymentStatuses,
}: ContributorModalProps) {
  if (!open) return null;
  const close = () => { onClose(); resetContributorForm(); };
  const titleId = 'charity-contributor-modal-title';
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <div>
            <span className="modal-kicker">{tr.contributors}</span>
            <h2 id={titleId}>{tr.addContributor}</h2>
          </div>
          <button type="button" aria-label={tr.cancel} onClick={close}><X size={18} /></button>
        </div>
        <div className="modal-form-stack">
          <section className="form-section">
            <h3>{tr.contributorDetails}</h3>
            <div className="form-grid">
              <label className="wide"><span>{tr.linkedProject}</span><select value={contributorForm.project_id} onChange={e => setContributorForm(prev => ({ ...prev, project_id: e.target.value }))}><option value="">-</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label><span>{tr.contributorName}</span><input value={contributorForm.contributor_name} onChange={e => setContributorForm(prev => ({ ...prev, contributor_name: e.target.value }))} /></label>
              <label><span>{tr.emailOptional}</span><input type="email" value={contributorForm.contributor_email} onChange={e => setContributorForm(prev => ({ ...prev, contributor_email: e.target.value }))} /></label>
              <label><span>{tr.role}</span><select value={contributorForm.role} onChange={e => setContributorForm(prev => ({ ...prev, role: e.target.value as ContributorRole }))}>{contributorRoles.map(role => <option key={role} value={role}>{tr[role]}</option>)}</select></label>
            </div>
          </section>
          <section className="form-section">
            <h3>{tr.contributionDetails}</h3>
            <div className="form-grid">
              <label><span>{tr.paymentStatus}</span><select value={contributorForm.payment_status} onChange={e => setContributorForm(prev => ({ ...prev, payment_status: e.target.value as PaymentStatus }))}>{paymentStatuses.map(status => <option key={status} value={status}>{tr[status]}</option>)}</select></label>
              <label><span>{tr.pledgedAmount}</span><input inputMode="decimal" value={contributorForm.pledged_amount} onChange={e => setContributorForm(prev => ({ ...prev, pledged_amount: e.target.value }))} /></label>
              <label><span>{tr.paidAmount}</span><input inputMode="decimal" value={contributorForm.paid_amount} onChange={e => setContributorForm(prev => ({ ...prev, paid_amount: e.target.value }))} /></label>
              <div className="currency-field"><CurrencySelect value={contributorForm.currency || 'KWD'} onChange={value => setContributorForm(prev => ({ ...prev, currency: value }))} lang={lang as Lang} label={tr.currency} ariaLabel={tr.currency} /></div>
              <label><span>{tr.dueDate}</span><input type="date" value={contributorForm.due_date} onChange={e => setContributorForm(prev => ({ ...prev, due_date: e.target.value }))} /></label>
              <label className="wide"><span>{tr.notes}</span><textarea value={contributorForm.notes} onChange={e => setContributorForm(prev => ({ ...prev, notes: e.target.value }))} /></label>
              <p className="privacy-note wide">{tr.invitationsSoon}</p>
            </div>
          </section>
          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={close}>{tr.cancel}</button>
            <button type="button" className="gold-btn" disabled={saving} onClick={saveContributor}>{tr.addContributor}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
