import { createContext, type ComponentProps } from 'react';
import type { TvQuoteMarquee } from './TvQuoteMarquee';

type Playback = Omit<ComponentProps<typeof TvQuoteMarquee>, 'quotes'> & { enabled: boolean; revision: number };
export const TvTickerContext = createContext<Playback | null>(null);
