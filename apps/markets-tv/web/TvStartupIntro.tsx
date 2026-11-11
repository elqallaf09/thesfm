import React, { useEffect, useState } from 'react';

/** Lightweight, dismissible startup ident using the bundled official brand asset. */
export function TvStartupIntro({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const finish = () => setVisible(false);
    const timer = window.setTimeout(finish, 2700);
    window.addEventListener('keydown', finish, { once: true });
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', finish); };
  }, []);
  return <>
    {children}
    {visible && <div className="sfm-startup" role="presentation" onClick={() => setVisible(false)}>
      <div className="sfm-startup-brand">
        <img src="./markets-tv/sfm-logo.png" alt="" />
        <div className="sfm-startup-wordmark"><strong>THE SFM</strong><span>MARKETS TV</span></div>
      </div>
    </div>}
  </>;
}
