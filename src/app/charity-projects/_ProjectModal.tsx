'use client';
import { X } from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import type { Lang } from './_types';
import type { ProjectCategory, ProjectStatus, CharityOrganization } from './_types';

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  tr: Record<string, string>;
  lang: string;
  projectForm: {
    name: string;
    category: ProjectCategory;
    status: ProjectStatus;
    target_amount: string;
    collected_amount: string;
    currency: string;
    start_date: string;
    end_date: string;
    organization_id: string;
    organization_name: string;
    notes: string;
  };
  setProjectForm: React.Dispatch<React.SetStateAction<ProjectModalProps['projectForm']>>;
  organizations: CharityOrganization[];
  organizationById: Record<string, CharityOrganization>;
  organizationName: (org: CharityOrganization | undefined) => string;
  verificationLabel: (status: string) => string;
  selectedOrganization: CharityOrganization | undefined;
  manualOrganization: boolean;
  setManualOrganization: (v: boolean) => void;
  saving: boolean;
  saveProject: () => void;
  categories: ProjectCategory[];
  statuses: ProjectStatus[];
}

export function ProjectModal({
  open, onClose, tr, lang, projectForm, setProjectForm,
  organizations, organizationById, organizationName, verificationLabel,
  selectedOrganization, manualOrganization, setManualOrganization,
  saving, saveProject, categories, statuses,
}: ProjectModalProps) {
  if (!open) return null;
  const titleId = 'charity-project-modal-title';
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal charity-project-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <div>
            <span className="modal-kicker">{tr.projectName}</span>
            <h2 id={titleId}>{tr.newProject}</h2>
          </div>
          <button type="button" aria-label={tr.cancel} onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <label className="wide"><span>{tr.projectName}</span><input value={projectForm.name} onChange={e => setProjectForm(prev => ({ ...prev, name: e.target.value }))} /></label>
          <label><span>{tr.category}</span><select value={projectForm.category} onChange={e => setProjectForm(prev => ({ ...prev, category: e.target.value as ProjectCategory }))}>{categories.map(category => <option key={category} value={category}>{tr[category]}</option>)}</select></label>
          <label><span>{tr.status}</span><select value={projectForm.status} onChange={e => setProjectForm(prev => ({ ...prev, status: e.target.value as ProjectStatus }))}>{statuses.map(status => <option key={status} value={status}>{tr[status]}</option>)}</select></label>
          <label><span>{tr.target}</span><input inputMode="decimal" value={projectForm.target_amount} onChange={e => setProjectForm(prev => ({ ...prev, target_amount: e.target.value }))} /></label>
          <label><span>{tr.collected}</span><input inputMode="decimal" value={projectForm.collected_amount} onChange={e => setProjectForm(prev => ({ ...prev, collected_amount: e.target.value }))} /></label>
          <div className="currency-field"><CurrencySelect value={projectForm.currency || 'KWD'} onChange={value => setProjectForm(prev => ({ ...prev, currency: value }))} lang={lang as Lang} label={tr.currency} ariaLabel={tr.currency} /></div>
          <label><span>{tr.startDate}</span><input type="date" value={projectForm.start_date} onChange={e => setProjectForm(prev => ({ ...prev, start_date: e.target.value }))} /></label>
          <label><span>{tr.endDate}</span><input type="date" value={projectForm.end_date} onChange={e => setProjectForm(prev => ({ ...prev, end_date: e.target.value }))} /></label>
          <label className="wide">
            <span>{tr.selectExecutingOrganization}</span>
            <select
              value={projectForm.organization_id}
              disabled={manualOrganization}
              onChange={e => {
                const organization = organizationById[e.target.value];
                setProjectForm(prev => ({ ...prev, organization_id: e.target.value, organization_name: organizationName(organization) }));
              }}
            >
              <option value="">-</option>
              {organizations.map(organization => (
                <option key={organization.id} value={organization.id}>
                  {organizationName(organization)} - {verificationLabel(organization.verification_status)}
                </option>
              ))}
            </select>
          </label>
          {selectedOrganization && selectedOrganization.verification_status !== 'verified' && (
            <p className="privacy-note wide">{tr.unverifiedOrganizationWarning}</p>
          )}
          <label className="check-row wide">
            <input type="checkbox" checked={manualOrganization} onChange={e => {
              setManualOrganization(e.target.checked);
              if (e.target.checked) setProjectForm(prev => ({ ...prev, organization_id: '' }));
            }} />
            <span>{tr.manualOrganizationEntry}</span>
          </label>
          {manualOrganization && (
            <label className="wide"><span>{tr.organization}</span><input value={projectForm.organization_name} onChange={e => setProjectForm(prev => ({ ...prev, organization_name: e.target.value }))} /></label>
          )}
          <label className="wide"><span>{tr.notes}</span><textarea value={projectForm.notes} onChange={e => setProjectForm(prev => ({ ...prev, notes: e.target.value }))} /></label>
          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>{tr.cancel}</button>
            <button type="button" className="gold-btn" disabled={saving} onClick={saveProject}>{tr.saveProject}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
