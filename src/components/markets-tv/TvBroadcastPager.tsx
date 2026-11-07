import { ChevronLeft, ChevronRight } from 'lucide-react';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvLanguage } from '@/lib/markets-tv/types';
export function TvBroadcastPager({page,pages,language,move}:{page:number;pages:number;language:TvLanguage;move:(value:number)=>void}){
 if(pages<2)return null;
 return <nav className="tv-broadcast-pager"><button aria-label={tvText(language,'previous')} onClick={()=>move((page+pages-1)%pages)}><ChevronLeft aria-hidden="true"/></button><bdi>{page+1}/{pages}</bdi><button aria-label={tvText(language,'next')} onClick={()=>move((page+1)%pages)}><ChevronRight aria-hidden="true"/></button></nav>;
}
