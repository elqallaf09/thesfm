'use client';
/* eslint-disable @next/next/no-img-element -- Official brand asset shared with offline TV clients. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { tvOrigin } from '@/lib/markets-tv/client';
import { TV_WELCOME_EVENT, welcomeText } from '@/lib/markets-tv/welcome';
import './welcome.css';

export default function TvWelcomeIntro({ language }: { language: TvLanguage }) {
  const [visible, setVisible] = useState(true), [revision, setRevision] = useState(0), [sound, setSound] = useState<'pending' | 'blocked' | 'playing' | 'unavailable'>('pending');
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
    start(false);
    const replay = () => start(true);
    const dismiss = (event: Event) => { if (event.defaultPrevented) return; if (event.target instanceof Element && event.target.closest('.sfm-startup-actions') && (event.type === 'pointerdown' || event instanceof KeyboardEvent && ['Enter', ' '].includes(event.key))) return; finish(); };
    window.addEventListener(TV_WELCOME_EVENT, replay);
    document.addEventListener('keydown', dismiss); document.addEventListener('pointerdown', dismiss);
    return () => { if (timer.current) clearTimeout(timer.current); stopSound(); window.removeEventListener(TV_WELCOME_EVENT, replay); document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', dismiss); };
  }, [start, finish, stopSound]);
  if (!visible) return null;
  const packaged = typeof window !== 'undefined' && tvOrigin() !== window.location.origin;
  return <div key={revision} className="sfm-startup" data-sound={sound} aria-label="THE SFM Markets TV">
    <div className="sfm-startup-brand"><img src={packaged ? './markets-tv/sfm-logo.png' : '/brand/sfm-original-logo.png'} alt="THE SFM" width="160" height="160"/><strong>THE SFM</strong><span>MARKETS TV</span></div>
    <div className="sfm-startup-actions">{sound !== 'playing' && sound !== 'unavailable' && <button onClick={event => { event.stopPropagation(); start(true); }}>{text.sound}</button>}{sound === 'unavailable' && <small role="status">{text.unavailable}</small>}<button onClick={finish}>{text.skip}</button></div>
  </div>;
}
