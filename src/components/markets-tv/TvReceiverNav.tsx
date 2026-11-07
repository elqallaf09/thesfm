'use client';
import './receiver-nav.css';
import { useState } from 'react';
import { tvText } from '@/lib/markets-tv/i18n';
import { TV_RECEIVER_CHANNELS, receiverText, type TvReceiverChannel } from '@/lib/markets-tv/receiver';
import type { TvLanguage } from '@/lib/markets-tv/types';

export function TvReceiverNav({ language, active, choose }: { language: TvLanguage; active?: TvReceiverChannel; choose: (channel: TvReceiverChannel) => void }) {
  const [selection, setSelection] = useState({ active, page: Math.floor(Math.max(0, TV_RECEIVER_CHANNELS.indexOf(active!)) / 5) });
  const page = selection.active === active ? selection.page : Math.floor(Math.max(0, TV_RECEIVER_CHANNELS.indexOf(active!)) / 5);
  const pages = Math.ceil(TV_RECEIVER_CHANNELS.length / 5);
  const move = (step: number) => setSelection({ active, page: (page + step + pages) % pages });
  return <nav className="tv-receiver-nav" aria-label={receiverText(language, 'receiver')}>
    <button className="tv-channel-page" onClick={() => move(-1)} aria-label={tvText(language, 'previous')}><span aria-hidden="true">‹</span></button>
    {TV_RECEIVER_CHANNELS.slice(page * 5, page * 5 + 5).map((channel, index) => <button key={channel} aria-pressed={active === channel}
      data-tv-focus-key={`channel:${channel}`} onClick={() => choose(channel)}>
      <bdi>{String(page * 5 + index + 1).padStart(2, '0')}</bdi><span>{receiverText(language, channel)}</span>
    </button>)}
    <button className="tv-channel-page" onClick={() => move(1)} aria-label={tvText(language, 'next')}><bdi>{page + 1}/{pages}</bdi><span aria-hidden="true">›</span></button>
  </nav>;
}
