import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-zinc-900 border border-zinc-800 rounded-xl p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400 mb-1">{title}</p>
          <p className="text-3xl font-semibold text-zinc-50">{value}</p>
          {subtitle && (
            <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-sm mt-2',
                trend.isPositive ? 'text-green-400' : 'text-red-400'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className="p-3 bg-zinc-800 rounded-lg">
          <Icon className="w-5 h-5 text-zinc-400" />
        </div>
      </div>
    </div>
  );
}
