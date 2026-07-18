'use client';

import dynamic from 'next/dynamic';
import { forwardRef, memo, startTransition, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Investment } from '@/types/investment';

const InvestmentDetailDrawer = dynamic(
  () => import('./InvestmentDetailDrawer').then(mod => mod.InvestmentDetailDrawer),
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
