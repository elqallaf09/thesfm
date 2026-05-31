'use client';

import type { ReactNode } from 'react';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type DistributionPoint = {
  name: string;
  value: number;
  color: string;
};

type ValuePoint = {
  name: string;
  value: number;
};

type ProjectionPoint = {
  month: string;
  value: number;
};

export default function InvestPerformanceCharts({
  distribution,
  values,
  projection,
  canShowProjection,
  titles,
  fallbackText,
  money,
}: {
  distribution: DistributionPoint[];
  values: ValuePoint[];
  projection: ProjectionPoint[];
  canShowProjection: boolean;
  titles: {
    distribution: string;
    byInvestment: string;
    projection12: string;
  };
  fallbackText: string;
  money: (value: number) => string;
}) {
  return (
    <section className="invest-chart-grid">
      <ChartCard icon={<PieChartIcon size={18} />} title={titles.distribution}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={3}>
              {distribution.map(item => <Cell key={item.name} fill={item.color} />)}
            </Pie>
            <Tooltip formatter={(value: number) => money(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard icon={<BarChart3 size={18} />} title={titles.byInvestment}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={values}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={value => String(Math.round(Number(value)))} tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value: number) => money(Number(value))} />
            <Bar dataKey="value" fill="var(--sfm-soft-cyan)" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard icon={<LineChartIcon size={18} />} title={titles.projection12}>
        {canShowProjection ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={projection}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={value => String(Math.round(Number(value)))} tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => money(Number(value))} />
              <Line type="monotone" dataKey="value" stroke="var(--sfm-muted)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="invest-empty-chart">{fallbackText}</div>
        )}
      </ChartCard>
    </section>
  );
}

function ChartCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="invest-panel invest-chart-card">
      <div className="invest-section-head">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
