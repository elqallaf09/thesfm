import type { ReactNode } from 'react';
import './score-contrast.css';

type AiLayoutProps = {
  children: ReactNode;
};

export default function AiLayout({ children }: AiLayoutProps) {
  return <>{children}</>;
}
