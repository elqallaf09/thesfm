'use client';

import { BarChart3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BUSINESS_TEXT } from '@/lib/businessOperations';
import { formatMoney } from '@/lib/formatMoney';

export default function SalesChartCard({
  title,
  data,
  currency,
  lang,
  variant = 'bar',
}: {
  title: string;
  data: Array<{ name: string; value: number; label?: string }>;
  currency: string;
  lang: 'ar' | 'en' | 'fr';
  variant?: 'bar' | 'pie';
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
        <p className="business-chart-empty">{text.insufficientChartData}</p>
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
