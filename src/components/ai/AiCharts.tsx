'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type CategoryTotal = {
  name: string;
  value: number;
  color: string;
};

type MonthlyPoint = {
  name: string;
  income: number;
  expenses: number;
  savings: number;
  investment: number;
};

type GoalPoint = {
  name: string;
  target: number;
  current: number;
};

export function AiCharts({
  categoryTotals,
  monthlyData,
  goals,
  labels,
  money,
}: {
  categoryTotals: CategoryTotal[];
  monthlyData: MonthlyPoint[];
  goals: GoalPoint[];
  labels: {
    expenses: string;
    income: string;
    goals: string;
  };
  money: (value: number) => string;
}) {
  const tick = { fill: 'var(--chart-label)', fontFamily: 'var(--font-data)', fontSize: 12 };
  const tooltipStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-control)',
    color: 'var(--foreground)',
    fontFamily: 'var(--font-ui)',
  };

  return (
    <div className="ai-chart-grid">
      <ChartBox title={labels.expenses}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={categoryTotals} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82}>
              {categoryTotals.map(item => <Cell key={item.name} fill={item.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => money(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </ChartBox>
      <ChartBox title={`${labels.income} / ${labels.expenses}`}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyData}>
            <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => money(Number(value))} />
            <Area dataKey="income" stroke="var(--success)" fill="var(--success-soft)" />
            <Area dataKey="expenses" stroke="var(--danger)" fill="var(--danger-soft)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartBox>
      <ChartBox title={labels.goals}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={goals.map(goal => ({ name: goal.name, value: goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0 }))}>
            <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${Number(value)}%`} />
            <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </div>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="ai-chart-box"><h3>{title}</h3>{children}</div>;
}

export default AiCharts;
