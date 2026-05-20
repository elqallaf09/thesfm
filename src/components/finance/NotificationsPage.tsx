'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Bot,
  CheckCheck,
  HandCoins,
  Home,
  LineChart,
  Target,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

type NoticeType = 'expenses' | 'invest' | 'ai' | 'goals';

interface Notice {
  id: string;
  type: NoticeType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

const initialNotices: Notice[] = [
  {
    id: 'expense-weekly',
    type: 'expenses',
    title: 'تنبيه المصروفات',
    body: 'مصروفات هذا الأسبوع أعلى من المتوسط. راجع فئة الطعام والمواصلات.',
    time: 'اليوم',
    unread: true,
  },
  {
    id: 'invest-monthly',
    type: 'invest',
    title: 'إشعار الاستثمار',
    body: 'حان وقت تسجيل المساهمة الاستثمارية الشهرية للحفاظ على الخطة.',
    time: 'منذ ساعتين',
    unread: true,
  },
  {
    id: 'ai-insight',
    type: 'ai',
    title: 'رؤية من الذكاء الاصطناعي',
    body: 'يمكنك تحسين الصافي الشهري بخفض أكبر بند مصروفات بنسبة 5%.',
    time: 'أمس',
    unread: false,
  },
  {
    id: 'goal-progress',
    type: 'goals',
    title: 'تقدم الأهداف',
    body: 'أنت قريب من هدف الادخار. أضف دفعة صغيرة هذا الشهر.',
    time: 'هذا الأسبوع',
    unread: false,
  },
];

const groups: { id: NoticeType | 'all'; title: string; icon: typeof Bell }[] = [
  { id: 'all', title: 'جميع الإشعارات', icon: Bell },
  { id: 'expenses', title: 'إشعارات المصروفات', icon: WalletCards },
  { id: 'invest', title: 'إشعارات الاستثمار', icon: LineChart },
  { id: 'ai', title: 'إشعارات الذكاء الاصطناعي', icon: Bot },
  { id: 'goals', title: 'إشعارات الأهداف', icon: Target },
];

export function NotificationsPage() {
  const router = useRouter();
  const [active, setActive] = useState<NoticeType | 'all'>('all');
  const [notices, setNotices] = useState(initialNotices);

  const unread = notices.filter(notice => notice.unread).length;
  const filtered = useMemo(
    () => active === 'all' ? notices : notices.filter(notice => notice.type === active),
    [active, notices],
  );

  const markAsRead = (id: string) => {
    setNotices(current => current.map(notice => notice.id === id ? { ...notice, unread: false } : notice));
  };

  const remove = (id: string) => {
    setNotices(current => current.filter(notice => notice.id !== id));
  };

  return (
    <main className="notif-shell" dir="rtl">
      <section className="notif-page">
        <header className="notif-header">
          <button className="back-btn" onClick={() => router.push('/')}>
            <Home size={17} />
            الرئيسية
          </button>
          <div className="title">
            <span><Bell size={22} /></span>
            <div>
              <p>THE SFM</p>
              <h1>الإشعارات</h1>
            </div>
          </div>
          <LanguageSwitcher variant="gold" compact />
        </header>

        <section className="hero">
          <div>
            <span className="eyebrow">مركز التنبيهات</span>
            <h2>جميع الإشعارات المالية في مكان واحد</h2>
            <p>تابع إشعارات المصروفات والاستثمار والذكاء الاصطناعي والأهداف بدون مغادرة تجربة THE SFM.</p>
          </div>
          <div className="counter">
            <strong>{unread}</strong>
            <span>غير مقروءة</span>
          </div>
        </section>

        <section className="notif-grid">
          <aside className="tabs">
            {groups.map(group => {
              const Icon = group.icon;
              const count = group.id === 'all' ? notices.length : notices.filter(notice => notice.type === group.id).length;
              return (
                <button key={group.id} className={active === group.id ? 'active' : ''} onClick={() => setActive(group.id)}>
                  <Icon size={18} />
                  <span>{group.title}</span>
                  <b>{count}</b>
                </button>
              );
            })}
          </aside>

          <section className="list">
            <div className="list-head">
              <div>
                <p>قائمة الإشعارات</p>
                <h3>{groups.find(group => group.id === active)?.title}</h3>
              </div>
              {unread > 0 && (
                <button className="mark-all" onClick={() => setNotices(current => current.map(notice => ({ ...notice, unread: false })))}>
                  <CheckCheck size={16} />
                  تعيين الكل كمقروء
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="empty">
                <HandCoins size={42} />
                <strong>لا توجد إشعارات</strong>
                <p>كل شيء هادئ الآن. ستظهر التنبيهات الجديدة هنا عند توفرها.</p>
              </div>
            ) : (
              filtered.map(notice => (
                <article key={notice.id} className={notice.unread ? 'notice unread' : 'notice'}>
                  <div className="dot" />
                  <div className="notice-body">
                    <div>
                      <strong>{notice.title}</strong>
                      <span>{notice.time}</span>
                    </div>
                    <p>{notice.body}</p>
                  </div>
                  <div className="notice-actions">
                    {notice.unread && (
                      <button onClick={() => markAsRead(notice.id)} aria-label="Mark as read">
                        <CheckCheck size={16} />
                      </button>
                    )}
                    <button onClick={() => remove(notice.id)} aria-label="Delete notification">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </section>
      </section>

      <style>{`
        .notif-shell{min-height:100vh;background:#F7F3EA;color:#111;font-family:Tajawal,Arial,sans-serif}
        .notif-page{max-width:1180px;margin:0 auto;padding:24px 20px 60px}
        .notif-header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:22px;flex-wrap:wrap}
        .back-btn,.mark-all,.notice-actions button{border:1.5px solid rgba(216,174,99,.22);background:#FFFDFC;color:#5B4332;border-radius:13px;height:40px;padding:0 14px;display:inline-flex;align-items:center;gap:8px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}
        .title{display:flex;align-items:center;gap:12px;flex:1;min-width:220px}.title>span{width:46px;height:46px;border-radius:15px;background:linear-gradient(135deg,#D8AE63,#9A6C3C);display:grid;place-items:center;color:#111}.title p{margin:0 0 3px;font-size:11px;color:#9A6C3C;font-weight:800}.title h1{margin:0;font-size:26px;font-weight:900}
        .hero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;background:linear-gradient(135deg,#111,#2B1A0D 62%,#D8AE63 140%);color:#FFFDFC;border-radius:24px;padding:28px;margin-bottom:18px;box-shadow:0 18px 45px rgba(45,26,10,.16)}
        .eyebrow{display:inline-flex;padding:4px 10px;border-radius:999px;background:rgba(216,174,99,.15);color:#D8AE63;font-size:11px;font-weight:900;margin-bottom:12px}.hero h2{margin:0 0 8px;font-size:31px}.hero p{margin:0;color:rgba(255,255,255,.68);line-height:1.8;max-width:640px}.counter{min-width:118px;text-align:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:16px}.counter strong{display:block;font-size:34px;color:#D8AE63}.counter span{font-size:12px;color:rgba(255,255,255,.62)}
        .notif-grid{display:grid;grid-template-columns:300px 1fr;gap:18px}.tabs,.list{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:22px;box-shadow:0 4px 22px rgba(90,67,51,.06);padding:16px}.tabs{display:grid;gap:8px;align-self:start}.tabs button{height:48px;border:0;border-radius:14px;background:transparent;color:#5B4332;display:flex;align-items:center;gap:10px;padding:0 12px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer;text-align:right}.tabs button.active,.tabs button:hover{background:rgba(216,174,99,.11);color:#9A6C3C}.tabs b{margin-right:auto;background:rgba(216,174,99,.13);border-radius:999px;padding:3px 8px;font-size:11px}
        .list-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.list-head p{margin:0 0 3px;color:#9A6C3C;font-size:11px;font-weight:900}.list-head h3{margin:0;font-size:19px}
        .notice{position:relative;display:flex;gap:12px;align-items:flex-start;border:1px solid rgba(216,174,99,.11);border-radius:17px;padding:15px;margin-top:10px;background:#FFFDFC}.notice.unread{background:rgba(216,174,99,.07);border-color:rgba(216,174,99,.24)}.dot{width:9px;height:9px;border-radius:50%;background:#D8AE63;margin-top:7px;flex-shrink:0}.notice:not(.unread) .dot{background:#D8D0C3}.notice-body{flex:1}.notice-body>div{display:flex;align-items:center;justify-content:space-between;gap:10px}.notice strong{font-size:14px}.notice span{font-size:11px;color:#9A6C3C}.notice p{margin:7px 0 0;color:#6F6258;line-height:1.7;font-size:13px}.notice-actions{display:flex;gap:6px}.notice-actions button{width:36px;height:36px;padding:0;justify-content:center;color:#9A6C3C}.notice-actions button:last-child{color:#EF4444}
        .empty{text-align:center;padding:54px 20px;color:#9A6C3C}.empty svg{color:#D8AE63;margin-bottom:12px}.empty strong{display:block;color:#111;font-size:18px}.empty p{margin:8px auto 0;max-width:360px;line-height:1.7}
        @media(max-width:820px){.notif-grid{grid-template-columns:1fr}.hero{display:block}.counter{margin-top:18px}.tabs{grid-template-columns:1fr 1fr}.list-head{align-items:flex-start;flex-direction:column}}
        @media(max-width:560px){.tabs{grid-template-columns:1fr}.hero h2{font-size:25px}.notice{flex-wrap:wrap}.notice-actions{width:100%;justify-content:flex-end}}
      `}</style>
    </main>
  );
}
