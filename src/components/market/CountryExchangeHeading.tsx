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
      <h3 className="gm-strip-heading-label" dir="auto">{label}</h3>
      <div className="gm-strip-heading-meta">
        <span className="gm-strip-heading-count" dir="ltr">{itemCount}</span>
        {status}
      </div>

      <style jsx>{`
        .gm-strip-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }

        .gm-strip-heading-label {
          margin: 0;
          color: var(--foreground);
          font-size: 13.5px;
          font-weight: 700;
          line-height: 1.3;
        }

        .gm-strip-heading-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 0 0 auto;
        }

        .gm-strip-heading-count {
          color: var(--foreground-muted);
          font-size: 11px;
          font-weight: 500;
          font-family: var(--font-data);
        }
      `}</style>
    </div>
  );
}

export default CountryExchangeHeading;
