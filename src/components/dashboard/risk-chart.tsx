'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface RiskDistribution {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
}

interface RiskChartProps {
  data: RiskDistribution;
}

const colors = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

export function RiskChart({ data }: RiskChartProps) {
  const chartData = [
    { name: 'Critical', value: data.CRITICAL, fill: colors.CRITICAL },
    { name: 'High', value: data.HIGH, fill: colors.HIGH },
    { name: 'Medium', value: data.MEDIUM, fill: colors.MEDIUM },
    { name: 'Low', value: data.LOW, fill: colors.LOW },
  ];

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">
          Risk Distribution
        </h3>
        <div className="h-48 flex items-center justify-center">
          <p className="text-zinc-500">No data yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">
        Risk Distribution
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fafafa' }}
              itemStyle={{ color: '#a1a1aa' }}
              formatter={(value) => [`${value ?? 0} creators`, 'Count']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between mt-4 text-xs text-zinc-500">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: d.fill }}
            />
            <span>
              {d.name}: {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
