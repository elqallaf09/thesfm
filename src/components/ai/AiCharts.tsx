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
  return (
    <div className="ai-chart-grid">
      <ChartBox title={labels.expenses}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={categoryTotals} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82}>
              {categoryTotals.map(item => <Cell key={item.name} fill={item.color} />)}
            </Pie>
            <Tooltip formatter={(value: number) => money(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </ChartBox>
      <ChartBox title={`${labels.income} / ${labels.expenses}`}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyData}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value: number) => money(Number(value))} />
            <Area dataKey="income" stroke="#22C55E" fill="#22C55E33" />
            <Area dataKey="expenses" stroke="#EF4444" fill="#EF444433" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartBox>
      <ChartBox title={labels.goals}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={goals.map(goal => ({ name: goal.name, value: goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0 }))}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value: number) => `${Number(value)}%`} />
            <Bar dataKey="value" fill="var(--sfm-soft-cyan)" radius={[10, 10, 0, 0]} />
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
