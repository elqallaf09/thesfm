import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { TV_WALLPAPERS, wallpaperIds, wallpaperPath, type TvWallpaper } from '@/lib/markets-tv/wallpapers';
import type { TvLanguage } from '@/lib/markets-tv/types';

type Props = {
  language: TvLanguage;
  selected: TvWallpaper;
  packaged: boolean;
  onSelect: (value: TvWallpaper) => void;
};

export function TvWallpaperPicker({ language, selected, packaged, onSelect }: Props) {
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Settings and this gallery share one dialog. Move to the saved tile even
    // when the modal stayed open, after its focus-return target was captured.
    const frame = requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>('[aria-pressed=true]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [selected]);
  return <div ref={grid} className="tv-wallpaper-grid" data-tv-focus-grid>
    {wallpaperIds.map(id => <button key={id} type="button" aria-pressed={selected === id}
      data-tv-focus-key={`wallpaper:${id}`} data-tv-initial-focus={selected === id ? '' : undefined}
      onClick={() => onSelect(id)}>
      <span aria-hidden="true" className="tv-wallpaper-preview" style={{ backgroundImage: `url("${wallpaperPath(id, packaged)}")` }} />
      <span className="tv-wallpaper-label">{TV_WALLPAPERS[id][language]}{selected === id && <Check aria-hidden="true" />}</span>
    </button>)}
  </div>;
}
