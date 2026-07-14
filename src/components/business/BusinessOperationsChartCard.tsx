'use client';

import Link from 'next/link';
import { BarChart3, Plus } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BUSINESS_TEXT } from '@/lib/businessOperations';
import { formatMoney } from '@/lib/formatMoney';

export default function BusinessOperationsChartCard({
  title,
  data,
  currency,
  lang,
  variant = 'bar',
  emptyActionHref = '/sales',
  emptyActionLabel,
}: {
  title: string;
  data: Array<{ name: string; value: number; label?: string }>;
  currency: string;
  lang: 'ar' | 'en' | 'fr';
  variant?: 'bar' | 'pie';
  emptyActionHref?: string;
  emptyActionLabel?: string;
}) {
  const text = BUSINESS_TEXT[lang];
  const hasData = data.some((item) => item.value > 0);
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
  const chartRows = data.map((item) => ({ ...item, label: item.label ?? item.name }));
  const tick = { fill: 'var(--chart-label)', fontFamily: 'var(--font-data)', fontSize: 12 };
  const tooltipStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-control)',
    color: 'var(--foreground)',
    fontFamily: 'var(--font-ui)',
  };

  return (
    <article className="business-chart-card">
      <div className="business-section-heading">
        <h2><BarChart3 size={18} aria-hidden="true" />{title}</h2>
      </div>
      {!hasData ? (
        <div className="business-chart-empty">
          <span className="business-chart-empty-icon" aria-hidden="true"><BarChart3 size={24} /></span>
          <strong>{text.insufficientChartData}</strong>
          <p>{text.chartEmptyBody}</p>
          <Link className="business-chart-empty-action" href={emptyActionHref}>
            <Plus size={15} aria-hidden="true" />
            {emptyActionLabel ?? text.addSale}
          </Link>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          {variant === 'pie' ? (
            <PieChart>
              <Pie data={chartRows} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={3}>
                {chartRows.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--foreground-secondary)' }}
                formatter={(value) => formatMoney(Number(value), currency, lang)}
              />
            </PieChart>
          ) : (
            <BarChart data={chartRows}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} />
              <YAxis tickLine={false} axisLine={false} tick={tick} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--foreground-secondary)' }}
                formatter={(value) => formatMoney(Number(value), currency, lang)}
              />
              <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </article>
  );
}
