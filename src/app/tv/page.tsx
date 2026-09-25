import type { Metadata } from 'next';
import { MarketsTv } from '@/components/markets-tv/MarketsTv';
import './tv.css';
import './display-controls.css';
export const metadata: Metadata = { title: 'The SFM Markets TV', description: 'A market display built for your television. Source-backed prices, market headlines and your watchlist.' };
export default function TvPage() { return <MarketsTv />; }
