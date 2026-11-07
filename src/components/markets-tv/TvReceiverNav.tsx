'use client';
import './receiver-nav.css';
import { TV_RECEIVER_CHANNELS, receiverText, type TvReceiverChannel } from '@/lib/markets-tv/receiver';
import type { TvLanguage } from '@/lib/markets-tv/types';

export function TvReceiverNav({ language, active, choose }: { language: TvLanguage; active?: TvReceiverChannel; choose: (channel: TvReceiverChannel) => void }) {
  return <nav className="tv-receiver-nav" aria-label={receiverText(language, 'receiver')}>
    {TV_RECEIVER_CHANNELS.map((channel, index) => <button key={channel} aria-pressed={active === channel}
      data-tv-focus-key={`channel:${channel}`} onClick={() => choose(channel)}>
      <bdi>{String(index + 1).padStart(2, '0')}</bdi><span>{receiverText(language, channel)}</span>
    </button>)}
  </nav>;
}
