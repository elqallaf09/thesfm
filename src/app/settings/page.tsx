'use client';

import { Bell, Globe2, Home, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const settings = [
  { icon: Globe2, title: 'اللغة', body: 'استخدم مبدل اللغة لتغيير اتجاه وتجربة الواجهة.' },
  { icon: Bell, title: 'الإشعارات', body: 'راجع مركز الإشعارات للتنبيهات المالية المهمة.' },
  { icon: ShieldCheck, title: 'الأمان', body: 'إعدادات الحساب والأمان تُدار من صفحة الملف الشخصي.' },
];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <main className="settings-shell" dir="rtl">
      <section className="settings-page">
        <header>
          <button onClick={() => router.push('/')}><Home size={17} /> الرئيسية</button>
          <LanguageSwitcher variant="gold" compact />
        </header>
        <section className="hero">
          <SlidersHorizontal size={42} />
          <h1>الإعدادات</h1>
          <p>إعدادات خفيفة وآمنة بدون تعطيل أي منطق حالي. استخدم الروابط لإدارة اللغة، الإشعارات، والملف الشخصي.</p>
        </section>
        <section className="cards">
          {settings.map(item => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <Icon size={24} />
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </article>
            );
          })}
        </section>
        <div className="actions">
          <button onClick={() => router.push('/notifications')}>فتح الإشعارات</button>
          <button onClick={() => router.push('/profile')}>فتح الملف الشخصي</button>
        </div>
      </section>
      <style>{`
        .settings-shell{min-height:100vh;background:#F7F3EA;color:#111;font-family:Tajawal,Arial,sans-serif}.settings-page{max-width:980px;margin:0 auto;padding:24px 20px 60px}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}header button,.actions button{height:40px;border-radius:13px;border:1.5px solid rgba(216,174,99,.22);background:#FFFDFC;color:#5B4332;padding:0 14px;font:800 13px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:8px;cursor:pointer}.hero{background:linear-gradient(135deg,#111,#2B1A0D 62%,#D8AE63 140%);color:#FFFDFC;border-radius:24px;padding:32px;margin-bottom:18px}.hero svg{color:#D8AE63}.hero h1{font-size:34px;margin:12px 0 8px}.hero p{margin:0;color:rgba(255,255,255,.68);line-height:1.8;max-width:660px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.cards article{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:20px;padding:20px;box-shadow:0 4px 22px rgba(90,67,51,.06)}.cards svg{color:#D8AE63;margin-bottom:12px}.cards strong{display:block;font-size:17px}.cards p{margin:8px 0 0;color:#7C6A5D;line-height:1.7;font-size:13px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}@media(max-width:760px){.cards{grid-template-columns:1fr}.hero h1{font-size:28px}}
      `}</style>
    </main>
  );
}
