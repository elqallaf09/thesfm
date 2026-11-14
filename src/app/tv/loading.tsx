// Inline first-paint styles cover slow CSS/chunk delivery on direct TV entry.
export default function TvLoading() {
  return <main className="tv-screen tv-dark" data-tv-loading role="status" aria-label="THE SFM TV" aria-busy="true" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--tv-bg)', color: 'var(--tv-accent)', fontFamily: 'var(--font-ui)', zIndex: 100 }}>
    <strong dir="ltr">THE SFM <span style={{ fontWeight: 400 }}>MARKETS TV</span></strong>
  </main>;
}
