'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const CommandMenu = dynamic(() => import('@/components/CommandMenu').then(mod => mod.CommandMenu), {
  ssr: false,
});

export function LazyCommandMenu() {
  const [request, setRequest] = useState<{ focusOrigin: HTMLElement | null } | null>(null);

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<{ focusOrigin?: HTMLElement | null }>).detail;
      setRequest(current => current ?? {
        focusOrigin: detail?.focusOrigin
          ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null),
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setRequest(current => current ?? {
          focusOrigin: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        });
      }
    };
    window.addEventListener('sfm:open-command-menu', open);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('sfm:open-command-menu', open);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return request ? <CommandMenu defaultOpen initialFocusOrigin={request.focusOrigin} /> : null;
}

export default LazyCommandMenu;

