import type { Metadata } from 'next';
import { MarketsTv } from '@/components/markets-tv/MarketsTv';
import '../tv.css';

export const metadata: Metadata = {
  title: 'أشرطة الأسواق | The SFM Markets TV',
  description: 'Full-screen scrolling market strips with source-backed prices and update times.',
};

export default function TvStripsPage() { return <MarketsTv initialStripsOnly />; }
