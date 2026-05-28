type RouteSkeletonProps = {
  label?: string;
  variant?: 'public' | 'dashboard';
};

export function RouteSkeleton({ label = 'THE SFM', variant = 'public' }: RouteSkeletonProps) {
  return (
    <main className={`sfm-route-loading sfm-route-loading-${variant}`} dir="rtl" aria-live="polite" aria-busy="true">
      <section className="sfm-loading-card">
        <div className="sfm-loading-logo">{label}</div>
        <div className="sfm-loading-lines">
          <span />
          <span />
          <span />
        </div>
        <div className="sfm-loading-grid">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
