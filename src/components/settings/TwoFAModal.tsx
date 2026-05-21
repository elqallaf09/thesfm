'use client';

import { Construction, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface TwoFAModalProps {
  onClose: () => void;
}

export function TwoFAModal({ onClose }: TwoFAModalProps) {
  const { t, dir } = useLanguage();

  return (
    <div className="mbackdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mbox" dir={dir} role="dialog" aria-modal="true" aria-labelledby="tfa-title">
        <button className="mclose" onClick={onClose} aria-label="Close"><X size={17} /></button>

        <div className="micon"><ShieldCheck size={24} /></div>
        <h3 className="mtitle" id="tfa-title">{t('settings_2fa_title')}</h3>

        <div className="munder-dev">
          <Construction size={34} />
          <span className="mbadge">{t('settings_under_dev')}</span>
        </div>

        <p className="mbody">{t('settings_2fa_body')}</p>

        <div className="mactions mactions-center">
          <button type="button" className="mbtn-confirm" onClick={onClose}>
            {t('settings_close')}
          </button>
        </div>
      </div>

      {/* Relies on global CSS injected by DeleteAccountModal / ChangePasswordModal */}
      <style jsx global>{`
        .mbackdrop {
          position: fixed; inset: 0;
          background: rgba(10,6,3,.55);
          backdrop-filter: blur(4px);
          display: grid; place-items: center;
          z-index: 9999; padding: 16px;
        }
        .mbox {
          background: #fffdf8;
          border: 1px solid rgba(190,149,82,.25);
          border-radius: 24px; padding: 28px 24px 22px;
          width: 100%; max-width: 380px;
          position: relative;
          box-shadow: 0 32px 80px rgba(43,26,13,.22);
        }
        .mclose {
          position: absolute; top: 14px; inset-inline-end: 14px;
          width: 30px; height: 30px; border-radius: 50%;
          border: 1px solid rgba(190,149,82,.25);
          background: #fffaf1; color: #7a6148;
          cursor: pointer; display: grid; place-items: center;
        }
        .micon {
          width: 52px; height: 52px; border-radius: 16px;
          background: rgba(216,174,99,.14);
          display: grid; place-items: center; color: #c99b4f;
          margin: 0 auto 14px;
        }
        .mtitle { font-size: 18px; font-weight: 900; text-align: center; margin: 0 0 20px; color: #1d1207; }
        .munder-dev {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 18px 0 10px; color: #8a7764;
        }
        .mbadge {
          background: #f5e8cf; color: #7a5c28;
          border-radius: 999px; padding: 4px 14px;
          font-size: 11px; font-weight: 900; letter-spacing: .03em;
        }
        .mbody { font-size: 13px; line-height: 1.7; color: #5c4228; text-align: center; margin: 0 0 20px; }
        .mactions { display: flex; gap: 10px; }
        .mactions-center { justify-content: center; }
        .mbtn-confirm {
          min-width: 140px; height: 42px; border-radius: 12px; border: 0;
          background: linear-gradient(135deg,#d8ae63,#b88935);
          color: #1d1207;
          font: 800 13px Tajawal, Arial, sans-serif;
          cursor: pointer; box-shadow: 0 6px 18px rgba(184,137,53,.22);
        }
      `}</style>
    </div>
  );
}
