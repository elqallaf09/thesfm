'use client';

import { Trash2, X } from 'lucide-react';
import { useId } from 'react';
import type { Investment } from '@/types/investment';

interface Props {
  open: boolean;
  investment: Investment | null;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  open,
  investment,
  title,
  message,
  cancelLabel,
  confirmLabel,
  deleting,
  onCancel,
  onConfirm,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  if (!open || !investment) return null;

  return (
    <div className="invest-overlay" role="presentation" onMouseDown={onCancel}>
      <div className="invest-confirm" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onMouseDown={event => event.stopPropagation()}>
        <button type="button" className="invest-icon-btn invest-close" onClick={onCancel} aria-label={cancelLabel}>
          <X size={18} />
        </button>
        <div className="invest-confirm-icon">
          <Trash2 size={25} />
        </div>
        <h3 id={titleId}>{title}</h3>
        <p id={descriptionId}>{message.replace('{name}', investment.name)}</p>
        <div className="invest-form-actions center">
          <button type="button" className="invest-secondary-btn" onClick={onCancel} disabled={deleting}>
            {cancelLabel}
          </button>
          <button type="button" className="invest-danger-btn" onClick={onConfirm} disabled={deleting}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

