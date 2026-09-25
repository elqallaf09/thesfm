import type { Metadata } from 'next';
import { TvAccount } from '@/components/markets-tv/TvAccount';
import '../tv.css';
export const metadata: Metadata = { title: 'Link your TV · The SFM', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function PairPage() { return <TvAccount />; }
