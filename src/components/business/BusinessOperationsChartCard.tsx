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
  const colors = ['#1D8CFF', '#18D4D4', '#10B981', '#F59E0B', '#8B5CF6'];
  const chartRows = data.map((item) => ({ ...item, label: item.label ?? item.name }));

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
              <Tooltip formatter={(value) => formatMoney(Number(value), currency, lang)} />
            </PieChart>
          ) : (
            <BarChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatMoney(Number(value), currency, lang)} />
              <Bar dataKey="value" fill="#1D8CFF" radius={[10, 10, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </article>
  );
}
