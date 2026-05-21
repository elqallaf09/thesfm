'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import type { Lang } from '@/lib/translations';

interface DeleteAccountModalProps {
  userId: string;
  onClose: () => void;
}

/** Word the user must type to confirm deletion, per language */
const CONFIRM_WORD: Record<Lang, string> = {
  ar: 'احذف',
  en: 'delete',
  fr: 'supprimer',
};

export function DeleteAccountModal({ userId, onClose }: DeleteAccountModalProps) {
  const { t, dir, lang } = useLanguage();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  const confirmWord = CONFIRM_WORD[lang as Lang] ?? 'delete';
  const canDelete   = confirmText.trim().toLowerCase() === confirmWord.toLowerCase();

  const handleDelete = async () => {
    if (!canDelete || loading) return;
    setError('');
    setLoading(true);

    try {
      // 1. Delete all income sources for this user
      await supabase
        .from('monthly_income_sources')
        .delete()
        .eq('user_id', userId);

      // 2. Delete the user profile (cascades FK-linked data where configured)
      await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      // TODO: Full auth-record deletion requires a Supabase Edge Function with
      // service_role key (supabase.auth.admin.deleteUser). Profile + data are
      // removed here; the orphaned auth record will be unreachable (no profile →
      // app treats user as new on re-login).

      // 3. Clear local storage
      const LOCAL_KEYS = [
        'sfm_settings', 'sfm_lang', 'sfm_currency',
        'sfm_demo_expenses', 'sfm_demo_income',
        'sfm_demo_invest', 'sfm_demo_savings', 'sfm_demo_goals',
      ];
      LOCAL_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });

      // 4. Sign out — must come last
      await supabase.auth.signOut();

      // 5. Redirect to login
      router.replace('/');
    } catch {
      setError(t('settings_delete_error'));
      setLoading(false);
    }
  };

  return (
    <div className="mbackdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mbox mbox-danger" dir={dir} role="dialog" aria-modal="true" aria-labelledby="da-title">
        <button className="mclose" onClick={onClose} disabled={loading} aria-label="Close">
          <X size={17} />
        </button>

        <div className="micon micon-danger"><AlertTriangle size={24} /></div>
        <h3 className="mtitle" id="da-title">{t('settings_delete_account')}</h3>

        <div className="mwarn">
          <AlertTriangle size={16} />
          <p style={{ margin: 0 }}>{t('settings_delete_warning')}</p>
        </div>

        <div className="mdanger-field">
          <label className="mdanger-label">
            {t('settings_delete_type')}&nbsp;
            <strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              &ldquo;{confirmWord}&rdquo;
            </strong>
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            className="mdanger-input"
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
          />
        </div>

        {error && <p className="merror">{error}</p>}

        <div className="mactions">
          <button
            type="button"
            className="mbtn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            {t('settings_cancel')}
          </button>
          <button
            type="button"
            className="mbtn-delete"
            onClick={handleDelete}
            disabled={!canDelete || loading}
          >
            <Trash2 size={14} />
            {loading ? t('settings_deleting') : t('settings_delete_btn')}
          </button>
        </div>
      </div>

      {/* Shared modal CSS is injected by ChangePasswordModal; re-declare only
          the pieces that differ so there's no duplication at runtime. */}
      <style jsx global>{`
        /* Global modal base — safe to repeat (identical rules are deduplicated). */
        .mbackdrop {
          position: fixed; inset: 0;
          background: rgba(10, 6, 3, 0.55);
          backdrop-filter: blur(4px);
          display: grid; place-items: center;
          z-index: 9999; padding: 16px;
        }
        .mbox {
          background: #fffdf8;
          border: 1px solid rgba(190,149,82,.25);
          border-radius: 24px; padding: 28px 24px 22px;
          width: 100%; max-width: 420px;
          position: relative;
          box-shadow: 0 32px 80px rgba(43,26,13,.22);
        }
        .mbox.mbox-danger { border-color: #f0c0b8; background: #fffaf9; }
        .mclose {
          position: absolute; top: 14px; inset-inline-end: 14px;
          width: 30px; height: 30px; border-radius: 50%;
          border: 1px solid rgba(190,149,82,.25);
          background: #fffaf1; color: #7a6148;
          cursor: pointer; display: grid; place-items: center;
        }
        .mclose:disabled { opacity: .4; cursor: not-allowed; }
        .micon {
          width: 52px; height: 52px; border-radius: 16px;
          background: rgba(216,174,99,.14);
          display: grid; place-items: center; color: #c99b4f;
          margin: 0 auto 14px;
        }
        .micon-danger { background: rgba(220,60,40,.1); color: #b93d2d; }
        .mtitle { font-size: 18px; font-weight: 900; text-align: center; margin: 0 0 20px; color: #1d1207; }
        .mwarn {
          display: flex; gap: 10px; align-items: flex-start;
          background: #fff3ed; border: 1px solid #f0c7bf;
          border-radius: 12px; padding: 12px; margin-bottom: 14px;
          color: #8d2d1e; font-size: 12.5px; line-height: 1.6;
        }
        .mwarn svg { flex-shrink: 0; margin-top: 1px; }
        .merror {
          font-size: 12px; color: #b93d2d;
          background: #fff0ee; border-radius: 8px;
          padding: 8px 10px; margin: 0 0 10px;
        }
        .mactions { display: flex; gap: 10px; }
        .mactions-center { justify-content: center; }
        .mbtn-cancel {
          flex: 1; height: 42px; border-radius: 12px;
          border: 1px solid rgba(190,149,82,.28);
          background: #fffaf1; color: #5c4228;
          font: 800 13px Tajawal, Arial, sans-serif; cursor: pointer;
        }
        .mbtn-cancel:disabled { opacity: .4; cursor: not-allowed; }
        .mbtn-confirm {
          flex: 1; height: 42px; border-radius: 12px; border: 0;
          background: linear-gradient(135deg,#d8ae63,#b88935);
          color: #1d1207;
          font: 800 13px Tajawal, Arial, sans-serif;
          cursor: pointer; box-shadow: 0 6px 18px rgba(184,137,53,.22);
        }
        .mbtn-confirm:disabled { opacity: .5; cursor: not-allowed; }
        .mbtn-delete {
          flex: 1; height: 42px; border-radius: 12px;
          border: 1px solid #e8b4aa; background: #ffecea;
          color: #9c2f1d;
          font: 800 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        }
        .mbtn-delete:disabled { opacity: .45; cursor: not-allowed; }
        .mbtn-delete:not(:disabled):hover { background: #ffdad6; }
        .mform { display: flex; flex-direction: column; gap: 12px; }
        .mfield { display: flex; flex-direction: column; gap: 6px; }
        .mfield label { font-size: 12px; font-weight: 900; color: #6c5842; }
        .minput-wrap { position: relative; }
        .minput-wrap input {
          width: 100%; height: 42px; border-radius: 12px;
          border: 1px solid rgba(190,149,82,.3);
          background: #fffaf1;
          padding: 0 40px 0 12px;
          font: 700 14px Tajawal, Arial, sans-serif; color: #18120d;
          outline: none; box-sizing: border-box;
        }
        :global([dir='rtl']) .minput-wrap input { padding: 0 12px 0 40px; }
        .minput-wrap input:focus { border-color: #c99b4f; box-shadow: 0 0 0 3px rgba(216,174,99,.15); }
        .meye {
          position: absolute; top: 50%; inset-inline-end: 11px;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #8a7764; display: grid; place-items: center; padding: 0;
        }
        .msuccess {
          font-size: 14px; font-weight: 800; color: #1a6e3c;
          background: #edfaf4; border-radius: 12px;
          padding: 16px; text-align: center;
        }
        .mdanger-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .mdanger-label { font-size: 12px; font-weight: 900; color: #8d2d1e; }
        .mdanger-input {
          width: 100%; height: 42px; border-radius: 12px;
          border: 1.5px solid #e8b4aa; background: #fff8f7;
          padding: 0 12px;
          font: 700 14px Tajawal, Arial, sans-serif; color: #18120d;
          outline: none; box-sizing: border-box;
        }
        .mdanger-input:focus { border-color: #c0433a; box-shadow: 0 0 0 3px rgba(192,67,58,.12); }
        .mdanger-input:disabled { opacity: .6; }
        .munder-dev {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 18px 0 10px; color: #8a7764;
        }
        .mbadge {
          background: #f5e8cf; color: #7a5c28;
          border-radius: 999px; padding: 4px 14px;
          font-size: 11px; font-weight: 900; letter-spacing: .03em;
        }
        .mbody { font-size: 13px; line-height: 1.7; color: #5c4228; text-align: center; margin: 0 0 16px; }
      `}</style>
    </div>
  );
}
