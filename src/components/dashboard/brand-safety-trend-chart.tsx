'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface TrendData {
  month: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface BrandSafetyTrendChartProps {
  data: TrendData[];
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) => {
  if (!active || !payload) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-zinc-400 text-xs mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-zinc-300 text-xs capitalize">{item.name}</span>
            </div>
            <span className="text-zinc-100 text-xs font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function BrandSafetyTrendChart({ data, className }: BrandSafetyTrendChartProps) {
  const chartData = useMemo(() => {
    // Ensure we have data to display
    if (!data || data.length === 0) {
      // Generate placeholder data for last 6 months
      const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map((month) => ({
        month,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      }));
    }
    return data;
  }, [data]);

  return (
    <div className={cn('bg-zinc-900/50 border border-zinc-800 rounded-xl p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-zinc-300 text-sm font-medium">Brand Safety Trends</h3>
        <div className="flex items-center gap-4">
          {[
            { label: 'Critical', color: '#ef4444' },
            { label: 'High', color: '#f97316' },
            { label: 'Medium', color: '#eab308' },
            { label: 'Low', color: '#22c55e' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-zinc-500 text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#27272a"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 11 }}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="critical"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#18181b' }}
            />
            <Line
              type="monotone"
              dataKey="high"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#f97316', strokeWidth: 2, stroke: '#18181b' }}
            />
            <Line
              type="monotone"
              dataKey="medium"
              stroke="#eab308"
              strokeWidth={2}
              dot={{ r: 3, fill: '#eab308', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#eab308', strokeWidth: 2, stroke: '#18181b' }}
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#22c55e', strokeWidth: 2, stroke: '#18181b' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
