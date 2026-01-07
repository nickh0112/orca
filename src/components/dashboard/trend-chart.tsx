'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface TrendData {
  month: string;
  batchCount: number;
}

interface TrendChartProps {
  data: TrendData[];
}

export function TrendChart({ data }: TrendChartProps) {
  // Format month labels (2024-01 -> Jan)
  const formattedData = data.map((d) => ({
    ...d,
    label: new Date(d.month + '-01').toLocaleDateString('en-US', {
      month: 'short',
    }),
  }));

  const maxValue = Math.max(...data.map((d) => d.batchCount), 5);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">
        Activity Trend (Last 6 Months)
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              domain={[0, maxValue]}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fafafa' }}
              itemStyle={{ color: '#a1a1aa' }}
              formatter={(value) => [`${value ?? 0} batches`, 'Batches']}
            />
            <Line
              type="monotone"
              dataKey="batchCount"
              stroke="#eafc41"
              strokeWidth={2}
              dot={{ fill: '#eafc41', strokeWidth: 0, r: 4 }}
              activeDot={{ fill: '#eafc41', strokeWidth: 0, r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
