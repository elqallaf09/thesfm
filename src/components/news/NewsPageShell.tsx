'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import {
  getNewsPageBackground,
  type NewsPageBackgroundCategory,
} from '@/lib/news/pageBackground';

type DivProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

type NewsPageShellProps = {
  children: ReactNode;
  category: NewsPageBackgroundCategory;
  className?: string;
  dir?: HTMLAttributes<HTMLDivElement>['dir'];
  wide?: boolean;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function NewsPageShell({
  children,
  category,
  className,
  dir,
  wide = false,
}: NewsPageShellProps) {
  return (
    <div
      className={classNames('news-page-shell', getNewsPageBackground(category), className)}
      data-news-page-shell="true"
      data-news-category={category}
      data-news-wide={wide ? 'true' : undefined}
      dir={dir}
    >
      <Sidebar />
      {children}
    </div>
  );
}

export function NewsHero({ children, className = '', ...props }: DivProps) {
  return <div className={classNames('news-hero', className)} {...props}>{children}</div>;
}

export function NewsTickerSection({ children, className = '', ...props }: DivProps) {
  return <div className={classNames('news-ticker-section', className)} {...props}>{children}</div>;
}

export function NewsKpiGrid({ children, className = '', ...props }: DivProps) {
  return <div className={classNames('news-kpi-grid', className)} {...props}>{children}</div>;
}

export function NewsFilterBar({ children, className = '', ...props }: DivProps) {
  return <div className={classNames('news-filter-bar', className)} {...props}>{children}</div>;
}

export function NewsGrid({ children, className = '', ...props }: DivProps) {
  return <div className={classNames('news-grid', className)} {...props}>{children}</div>;
}

export function NewsSidePanel({ children, className = '', ...props }: DivProps) {
  return <aside className={classNames('news-side-panel', className)} {...props}>{children}</aside>;
}

export function NewsEmptyState({ children, className = '', ...props }: DivProps) {
  return <section className={classNames('news-empty-state', className)} {...props}>{children}</section>;
}

export function NewsDisclaimer({ children, className = '', ...props }: DivProps) {
  return <footer className={classNames('news-disclaimer', className)} {...props}>{children}</footer>;
}

export default NewsPageShell;
