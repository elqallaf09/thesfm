'use client';

import { useState } from 'react';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { t, dir } = useLanguage();
  const [newPass, setNewPass]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 8) {
      setError(t('settings_pass_short'));
      return;
    }
    if (newPass !== confirmPass) {
      setError(t('settings_pass_mismatch'));
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
      if (updateError) {
        setError(t('settings_pass_error'));
      } else {
        setSuccess(true);
        window.setTimeout(onClose, 2000);
      }
    } catch {
      setError(t('settings_pass_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mbackdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mbox" dir={dir} role="dialog" aria-modal="true" aria-labelledby="cp-title">
        <button className="mclose" onClick={onClose} aria-label="Close"><X size={17} /></button>

        <div className="micon"><KeyRound size={24} /></div>
        <h3 className="mtitle" id="cp-title">{t('settings_change_password')}</h3>

        {success ? (
          <div className="msuccess">{t('settings_pass_changed')}</div>
        ) : (
          <form onSubmit={handleSubmit} className="mform">
            <div className="mfield">
              <label>{t('settings_new_pass')}</label>
              <div className="minput-wrap">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="meye"
                  onClick={() => setShowNew(v => !v)}
                  aria-label="toggle visibility"
                >
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="mfield">
              <label>{t('settings_confirm_pass')}</label>
              <div className="minput-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="meye"
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label="toggle visibility"
                >
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && <p className="merror">{error}</p>}

            <div className="mactions">
              <button type="button" className="mbtn-cancel" onClick={onClose}>
                {t('settings_cancel')}
              </button>
              <button type="submit" className="mbtn-confirm" disabled={loading}>
                {loading ? '...' : t('settings_confirm')}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx global>{`
        .mbackdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 6, 3, 0.55);
          backdrop-filter: blur(4px);
          display: grid;
          place-items: center;
          z-index: 9999;
          padding: 16px;
        }
        .mbox {
          background: #fffdf8;
          border: 1px solid rgba(190, 149, 82, 0.25);
          border-radius: 24px;
          padding: 28px 24px 22px;
          width: 100%;
          max-width: 400px;
          position: relative;
          box-shadow: 0 32px 80px rgba(43, 26, 13, 0.22);
        }
        .mbox.mbox-danger {
          border-color: #f0c0b8;
          background: #fffaf9;
        }
        .mclose {
          position: absolute;
          top: 14px;
          inset-inline-end: 14px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid rgba(190, 149, 82, 0.25);
          background: #fffaf1;
          color: #7a6148;
          cursor: pointer;
          display: grid;
          place-items: center;
        }
        .mclose:hover { background: #f5e8d0; }
        .micon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: rgba(216, 174, 99, 0.14);
          display: grid;
          place-items: center;
          color: #c99b4f;
          margin: 0 auto 14px;
        }
        .micon-danger {
          background: rgba(220, 60, 40, 0.1);
          color: #b93d2d;
        }
        .mtitle {
          font-size: 18px;
          font-weight: 900;
          text-align: center;
          margin: 0 0 20px;
          color: #1d1207;
        }
        .mform { display: flex; flex-direction: column; gap: 12px; }
        .mfield { display: flex; flex-direction: column; gap: 6px; }
        .mfield label { font-size: 12px; font-weight: 900; color: #6c5842; }
        .minput-wrap { position: relative; }
        .minput-wrap input {
          width: 100%;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(190, 149, 82, 0.3);
          background: #fffaf1;
          padding: 0 40px 0 12px;
          font: 700 14px Tajawal, Arial, sans-serif;
          color: #18120d;
          outline: none;
          box-sizing: border-box;
        }
        :global([dir='rtl']) .minput-wrap input { padding: 0 12px 0 40px; }
        .minput-wrap input:focus { border-color: #c99b4f; box-shadow: 0 0 0 3px rgba(216,174,99,.15); }
        .meye {
          position: absolute;
          top: 50%;
          inset-inline-end: 11px;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #8a7764;
          display: grid;
          place-items: center;
          padding: 0;
        }
        .merror {
          font-size: 12px;
          color: #b93d2d;
          background: #fff0ee;
          border-radius: 8px;
          padding: 8px 10px;
          margin: 0;
        }
        .msuccess {
          font-size: 14px;
          font-weight: 800;
          color: #1a6e3c;
          background: #edfaf4;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        .mactions {
          display: flex;
          gap: 10px;
          margin-top: 6px;
        }
        .mactions-center { justify-content: center; }
        .mbtn-cancel {
          flex: 1;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(190,149,82,.28);
          background: #fffaf1;
          color: #5c4228;
          font: 800 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }
        .mbtn-cancel:hover { background: #f5e8d0; }
        .mbtn-confirm {
          flex: 1;
          height: 42px;
          border-radius: 12px;
          border: 0;
          background: linear-gradient(135deg, #d8ae63, #b88935);
          color: #1d1207;
          font: 800 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(184,137,53,.22);
        }
        .mbtn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
        .mbtn-delete {
          flex: 1;
          height: 42px;
          border-radius: 12px;
          border: 1px solid #e8b4aa;
          background: #ffecea;
          color: #9c2f1d;
          font: 800 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .mbtn-delete:disabled { opacity: 0.45; cursor: not-allowed; }
        .mbtn-delete:not(:disabled):hover { background: #ffdad6; }
        .mbody {
          font-size: 13px;
          line-height: 1.7;
          color: #5c4228;
          text-align: center;
          margin: 0 0 16px;
        }
        .mbody-danger { color: #7a3020; }
        .mwarn {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          background: #fff3ed;
          border: 1px solid #f0c7bf;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 14px;
          color: #8d2d1e;
          font-size: 12.5px;
          line-height: 1.6;
        }
        .mwarn svg { flex-shrink: 0; margin-top: 1px; }
        .munder-dev {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 18px 0 10px;
          color: #8a7764;
        }
        .mbadge {
          background: #f5e8cf;
          color: #7a5c28;
          border-radius: 999px;
          padding: 4px 14px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.03em;
        }
        .mdanger-input {
          width: 100%;
          height: 42px;
          border-radius: 12px;
          border: 1.5px solid #e8b4aa;
          background: #fff8f7;
          padding: 0 12px;
          font: 700 14px Tajawal, Arial, sans-serif;
          color: #18120d;
          outline: none;
          box-sizing: border-box;
        }
        .mdanger-input:focus { border-color: #c0433a; box-shadow: 0 0 0 3px rgba(192,67,58,.12); }
        .mdanger-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .mdanger-label { font-size: 12px; font-weight: 900; color: #8d2d1e; }
      `}</style>
    </div>
  );
}
