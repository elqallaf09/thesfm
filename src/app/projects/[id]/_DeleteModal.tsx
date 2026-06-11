'use client';

import { AppModal } from '@/components/ui/AppModal';
import type { DeleteTarget } from './_types';
import type { Translation } from './_text';

interface DeleteModalProps {
  deleteTarget: DeleteTarget;
  onClose: () => void;
  deleteError: string;
  deleteSaving: boolean;
  confirmDeleteTransaction: (deleteLinkedPersonal: boolean) => void;
  tr: Translation;
}

export function DeleteModal({
  deleteTarget, onClose, deleteError, deleteSaving,
  confirmDeleteTransaction, tr,
}: DeleteModalProps) {
  const hasLinked =
    (deleteTarget.type === 'income' && Boolean(deleteTarget.row.personal_income_id)) ||
    (deleteTarget.type === 'expense' && Boolean(deleteTarget.row.personal_expense_id));

  return (
    <AppModal
      open
      title={deleteTarget.type === 'income' ? tr.deleteProjectIncome : tr.deleteProjectExpense}
      subtitle={deleteTarget.type === 'income' ? tr.deleteProjectIncomeBody : tr.deleteProjectExpenseBody}
      closeLabel={tr.cancel}
      onClose={onClose}
      size="sm"
      className="delete-modal"
      footerClassName="modal-actions"
      footer={(
        <>
          <button type="button" className="secondary-action" onClick={onClose} disabled={deleteSaving}>{tr.cancel}</button>
          <button type="button" className="danger-action" onClick={() => confirmDeleteTransaction(false)} disabled={deleteSaving}>
            {tr.deleteFromProjectOnly}
          </button>
          {hasLinked ? (
            <button type="button" className="danger-action strong" onClick={() => confirmDeleteTransaction(true)} disabled={deleteSaving}>
              {tr.deleteFromBothProjectAndPersonalRecords}
            </button>
          ) : null}
        </>
      )}
    >
      {hasLinked ? (
        <p className="delete-linked-note">
          {deleteTarget.type === 'income' ? tr.linkedIncomeDeletePrompt : tr.linkedExpenseDeletePrompt}
        </p>
      ) : null}
      {deleteError ? <div className="modal-error" role="alert">{deleteError}</div> : null}
    </AppModal>
  );
}
