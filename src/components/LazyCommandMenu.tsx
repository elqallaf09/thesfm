'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const CommandMenu = dynamic(() => import('@/components/CommandMenu').then(mod => mod.CommandMenu), {
  ssr: false,
});

export function LazyCommandMenu() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const open = () => setEnabled(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setEnabled(true);
      }
    };
    window.addEventListener('sfm:open-command-menu', open);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('sfm:open-command-menu', open);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return enabled ? <CommandMenu defaultOpen /> : null;
}

export default LazyCommandMenu;

