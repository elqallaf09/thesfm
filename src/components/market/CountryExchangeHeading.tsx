'use client';

import type { ReactNode } from 'react';

type CountryExchangeHeadingProps = {
  label: string;
  itemCount: number;
  status?: ReactNode;
  id?: string;
};

export function CountryExchangeHeading({ label, itemCount, status, id }: CountryExchangeHeadingProps) {
  return (
    <div className="gm-strip-heading" id={id}>
      <h3 className="gm-strip-heading-label" dir="auto" title={label}>{label}</h3>
      <div className="gm-strip-heading-meta">
        <span className="gm-strip-heading-count" dir="ltr">{itemCount}</span>
        {status}
      </div>

      <style jsx>{`
        .gm-strip-heading {
          min-inline-size: 0;
          block-size: 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }

        .gm-strip-heading-label {
          min-inline-size: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 0;
          color: var(--foreground);
          font-size: var(--fs-label, 13px);
          font-weight: 700;
          line-height: var(--lh-label, 20px);
        }

        .gm-strip-heading-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 0 0 auto;
        }

        .gm-strip-heading-count {
          inline-size: 3ch;
          text-align: center;
          font-variant-numeric: tabular-nums;
          color: var(--foreground-muted);
          font-size: var(--fs-caption, 12px);
          font-weight: 500;
          font-family: var(--font-data);line-height:var(--lh-caption, 18px);
        }
      `}</style>
    </div>
  );
}

export default CountryExchangeHeading;
