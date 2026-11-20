'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { tvOrigin } from '@/lib/markets-tv/client';
import { TV_WELCOME_EVENT, welcomeText } from '@/lib/markets-tv/welcome';
import { claimTvWelcome, tvIosLaunch } from '@/lib/markets-tv/welcome-session';
import './welcome.css';
import { TvBrandMark } from './TvBrandMark';

export default function TvWelcomeIntro({ language }: { language: TvLanguage }) {
  const [visible, setVisible] = useState(false), [revision, setRevision] = useState(0), [sound, setSound] = useState<'pending' | 'blocked' | 'playing' | 'unavailable'>('pending');
  const startup = useRef<boolean | null>(null);
  const track = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const text = welcomeText(language);
  const automaticSound = Boolean(tvIosLaunch());
  const packaged = typeof window !== 'undefined' && tvOrigin() !== window.location.origin;
  const stopSound = useCallback(() => {
    track.current?.pause();
    track.current = null;
  }, []);
  const finish = useCallback(() => { if (timer.current) clearTimeout(timer.current); setVisible(false); stopSound(); }, [stopSound]);
  const play = useCallback(async () => {
    stopSound();
    if (typeof Audio === 'undefined') { setSound('unavailable'); return; }
    const audio = new Audio(packaged ? './markets-tv/sfm-ident.wav' : '/markets-tv/sfm-ident.wav');
    track.current = audio;
    try {
      await audio.play();
      if (track.current === audio) setSound('playing');
    } catch (error) {
      if (track.current !== audio) return;
      setSound(error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'unavailable');
    }
  }, [packaged, stopSound]);
  const start = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(true); setRevision(value => value + 1); setSound('pending'); void play();
    timer.current = setTimeout(finish, 3600);
  }, [finish, play]);
  useEffect(() => {
    // Keep the claim across Strict Mode's effect replay, but not component remounts.
    if (startup.current === null) startup.current = claimTvWelcome();
    if (startup.current) start();
    window.addEventListener(TV_WELCOME_EVENT, start);
    return () => { if (timer.current) clearTimeout(timer.current); stopSound(); window.removeEventListener(TV_WELCOME_EVENT, start); };
  }, [start, stopSound]);
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
  return <div key={revision} className="sfm-startup" data-sound={sound} aria-label="THE SFM Markets TV">
    <div className="sfm-startup-brand"><TvBrandMark packaged={packaged}/><strong>THE SFM</strong><span>MARKETS TV</span></div>
    {!automaticSound && <div className="sfm-startup-actions">
      {sound === 'blocked' && <button type="button" onClick={start}>{text.sound}</button>}
      {sound === 'unavailable' && <small role="status">{text.unavailable}</small>}
    </div>}
  </div>;
}
