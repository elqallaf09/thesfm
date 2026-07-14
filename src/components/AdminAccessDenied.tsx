'use client';

import { AdminDashboardShell } from '@/components/AdminDashboardShell';
import { useLanguage } from '@/hooks/useLanguage';

export function AdminAccessDenied() {
  const { t, dir } = useLanguage();
  return (
    <AdminDashboardShell contentStyle={{ width: '100%', maxWidth: '100%' }}>
      <section
        dir={dir}
        style={{
          minHeight: '60vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <section
          style={{
            width: 'min(100%, 560px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-panel)',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-card)',
            padding: 24,
            textAlign: 'center',
            display: 'grid',
            gap: 10,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--foreground)' }}>
            {t('admin_access_denied_title')}
          </h1>
          <p style={{ margin: 0, color: 'var(--foreground-secondary)', fontWeight: 400, lineHeight: 1.8 }}>
            {t('admin_access_denied_body')}
          </p>
        </section>
      </section>
    </AdminDashboardShell>
  );
}

export default AdminAccessDenied;
