import Image from 'next/image';
import { AlertTriangle, QrCode, Trash2 } from 'lucide-react';
import { normalizeDigits } from '@/lib/locale';
import { TEXT, type Lang, type TotpEnrollment, type TotpFactor } from './_content';

type SecurityModalsProps = {
  text: typeof TEXT[Lang];
  deleteOpen: boolean;
  deletePhrase: string;
  totpEnrollment: TotpEnrollment | null;
  disableTotpFactor: TotpFactor | null;
  mfaLoading: boolean;
  onCloseDelete: () => void;
  onDeletePhraseChange: (value: string) => void;
  onDeleteRequest: () => void;
  onCloseEnrollment: () => void;
  onEnrollmentChange: (update: (previous: TotpEnrollment) => TotpEnrollment) => void;
  onVerifyEnrollment: () => void;
  onCloseDisable: () => void;
  onDisableTotp: () => void;
};

export function SecurityModals({
  text,
  deleteOpen,
  deletePhrase,
  totpEnrollment,
  disableTotpFactor,
  mfaLoading,
  onCloseDelete,
  onDeletePhraseChange,
  onDeleteRequest,
  onCloseEnrollment,
  onEnrollmentChange,
  onVerifyEnrollment,
  onCloseDisable,
  onDisableTotp,
}: SecurityModalsProps) {
  return (
    <>
      {deleteOpen && (
        <div className="security-modal-overlay" role="presentation" onMouseDown={onCloseDelete}>
          <div className="security-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-icon danger"><Trash2 size={22} /></div>
            <h2 id="delete-account-title">{text.deleteModalTitle}</h2>
            <p>{text.deleteModalText}</p>
            <label>
              <span>{text.typePhrase}</span>
              <input value={deletePhrase} onChange={event => onDeletePhraseChange(event.target.value)} autoFocus />
            </label>
            <div className="modal-actions">
              <button type="button" className="ghost-action" onClick={onCloseDelete}>{text.cancel}</button>
              <button type="button" className="danger-action" disabled={deletePhrase !== text.deletePhrase} onClick={onDeleteRequest}>{text.confirmDelete}</button>
            </div>
          </div>
        </div>
      )}

      {totpEnrollment && (
        <div className="security-modal-overlay" role="presentation" onMouseDown={onCloseEnrollment}>
          <div className="security-modal mfa-modal" role="dialog" aria-modal="true" aria-labelledby="totp-enroll-title" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-icon"><QrCode size={22} /></div>
            <h2 id="totp-enroll-title">{text.setupAuthenticator}</h2>
            <p>{text.scanQr}</p>
            {totpEnrollment.qr && <Image className="totp-qr" src={totpEnrollment.qr} alt={text.setupAuthenticator} width={190} height={190} unoptimized />}
            {totpEnrollment.secret && (
              <div className="manual-secret">
                <span>{text.manualSecret}</span>
                <code>{totpEnrollment.secret}</code>
              </div>
            )}
            <label>
              <span>{text.enterAuthenticatorCode}</span>
              <input
                value={totpEnrollment.code}
                onChange={event => onEnrollmentChange(previous => ({
                  ...previous,
                  code: normalizeDigits(event.target.value).replace(/\D/g, '').slice(0, 6),
                  error: '',
                }))}
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                autoFocus
              />
            </label>
            {totpEnrollment.error && <div className="message-inline danger">{totpEnrollment.error}</div>}
            <div className="modal-actions">
              <button type="button" className="ghost-action" onClick={onCloseEnrollment} disabled={totpEnrollment.loading}>{text.cancel}</button>
              <button type="button" className="solid-action" onClick={onVerifyEnrollment} disabled={totpEnrollment.loading || totpEnrollment.code.length !== 6}>{totpEnrollment.loading ? text.enabling : text.verifyAndEnable}</button>
            </div>
          </div>
        </div>
      )}

      {disableTotpFactor && (
        <div className="security-modal-overlay" role="presentation" onMouseDown={onCloseDisable}>
          <div className="security-modal" role="dialog" aria-modal="true" aria-labelledby="disable-totp-title" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-icon danger"><AlertTriangle size={22} /></div>
            <h2 id="disable-totp-title">{text.disableMfaTitle}</h2>
            <p>{text.disableMfaText}</p>
            <div className="modal-actions">
              <button type="button" className="ghost-action" onClick={onCloseDisable} disabled={mfaLoading}>{text.cancel}</button>
              <button type="button" className="danger-action" onClick={onDisableTotp} disabled={mfaLoading}>{mfaLoading ? text.enabling : text.confirmDisable}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
