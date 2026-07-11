'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useOperationsCenterState } from '@/hooks/useOperationsCenterState';

type OperationsCenterContextValue = ReturnType<typeof useOperationsCenterState>;

const OperationsCenterContext = createContext<OperationsCenterContextValue | null>(null);

/** Mounted once at the Operations Center page root — every tab reads the same polled snapshot. */
export function OperationsCenterStateProvider({ children }: { children: ReactNode }) {
  const value = useOperationsCenterState();
  return <OperationsCenterContext.Provider value={value}>{children}</OperationsCenterContext.Provider>;
}

export function useOperationsCenterContext() {
  const context = useContext(OperationsCenterContext);
  if (!context) {
    throw new Error('useOperationsCenterContext must be used within an OperationsCenterStateProvider');
  }
  return context;
}
