'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Home, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Sidebar } from '@/components/Sidebar';

type NoticeType = 'info' | 'warning' | 'success' | 'ai';

type Notice = {
  id: string;
  type: NoticeType;
  title: string;
  message: string | null;
  read: boolean | null;
  link: string | null;
  created_at: string | null;
};

const typeColor: Record<NoticeType, string> = {
  info: '#3B82F6',
  warning: '#F59E0B',
  success: '#22C55E',
  ai: '#D8AE63',
};

function groupLabel(date: string | null, isAr: boolean) {
  if (!date) return isAr ? 'بدون تاريخ' : 'No date';
  const now = new Date();
  const value = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((today - day) / 86400000);
  if (diff === 0) return isAr ? 'اليوم' : 'Today';
  if (diff === 1) return isAr ? 'أمس' : 'Yesterday';
  if (diff <= 7) return isAr ? 'هذا الأسبوع' : 'This week';
  return value.toLocaleDateString(isAr ? 'ar-KW' : 'en-US');
}

export function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { dir, isAr, t } = useLanguage();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setDataLoading(true);
      setError('');
      try {
        const { data, error: queryError } = await supabase
          .from('notifications')
          .select('id,type,title,message,read,link,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (queryError) throw queryError;
        if (!cancelled) setNotices((data ?? []) as Notice[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('error'));
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [t, user]);

  const groups = useMemo(() => {
    return notices.reduce<Record<string, Notice[]>>((acc, notice) => {
      const label = groupLabel(notice.created_at, isAr);
      acc[label] = [...(acc[label] ?? []), notice];
      return acc;
    }, {});
  }, [isAr, notices]);

  const unread = notices.filter(notice => !notice.read).length;

  async function markAsRead(id: string) {
    try {
      const { error: updateError } = await supabase.from('notifications').update({ read: true }).eq('id', id).select().single();
      if (updateError) throw updateError;
      setNotices(current => current.map(notice => notice.id === id ? { ...notice, read: true } : notice));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  async function remove(id: string) {
    try {
      const { error: deleteError } = await supabase.from('notifications').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setNotices(current => current.filter(notice => notice.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  if (loading) {
    return <div className="notif-shell" dir={dir}><div className="spinner" /><style>{styles}</style></div>;
  }

  return (
    <main className="notif-shell" dir={dir}>
      <Sidebar />
      <section className="notif-page">
        <header className="notif-header">
          <button className="back-btn" onClick={() => router.push('/')}>
            <Home size={17} />
            {t('nav_home')}
          </button>
          <div className="title">
            <span><Bell size={22} /></span>
            <div>
              <p>THE SFM</p>
              <h1>{t('nav_notif')}</h1>
            </div>
          </div>
          <LanguageSwitcher variant="gold" compact />
        </header>

        <section className="hero">
          <div>
            <span className="eyebrow">{isAr ? 'مركز التنبيهات' : 'Notification center'}</span>
            <h2>{isAr ? 'إشعاراتك المالية في مكان واحد' : 'Your financial notifications in one place'}</h2>
            <p>{isAr ? 'يتم عرض الإشعارات المحفوظة في قاعدة البيانات فقط.' : 'Only notifications saved in your database are shown.'}</p>
          </div>
          <div className="counter">
            <strong>{unread.toLocaleString(isAr ? 'ar-KW' : 'en-US')}</strong>
            <span>{isAr ? 'غير مقروءة' : 'Unread'}</span>
          </div>
        </section>

        {error && <div className="error">{error}</div>}

        <section className="list">
          <div className="list-head">
            <div>
              <p>{isAr ? 'قائمة الإشعارات' : 'Notification list'}</p>
              <h3>{t('nav_notif')}</h3>
            </div>
            {dataLoading && <span className="loading">{t('loading')}</span>}
          </div>

          {!dataLoading && notices.length === 0 ? (
            <div className="empty">
              <Bell size={42} />
              <strong>{isAr ? 'لا توجد إشعارات حالياً' : 'No notifications right now'}</strong>
            </div>
          ) : (
            Object.entries(groups).map(([label, items]) => (
              <div key={label} className="group">
                <h4>{label}</h4>
                {items.map(notice => (
                  <article key={notice.id} className={notice.read ? 'notice' : 'notice unread'}>
                    <div className="dot" style={{ background: typeColor[notice.type] ?? '#D8AE63' }} />
                    <div className="notice-body">
                      <div>
                        <strong>{notice.title}</strong>
                        <span>{notice.created_at ? new Date(notice.created_at).toLocaleString(isAr ? 'ar-KW' : 'en-US') : ''}</span>
                      </div>
                      {notice.message && <p>{notice.message}</p>}
                    </div>
                    <div className="notice-actions">
                      {!notice.read && (
                        <button onClick={() => markAsRead(notice.id)} aria-label="Mark as read">
                          <CheckCheck size={16} />
                        </button>
                      )}
                      <button onClick={() => remove(notice.id)} aria-label="Delete notification">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ))
          )}
        </section>
      </section>
      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .notif-shell{min-height:100vh;background:#F7F3EA;color:#111;font-family:Tajawal,Arial,sans-serif}
  .spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(216,174,99,.2);border-top-color:#D8AE63;animation:spin 1s linear infinite;margin:20vh auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  .notif-page{max-width:1180px;margin-inline-start:230px;padding:24px 20px 60px}
  .notif-header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:22px;flex-wrap:wrap}
  .back-btn,.notice-actions button{border:1.5px solid rgba(216,174,99,.22);background:#FFFDFC;color:#5B4332;border-radius:13px;height:40px;padding:0 14px;display:inline-flex;align-items:center;gap:8px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}
  .title{display:flex;align-items:center;gap:12px;flex:1;min-width:220px}.title>span{width:46px;height:46px;border-radius:15px;background:linear-gradient(135deg,#D8AE63,#9A6C3C);display:grid;place-items:center;color:#111}.title p{margin:0 0 3px;font-size:11px;color:#9A6C3C;font-weight:800}.title h1{margin:0;font-size:26px;font-weight:900}
  .hero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;background:linear-gradient(135deg,#111,#2B1A0D 62%,#D8AE63 140%);color:#FFFDFC;border-radius:24px;padding:28px;margin-bottom:18px;box-shadow:0 18px 45px rgba(45,26,10,.16)}
  .eyebrow{display:inline-flex;padding:4px 10px;border-radius:999px;background:rgba(216,174,99,.15);color:#D8AE63;font-size:11px;font-weight:900;margin-bottom:12px}.hero h2{margin:0 0 8px;font-size:31px}.hero p{margin:0;color:rgba(255,255,255,.68);line-height:1.8;max-width:640px}.counter{min-width:118px;text-align:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:16px}.counter strong{display:block;font-size:34px;color:#D8AE63}.counter span{font-size:12px;color:rgba(255,255,255,.62)}
  .list{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:22px;box-shadow:0 4px 22px rgba(90,67,51,.06);padding:18px}.list-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.list-head p{margin:0 0 3px;color:#9A6C3C;font-size:11px;font-weight:900}.list-head h3{margin:0;font-size:19px}.loading{color:#9A6C3C;font-size:12px;font-weight:900}
  .group h4{margin:18px 0 8px;color:#9A6C3C;font-size:13px}.notice{position:relative;display:flex;gap:12px;align-items:flex-start;border:1px solid rgba(216,174,99,.11);border-radius:17px;padding:15px;margin-top:10px;background:#FFFDFC}.notice.unread{background:rgba(216,174,99,.07);border-color:rgba(216,174,99,.24)}.dot{width:9px;height:9px;border-radius:50%;margin-top:7px;flex-shrink:0}.notice-body{flex:1}.notice-body>div{display:flex;align-items:center;justify-content:space-between;gap:10px}.notice strong{font-size:14px}.notice span{font-size:11px;color:#9A6C3C}.notice p{margin:7px 0 0;color:#6F6258;line-height:1.7;font-size:13px}.notice-actions{display:flex;gap:6px}.notice-actions button{width:36px;height:36px;padding:0;justify-content:center;color:#9A6C3C}.notice-actions button:last-child{color:#EF4444}
  .empty{text-align:center;padding:54px 20px;color:#9A6C3C}.empty svg{color:#D8AE63;margin-bottom:12px}.empty strong{display:block;color:#111;font-size:18px}.error{padding:12px 14px;border-radius:14px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#B91C1C;margin-bottom:14px;font-weight:800}
  @media(max-width:1024px){.notif-page{margin-inline-start:0}}
  @media(max-width:820px){.hero{display:block}.counter{margin-top:18px}.list-head{align-items:flex-start;flex-direction:column}}
  @media(max-width:560px){.hero h2{font-size:25px}.notice{flex-wrap:wrap}.notice-actions{width:100%;justify-content:flex-end}}
`;
