'use client';

import { AdminDashboardShell } from '@/components/AdminDashboardShell';
import { useLanguage } from '@/hooks/useLanguage';

export function AdminAccessDenied() {
  const { t, dir } = useLanguage();
  return (
    <AdminDashboardShell contentStyle={{ width: '100%', maxWidth: '100%' }}>
      <main
        dir={dir}
        style={{
          minHeight: '60vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          fontFamily: 'Tajawal, Arial, sans-serif',
        }}
      >
        <section
          style={{
            width: 'min(100%, 560px)',
            border: '1px solid rgba(29,140,255,.14)',
            borderRadius: 'var(--r-2xl)',
            background: 'var(--sfm-card-bg, #fff)',
            boxShadow: '0 18px 50px rgba(3,18,37,.10)',
            padding: 24,
            textAlign: 'center',
            display: 'grid',
            gap: 10,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 950, color: 'var(--sfm-foreground, #0f172a)' }}>
            {t('admin_access_denied_title')}
          </h1>
          <p style={{ margin: 0, color: 'var(--sfm-muted, #64748b)', fontWeight: 800, lineHeight: 1.8 }}>
            {t('admin_access_denied_body')}
          </p>
        </section>
      </main>
    </AdminDashboardShell>
  );
}

export default AdminAccessDenied;
