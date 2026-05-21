'use client';

import type { ReactNode } from 'react';

interface SettingsCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  danger?: boolean;
}

export function SettingsCard({ icon, title, subtitle, children, danger }: SettingsCardProps) {
  return (
    <section className={`sc${danger ? ' sc-danger' : ''}`}>
      <div className="sc-head">
        <span className="sc-icon">{icon}</span>
        <div className="sc-text">
          <h2 className="sc-title">{title}</h2>
          {subtitle && <p className="sc-sub">{subtitle}</p>}
        </div>
      </div>
      <div className="sc-body">{children}</div>
      <style jsx>{`
        .sc {
          background: rgba(255, 253, 248, 0.92);
          border: 1px solid rgba(190, 149, 82, 0.2);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 12px 36px rgba(75, 51, 29, 0.07);
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
        }
        .sc-danger {
          background: #fff5f3;
          border-color: #f0c0b8;
        }
        .sc-head {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
        }
        .sc-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(216, 174, 99, 0.12);
          display: grid;
          place-items: center;
          color: #c99b4f;
          flex-shrink: 0;
        }
        .sc-danger .sc-icon {
          background: rgba(220, 80, 60, 0.1);
          color: #b93d2d;
        }
        .sc-title {
          font-size: 15px;
          font-weight: 900;
          margin: 0 0 3px;
          color: #1d1207;
        }
        .sc-sub {
          font-size: 11.5px;
          color: #8a7764;
          margin: 0;
          line-height: 1.5;
        }
        .sc-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
      `}</style>
    </section>
  );
}
