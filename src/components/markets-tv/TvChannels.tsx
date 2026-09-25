'use client';
import { useState } from 'react';
import { Play, Save, Trash2 } from 'lucide-react';
import { normalizeTvChannels, TV_CHANNELS_KEY, TV_CHANNEL_LIMIT, type TvChannel } from '@/lib/markets-tv/channels';
import type { TvSelections } from '@/lib/markets-tv/selections';
import type { TvSettings } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';

export function TvChannels({ channels, change, settings, selections, apply }: {
  channels: TvChannel[]; change: (channels: TvChannel[]) => void; settings: TvSettings;
  selections: TvSelections; apply: (channel: TvChannel) => void;
}) {
  const [name, setName] = useState(''), [message, setMessage] = useState('');
  const [remove, setRemove] = useState('');
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language, key);
  function persist(next: TvChannel[]) {
    const clean = normalizeTvChannels(next);
    if (clean.length !== next.length) { setMessage(t('channelLimit')); return false; }
    try { localStorage.setItem(TV_CHANNELS_KEY, JSON.stringify(clean)); }
    catch { setMessage(t('channelStorageError')); return false; }
    change(clean); setMessage(t('channelSaved')); return true;
  }
  function save() {
    if (!name.trim() || channels.length >= TV_CHANNEL_LIMIT) return;
    const channel = { id: `channel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, name, settings, selections };
    if (persist([...channels, channel])) setName('');
  }
  return <div className="tv-channels">
    <p className="tv-muted">{t('channelsHelp')}</p>
    <form className="tv-channel-create" onSubmit={event => { event.preventDefault(); save(); }}>
      <label>{t('channelName')}<input value={name} maxLength={60} onChange={event => setName(event.target.value)} placeholder={t('channelExample')}/></label>
      <button type="submit" disabled={!name.trim() || channels.length >= TV_CHANNEL_LIMIT}><Save aria-hidden="true"/>{t('saveChannel')}</button>
    </form>
    <p className="tv-muted">{channels.length} / {TV_CHANNEL_LIMIT} · {t('channelsLocal')}</p>
    {message && <p role="status">{message}</p>}
    <div className="tv-channel-list">{channels.map(channel => <div className="tv-channel" key={channel.id}>
      <div><strong dir="auto">{channel.name}</strong><small>{t(!channel.settings.stripDensity || channel.settings.stripDensity === 'balanced' ? 'balancedDensity' : channel.settings.stripDensity)} · {channel.settings.language.toUpperCase()} · {t('stripSpeed')}: {t(channel.settings.stripSpeed === 36 ? 'slow' : channel.settings.stripSpeed === 80 ? 'fast' : 'normal')}</small></div>
      <div className="tv-channel-actions">
        <button onClick={() => apply(channel)} aria-label={`${t('applyChannel')}: ${channel.name}`}><Play aria-hidden="true"/>{t('applyChannel')}</button>
        <button onClick={() => persist(channels.map(item => item.id === channel.id ? { ...item, settings, selections } : item))} aria-label={`${t('updateChannel')}: ${channel.name}`}><Save aria-hidden="true"/>{t('updateChannel')}</button>
        <button onClick={() => setRemove(channel.id)} aria-label={`${t('deleteChannel')}: ${channel.name}`}><Trash2 aria-hidden="true"/></button>
      </div>
      {remove === channel.id && <div className="tv-channel-confirm"><span>{t('deleteChannel')} «{channel.name}»؟</span><button onClick={() => { if (persist(channels.filter(item => item.id !== channel.id))) setRemove(''); }}>{t('deleteChannel')}</button><button onClick={() => setRemove('')}>{t('cancel')}</button></div>}
    </div>)}</div>
    {!channels.length && <p>{t('noChannels')}</p>}
  </div>;
}
