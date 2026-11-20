'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { tvOrigin } from '@/lib/markets-tv/client';
import { TV_WELCOME_EVENT } from '@/lib/markets-tv/welcome';
import { claimTvWelcome } from '@/lib/markets-tv/welcome-session';
import './welcome.css';
import { TvBrandMark } from './TvBrandMark';

export default function TvWelcomeIntro() {
  const [visible, setVisible] = useState(false);
  const [revision, setRevision] = useState(0);
  const [sound, setSound] = useState<'pending' | 'blocked' | 'playing' | 'unavailable'>('pending');
  const startup = useRef<boolean | null>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const packaged = typeof window !== 'undefined' && tvOrigin() !== window.location.origin;

  const stopSound = useCallback(() => {
    track.current?.pause();
    track.current = null;
  }, []);

  const play = useCallback(async (audio: HTMLAudioElement) => {
    try {
      await audio.play();
      if (track.current === audio) setSound('playing');
    } catch (error) {
      if (track.current !== audio) return;
      setSound(error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'unavailable');
    }
  }, []);

  const start = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    stopSound();
    setVisible(true);
    setRevision(value => value + 1);
    setSound('pending');
    timer.current = setTimeout(() => {
      setVisible(false);
      stopSound();
    }, 3600);
    if (typeof Audio === 'undefined') { setSound('unavailable'); return; }
    const audio = new Audio(packaged ? './markets-tv/sfm-ident.wav' : '/markets-tv/sfm-ident.wav');
    track.current = audio;
    void play(audio);
  }, [packaged, play, stopSound]);

  useEffect(() => {
    // Keep the claim across Strict Mode's effect replay, but not component remounts.
    if (startup.current === null) startup.current = claimTvWelcome();
    if (startup.current) start();
    window.addEventListener(TV_WELCOME_EVENT, start);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      stopSound();
      window.removeEventListener(TV_WELCOME_EVENT, start);
    };
  }, [start, stopSound]);

  useEffect(() => {
    const intro = overlay.current;
    if (!visible || !intro) return;
    const retrySound = () => {
      if (sound === 'blocked' && track.current) void play(track.current);
    };
    // Consume remote input while the logo covers account and channel controls.
    const blockBackground = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat && ['Enter', ' '].includes(event.key)) retrySound();
    };
    intro.addEventListener('click', retrySound);
    document.addEventListener('keydown', blockBackground, true);
    return () => {
      intro.removeEventListener('click', retrySound);
      document.removeEventListener('keydown', blockBackground, true);
    };
  }, [visible, revision, sound, play]);

  if (!visible) return null;
  return <div ref={overlay} key={revision} className="sfm-startup" data-sound={sound} aria-label="THE SFM Markets TV">
    <div className="sfm-startup-brand"><TvBrandMark packaged={packaged}/><strong>THE SFM</strong><span>MARKETS TV</span></div>
  </div>;
}
