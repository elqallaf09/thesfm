import '@/styles/tokens.css';
import '@/styles/themes.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MarketsTv } from '@/components/markets-tv/MarketsTv';
import '@/app/tv/tv.css';
import './packaged.css';
import '@/app/tv/display-controls.css';
createRoot(document.getElementById('root')!).render(<MarketsTv initialStripsOnly />);
