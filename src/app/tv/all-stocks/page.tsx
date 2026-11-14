import type { Metadata } from 'next';
import { MarketsTv } from '@/components/markets-tv/MarketsTv';
import '../tv.css';
import '../display-controls.css';
import '../viewing.css';
import '../sessions.css';
import '../chrome.css';
import '../obsidian.css';

export const metadata: Metadata = { title: 'كل الأسهم | THE SFM TV', description: 'ابحث في دليل الأسهم والبورصات العالمي وتصفح الأسعار مع مصادرها على شاشة التلفزيون.' };
export default function AllStocksPage() { return <MarketsTv initialAllStocks/>; }
