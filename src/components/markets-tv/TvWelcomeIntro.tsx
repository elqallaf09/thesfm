'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { tvOrigin } from '@/lib/markets-tv/client';
import { TV_WELCOME_EVENT, welcomeText } from '@/lib/markets-tv/welcome';
import { claimTvWelcome } from '@/lib/markets-tv/welcome-session';
import './welcome.css';
import { TvBrandMark } from './TvBrandMark';

export default function TvWelcomeIntro({ language }: { language: TvLanguage }) {
  const [visible, setVisible] = useState(false), [revision, setRevision] = useState(0), [sound, setSound] = useState<'pending' | 'blocked' | 'playing' | 'unavailable'>('pending');
  const startup = useRef<boolean | null>(null);
  const context = useRef<AudioContext | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const text = welcomeText(language);
  const stopSound = useCallback(() => { const active = context.current; context.current = null; if (active && active.state !== 'closed') void active.close().catch(() => {}); }, []);
  const finish = useCallback(() => { if (timer.current) clearTimeout(timer.current); setVisible(false); stopSound(); }, [stopSound]);
  const play = useCallback(async (gesture: boolean) => {
    stopSound();
    const Audio = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) { setSound('unavailable'); return; }
    try {
      const audio = new Audio(); context.current = audio;
      if (audio.state !== 'running') {
        if (!gesture) { stopSound(); setSound('blocked'); return; }
        await audio.resume();
      }
      if (context.current !== audio || audio.state !== 'running') { setSound('blocked'); return; }
      // Original, quiet three-note SFM ident. No external audio or copied brand sounds.
      [130.81, 261.63, 392].forEach((frequency, index) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime + index * .18;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.055, start + .025); gain.gain.exponentialRampToValueAtTime(.001, start + 1.05);
        oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + 1.1);
      });
      setSound('playing');
    } catch { stopSound(); setSound('unavailable'); }
  }, [stopSound]);
  const start = useCallback((gesture: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(true); setRevision(value => value + 1); setSound('pending'); void play(gesture);
    timer.current = setTimeout(finish, 3600);
  }, [finish, play]);
  useEffect(() => {
    // Keep the claim across Strict Mode's effect replay, but not component remounts.
    if (startup.current === null) startup.current = claimTvWelcome();
    if (startup.current) start(false);
    const replay = () => start(true);
    window.addEventListener(TV_WELCOME_EVENT, replay);
    return () => { if (timer.current) clearTimeout(timer.current); stopSound(); window.removeEventListener(TV_WELCOME_EVENT, replay); };
  }, [start, finish, stopSound]);
  useEffect(() => {
    if (!visible) return;
    // The short ident finishes naturally. Never activate the saved account or
    // broadcast controls that are visually covered by the introduction.
    const blockBackground = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('.sfm-startup-actions') && ['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat && ['Enter', ' '].includes(event.key)) document.querySelector<HTMLButtonElement>('.sfm-startup-actions button')?.click();
    };
    document.addEventListener('keydown', blockBackground, true);
    return () => document.removeEventListener('keydown', blockBackground, true);
  }, [visible]);
  if (!visible) return null;
  const packaged = typeof window !== 'undefined' && tvOrigin() !== window.location.origin;
  return <div key={revision} className="sfm-startup" data-sound={sound} aria-label="THE SFM Markets TV">
    <div className="sfm-startup-brand"><TvBrandMark packaged={packaged}/><strong>THE SFM</strong><span>MARKETS TV</span></div>
    <div className="sfm-startup-actions">{sound !== 'playing' && sound !== 'unavailable' && <button onClick={event => { event.stopPropagation(); start(true); }}>{text.sound}</button>}{sound === 'unavailable' && <small role="status">{text.unavailable}</small>}</div>
  </div>;
}
