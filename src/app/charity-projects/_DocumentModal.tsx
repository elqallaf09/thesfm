'use client';
import { X, FileText } from 'lucide-react';
import { AccessibleDialog } from './_AccessibleDialog';
import type { DocumentCategory, CharityProject, ProjectDonation, ZakatAsset, Commitment } from './_types';

interface DocumentModalProps {
  open: boolean;
  onClose: () => void;
  tr: Record<string, string>;
  projects: CharityProject[];
  donations: ProjectDonation[];
  assets: ZakatAsset[];
  commitments: Commitment[];
  documentForm: {
    title: string;
    category: DocumentCategory;
    project_id: string;
    donation_id: string;
    zakat_asset_id: string;
    commitment_id: string;
    notes: string;
  };
  setDocumentForm: React.Dispatch<React.SetStateAction<DocumentModalProps['documentForm']>>;
  documentFile: File | null;
  setDocumentFile: (file: File | null) => void;
  uploadingDocument: boolean;
  uploadDocument: () => void;
  money: (amount: number, currency: string) => string;
  toNum: (v: string | number | null | undefined) => number;
  formatFileSize: (bytes: number) => string;
  documentCategories: DocumentCategory[];
}

export function DocumentModal({
  open, onClose, tr, projects, donations, assets, commitments,
  documentForm, setDocumentForm, documentFile, setDocumentFile,
  uploadingDocument, uploadDocument, money, toNum, formatFileSize, documentCategories,
}: DocumentModalProps) {
  if (!open) return null;
  const titleId = 'charity-document-modal-title';
  return (
    <AccessibleDialog labelledBy={titleId} onClose={onClose}>
        <div className="modal-head">
          <div>
            <span className="modal-kicker">{tr.documentVault}</span>
            <h2 id={titleId}>{tr.uploadDocument}</h2>
          </div>
          <button type="button" aria-label={tr.cancel} onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-form-stack">
          <section className="form-section">
            <h3>{tr.documentDetails}</h3>
            <div className="form-grid">
              <label className="wide">
                <span>{tr.documentTitle}</span>
                <input value={documentForm.title} onChange={e => setDocumentForm(prev => ({ ...prev, title: e.target.value }))} />
              </label>
              <label>
                <span>{tr.documentCategory}</span>
                <select value={documentForm.category} onChange={e => setDocumentForm(prev => ({ ...prev, category: e.target.value as DocumentCategory }))}>
                  {documentCategories.map(category => <option key={category} value={category}>{tr[category]}</option>)}
                </select>
              </label>
              <label className="wide">
                <span>{tr.chooseFile}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    setDocumentFile(file);
                    if (file && !documentForm.title.trim()) {
                      setDocumentForm(prev => ({ ...prev, title: file.name.replace(/\.[^.]+$/, '') }));
                    }
                  }}
                />
              </label>
              {documentFile && (
                <div className="file-chip wide">
                  <FileText size={16} />
                  <span>{documentFile.name}</span>
                  <small>{formatFileSize(documentFile.size)}</small>
                  <button type="button" onClick={() => setDocumentFile(null)} aria-label={tr.deleteDocument}><X size={14} /></button>
                </div>
              )}
            </div>
          </section>
          <section className="form-section">
            <h3>{tr.documentLinks}</h3>
            <div className="form-grid">
              <label>
                <span>{tr.linkProject}</span>
                <select value={documentForm.project_id} onChange={e => setDocumentForm(prev => ({ ...prev, project_id: e.target.value }))}>
                  <option value="">-</option>
                  {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.linkDonation}</span>
                <select value={documentForm.donation_id} onChange={e => setDocumentForm(prev => ({ ...prev, donation_id: e.target.value }))}>
                  <option value="">-</option>
                  {donations.map(donation => {
                    const projectName = projects.find(project => project.id === donation.project_id)?.name ?? tr.linkedDonations;
                    return <option key={donation.id} value={donation.id}>{projectName} - {money(toNum(donation.amount), donation.currency)}</option>;
                  })}
                </select>
              </label>
              <label>
                <span>{tr.linkZakatAsset}</span>
                <select value={documentForm.zakat_asset_id} onChange={e => setDocumentForm(prev => ({ ...prev, zakat_asset_id: e.target.value }))}>
                  <option value="">-</option>
                  {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.asset_name}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.linkCommitment}</span>
                <select value={documentForm.commitment_id} onChange={e => setDocumentForm(prev => ({ ...prev, commitment_id: e.target.value }))}>
                  <option value="">-</option>
                  {commitments.map(commitment => <option key={commitment.id} value={commitment.id}>{commitment.name}</option>)}
                </select>
              </label>
              <label className="wide">
                <span>{tr.notes}</span>
                <textarea value={documentForm.notes} onChange={e => setDocumentForm(prev => ({ ...prev, notes: e.target.value }))} />
              </label>
            </div>
          </section>
          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>{tr.cancel}</button>
            <button type="button" className="gold-btn" disabled={uploadingDocument} onClick={uploadDocument}>{tr.uploadDocument}</button>
          </div>
        </div>
    </AccessibleDialog>
  );
}
