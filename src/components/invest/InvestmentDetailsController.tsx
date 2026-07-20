'use client';

import dynamic from 'next/dynamic';
import { forwardRef, memo, startTransition, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Investment } from '@/types/investment';

const loadInvestmentDetailDrawer = () => import('./InvestmentDetailDrawer').then(mod => mod.InvestmentDetailDrawer);

const InvestmentDetailDrawer = dynamic(
  loadInvestmentDetailDrawer,
  { ssr: false },
);

type DrawerProps = ComponentProps<typeof InvestmentDetailDrawer>;

interface Props extends Omit<DrawerProps, 'open' | 'investment' | 'accountValue' | 'detailsReady' | 'onClose' | 'refreshing'> {
  accountValue: (item: Investment) => number | null;
  refreshingPriceId: string | null;
}

export type InvestmentDetailsControllerHandle = {
  open: (item: Investment, trigger: HTMLButtonElement) => void;
  update: (item: Investment) => void;
};

export const InvestmentDetailsController = memo(forwardRef<InvestmentDetailsControllerHandle, Props>(function InvestmentDetailsController({
  accountValue,
  refreshingPriceId,
  ...drawerProps
}, ref) {
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [detailsReady, setDetailsReady] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const revealFrameRef = useRef<number | null>(null);

  const cancelDetailsReveal = useCallback(() => {
    if (revealFrameRef.current === null) return;
    window.cancelAnimationFrame(revealFrameRef.current);
    revealFrameRef.current = null;
  }, []);

  const close = useCallback(() => {
    cancelDetailsReveal();
    setDetailsReady(false);
    setInvestment(null);
  }, [cancelDetailsReveal]);

  useImperativeHandle(ref, () => ({
    open(item, trigger) {
      cancelDetailsReveal();
      triggerRef.current = trigger;
      setDetailsReady(false);
      setInvestment(item);
      revealFrameRef.current = window.requestAnimationFrame(() => {
        revealFrameRef.current = window.requestAnimationFrame(() => {
          revealFrameRef.current = null;
          startTransition(() => setDetailsReady(true));
        });
      });
    },
    update(item) {
      setInvestment(current => current?.id === item.id ? item : current);
    },
  }), [cancelDetailsReveal]);

  useEffect(() => {
    let cancelled = false;
    const warmDrawer = () => {
      if (!cancelled) void loadInvestmentDetailDrawer();
    };

    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(warmDrawer, { timeout: 1200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(handle);
      };
    }

    const handle = window.setTimeout(warmDrawer, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, []);

  useEffect(() => () => cancelDetailsReveal(), [cancelDetailsReveal]);

  useEffect(() => {
    if (investment || !triggerRef.current) return;
    triggerRef.current.focus({ preventScroll: true });
    triggerRef.current = null;
  }, [investment]);

  return (
    <InvestmentDetailDrawer
      {...drawerProps}
      open={Boolean(investment)}
      investment={investment}
      accountValue={investment ? accountValue(investment) : null}
      detailsReady={detailsReady}
      onClose={close}
      refreshing={Boolean(investment && refreshingPriceId === investment.id)}
    />
  );
}));

InvestmentDetailsController.displayName = 'InvestmentDetailsController';
