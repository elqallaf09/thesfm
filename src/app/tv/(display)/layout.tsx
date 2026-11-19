import type { ReactNode } from 'react';
import { TvWebDisplay } from '@/components/markets-tv/TvWebDisplay';
import '../tv.css';
import '../display-controls.css';
import '../viewing.css';
import '../sessions.css';
import '../chrome.css';
import '../obsidian.css';
import '../brand.css';

export default function TvDisplayLayout({ children }: { children: ReactNode }) {
  return <><TvWebDisplay />{children}</>;
}
