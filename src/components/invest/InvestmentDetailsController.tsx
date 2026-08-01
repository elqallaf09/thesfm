'use client';

import dynamic from 'next/dynamic';
import { forwardRef, memo, startTransition, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Investment } from '@/types/investment';

const loadInvestmentDetailDrawer = () => import('./InvestmentDetailDrawer').then(mod => mod.InvestmentDetailDrawer);

const InvestmentDetailDrawer = dynamic(loadInvestmentDetailDrawer, { ssr: false });

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
      // One frame is enough to let the empty drawer shell and backdrop paint
      // before the (heavier) populated content commits, avoiding jank from
      // both landing in the same frame; a second frame here only doubled the
      // guaranteed minimum reveal latency without buying additional safety.
      revealFrameRef.current = window.requestAnimationFrame(() => {
        revealFrameRef.current = null;
        startTransition(() => setDetailsReady(true));
      });
    },
    update(item) {
      setInvestment(current => current?.id === item.id ? item : current);
    },
  }), [cancelDetailsReveal]);

  useEffect(() => () => cancelDetailsReveal(), [cancelDetailsReveal]);

  useEffect(() => {
    // The drawer's code-split chunk otherwise loads on first open, so its
    // fetch+parse+eval cost lands entirely inside that click's presentation
    // delay. Warming it once the list has mounted moves that cost off the
    // interaction's critical path; it's the same module `dynamic()` above
    // loads, so this primes its cache rather than fetching it twice.
    void loadInvestmentDetailDrawer();
  }, []);

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
