/* eslint-disable @next/next/no-img-element -- One small local asset also used by offline television clients. */
export function TvBrandMark({ packaged = false }: { packaged?: boolean }) {
  return <img className="tv-brand-mark" src={packaged ? './markets-tv/sfm-emerald-mark.webp' : '/markets-tv/sfm-emerald-mark.webp'} alt="THE SFM" width="384" height="384" decoding="async"/>;
}
