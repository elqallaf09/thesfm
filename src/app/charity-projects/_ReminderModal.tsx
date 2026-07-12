'use client';
import { X } from 'lucide-react';
import { AccessibleDialog } from './_AccessibleDialog';
import type { Lang } from './_types';
import type { ReminderType, ReminderPriority, CharityProject, ZakatAsset, Commitment } from './_types';
import { estimatedHijriDate } from './_utils';

interface ReminderModalProps {
  open: boolean;
  onClose: () => void;
  tr: Record<string, string>;
  lang: string;
  reminderForm: {
    title: string;
    reminder_type: ReminderType;
    due_date: string;
    remind_before_days: string;
    priority: ReminderPriority;
    related_project_id: string;
    related_zakat_asset_id: string;
    related_commitment_id: string;
    notes: string;
  };
  setReminderForm: React.Dispatch<React.SetStateAction<ReminderModalProps['reminderForm']>>;
  projects: CharityProject[];
  assets: ZakatAsset[];
  commitments: Commitment[];
  saving: boolean;
  saveReminder: () => void;
  resetReminderForm: () => void;
  reminderTypeLabel: (type: ReminderType) => string;
  reminderTypes: ReminderType[];
  reminderPriorities: ReminderPriority[];
}

export function ReminderModal({
  open, onClose, tr, lang, reminderForm, setReminderForm,
  projects, assets, commitments, saving, saveReminder, resetReminderForm,
  reminderTypeLabel, reminderTypes, reminderPriorities,
}: ReminderModalProps) {
  if (!open) return null;
  const close = () => { onClose(); resetReminderForm(); };
  const titleId = 'charity-reminder-modal-title';
  return (
    <AccessibleDialog labelledBy={titleId} onClose={close}>
        <div className="modal-head">
          <div>
            <span className="modal-kicker">{tr.upcomingReminders}</span>
            <h2 id={titleId}>{tr.addReminder}</h2>
          </div>
          <button type="button" aria-label={tr.cancel} onClick={close}><X size={18} /></button>
        </div>
        <div className="modal-form-stack">
          <section className="form-section">
            <h3>{tr.reminderDetails}</h3>
            <div className="form-grid">
              <label className="wide">
                <span>{tr.reminderTitle}</span>
                <input value={reminderForm.title} onChange={e => setReminderForm(prev => ({ ...prev, title: e.target.value }))} />
              </label>
              <label>
                <span>{tr.reminderType}</span>
                <select value={reminderForm.reminder_type} onChange={e => setReminderForm(prev => ({ ...prev, reminder_type: e.target.value as ReminderType }))}>
                  {reminderTypes.map(type => <option key={type} value={type}>{reminderTypeLabel(type)}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.priority}</span>
                <select value={reminderForm.priority} onChange={e => setReminderForm(prev => ({ ...prev, priority: e.target.value as ReminderPriority }))}>
                  {reminderPriorities.map(priority => <option key={priority} value={priority}>{tr[priority]}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.dueDate}</span>
                <input type="date" value={reminderForm.due_date} onChange={e => setReminderForm(prev => ({ ...prev, due_date: e.target.value }))} />
              </label>
              <label>
                <span>{tr.remindBefore}</span>
                <input inputMode="numeric" value={reminderForm.remind_before_days} onChange={e => setReminderForm(prev => ({ ...prev, remind_before_days: e.target.value }))} />
              </label>
              <label className="wide">
                <span>{tr.hijriDate}</span>
                <input value={estimatedHijriDate(reminderForm.due_date, lang as Lang) || tr.hijriEstimated} readOnly />
              </label>
            </div>
          </section>
          <section className="form-section">
            <h3>{tr.reminderLinks}</h3>
            <div className="form-grid">
              <label>
                <span>{tr.linkProject}</span>
                <select value={reminderForm.related_project_id} onChange={e => setReminderForm(prev => ({ ...prev, related_project_id: e.target.value }))}>
                  <option value="">-</option>
                  {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              {reminderTypes.some(type => type === 'zakat' || type === 'hawl') && (
                <label>
                  <span>{tr.linkZakatAsset}</span>
                  <select value={reminderForm.related_zakat_asset_id} onChange={e => setReminderForm(prev => ({ ...prev, related_zakat_asset_id: e.target.value }))}>
                    <option value="">-</option>
                    {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.asset_name}</option>)}
                  </select>
                </label>
              )}
              <label>
                <span>{tr.linkCommitment}</span>
                <select value={reminderForm.related_commitment_id} onChange={e => setReminderForm(prev => ({ ...prev, related_commitment_id: e.target.value }))}>
                  <option value="">-</option>
                  {commitments.map(commitment => <option key={commitment.id} value={commitment.id}>{commitment.name}</option>)}
                </select>
              </label>
              <label className="wide">
                <span>{tr.notes}</span>
                <textarea value={reminderForm.notes} onChange={e => setReminderForm(prev => ({ ...prev, notes: e.target.value }))} />
              </label>
            </div>
          </section>
          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={close}>{tr.cancel}</button>
            <button type="button" className="gold-btn" disabled={saving} onClick={saveReminder}>{tr.addReminder}</button>
          </div>
        </div>
    </AccessibleDialog>
  );
}
