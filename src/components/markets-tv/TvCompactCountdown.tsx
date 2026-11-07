import { compactCountdown } from '@/lib/markets-tv/broadcast';
import { countdownParts } from '@/lib/markets-tv/sessionTimeline';
import { obsText } from '@/lib/markets-tv/obsidian';
import type { TvLanguage } from '@/lib/markets-tv/types';
export function TvCompactCountdown({remaining,language}:{remaining:number|null;language:TvLanguage}){
 const p=countdownParts(remaining);
 const label=p?(['days','hours','minutes','seconds'] as const).map(k=>`${p[k]} ${obsText(language,k)}`).join(' · '):'—';
 return <span className="tv-compact-countdown" role="timer" aria-live="off" aria-label={label} title={label} dir="ltr"><bdi>{compactCountdown(remaining,language)}</bdi></span>;
}
