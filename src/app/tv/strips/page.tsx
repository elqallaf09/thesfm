import type { Metadata } from 'next';
import { MarketsTv } from '@/components/markets-tv/MarketsTv';
import '../tv.css';
import '../display-controls.css';
import '../viewing.css';
import '../sessions.css';
import '../chrome.css';
import '../obsidian.css';
import '../brand.css';

export const metadata: Metadata = {
  title: '????? ??????? | The SFM Markets TV',
  description: 'Full-screen scrolling market strips with source-backed prices and update times.',
};

export default function TvStripsPage() { return <MarketsTv initialStripsOnly />; }
