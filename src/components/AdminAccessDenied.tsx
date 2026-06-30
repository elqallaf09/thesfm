import { AdminDashboardShell } from '@/components/AdminDashboardShell';

export function AdminAccessDenied() {
  return (
    <AdminDashboardShell contentStyle={{ width: '100%', maxWidth: '100%' }}>
      <main
        dir="rtl"
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
            borderRadius: 22,
            background: 'var(--sfm-card-bg, #fff)',
            boxShadow: '0 18px 50px rgba(3,18,37,.10)',
            padding: 24,
            textAlign: 'center',
            display: 'grid',
            gap: 10,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 950, color: 'var(--sfm-foreground, #0f172a)' }}>
            ليس لديك صلاحية للوصول إلى هذه الصفحة.
          </h1>
          <p style={{ margin: 0, color: 'var(--sfm-muted, #64748b)', fontWeight: 800, lineHeight: 1.8 }}>
            إذا كنت تحتاج هذه الصلاحية، تواصل مع Super Admin.
          </p>
        </section>
      </main>
    </AdminDashboardShell>
  );
}

export default AdminAccessDenied;
