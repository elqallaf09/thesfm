'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const item: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
  padding: '8px 10px', borderRadius: '10px', border: 'none',
  background: 'transparent', fontSize: '13px', fontWeight: '600',
  color: '#111111', cursor: 'pointer', textAlign: 'start',
  fontFamily: 'Tajawal,Arial,sans-serif',
};

export function UserChip({ displayName }: { displayName?: string }) {
  const { user, isGuest, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const name = displayName
    || user?.email?.replace('@smart-finance.local', '')
    || (isGuest ? 'ضيف' : 'SFM');

  const initials = name
    .split(/\s+/)
    .map((w: string) => w[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || '??';

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push('/login');
  };

  return (
    <div style={{ position: 'relative', fontFamily: 'Tajawal,Arial,sans-serif' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '4px 10px 4px 4px',
          borderRadius: '20px',
          background: 'rgba(255,255,255,.08)',
          border: '1px solid rgba(216,174,99,.22)',
          cursor: 'pointer', color: '#D8AE63',
        }}
      >
        <div style={{
          width: '26px', height: '26px', borderRadius: '50%',
          background: 'linear-gradient(135deg,#D8AE63,#9A6C3C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: '800', color: '#111', flexShrink: 0,
        }}>{initials}</div>
        <span style={{ fontSize: '12px', fontWeight: '600', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        {isGuest && (
          <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '10px', background: 'rgba(216,174,99,.18)', color: '#D8AE63', whiteSpace: 'nowrap' }}>
            ضيف
          </span>
        )}
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,.4)', lineHeight: 1 }}>▾</span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', insetInlineEnd: 0,
            width: '180px', background: '#FFFDFC',
            borderRadius: '14px', border: '1px solid rgba(216,174,99,.18)',
            boxShadow: '0 8px 30px rgba(0,0,0,.12)', padding: '6px', zIndex: 50,
          }}>
            <button type="button" onClick={() => { router.push('/profile'); setOpen(false); }} style={item}>
              👤 الملف الشخصي
            </button>
            <button type="button" onClick={() => { router.push('/settings'); setOpen(false); }} style={item}>
              ⚙️ الإعدادات
            </button>
            <div style={{ height: '1px', background: 'rgba(216,174,99,.12)', margin: '4px 2px' }} />
            <button type="button" onClick={handleSignOut} style={{ ...item, color: '#ef4444' }}>
              ⤴ تسجيل الخروج
            </button>
          </div>
        </>
      )}
    </div>
  );
}
