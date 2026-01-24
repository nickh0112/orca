'use client';

import { cn } from '@/lib/utils';

interface RiskLevelBarProps {
  critical: number;
  high: number;
  medium: number;
  low: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface SegmentProps {
  count: number;
  total: number;
  color: string;
  hatchColor: string;
  label: string;
  showLabel: boolean;
  size: 'sm' | 'md' | 'lg';
}

function Segment({ count, total, color, hatchColor, label, showLabel, size }: SegmentProps) {
  if (count === 0) return null;

  const percentage = (count / total) * 100;
  const minWidth = size === 'sm' ? 8 : size === 'md' ? 12 : 16;

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div
      className={cn('relative group', heights[size])}
      style={{ width: `max(${percentage}%, ${minWidth}px)` }}
    >
      {/* Base color */}
      <div className={cn('absolute inset-0 rounded-sm', color)} />

      {/* Diagonal hatch pattern overlay */}
      <div
        className="absolute inset-0 rounded-sm opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            ${hatchColor} 2px,
            ${hatchColor} 4px
          )`,
        }}
      />

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-zinc-200 text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg border border-zinc-700/50">
        {count} {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-zinc-800 rotate-45 border-r border-b border-zinc-700/50" />
      </div>

      {/* Label inside segment for large size */}
      {showLabel && size === 'lg' && percentage > 15 && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white/90 drop-shadow-sm">
          {count}
        </span>
      )}
    </div>
  );
}

export function RiskLevelBar({
  critical,
  high,
  medium,
  low,
  showLabels = false,
  size = 'md',
  className,
}: RiskLevelBarProps) {
  const total = critical + high + medium + low;

  if (total === 0) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn(
          'flex-1 rounded-full bg-zinc-800',
          size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2.5' : 'h-4'
        )} />
        {showLabels && (
          <span className="text-xs text-zinc-500">No findings</span>
        )}
      </div>
    );
  }

  const segments = [
    { count: critical, color: 'bg-red-500', hatchColor: 'rgba(127,29,29,0.8)', label: 'Critical' },
    { count: high, color: 'bg-orange-500', hatchColor: 'rgba(154,52,18,0.8)', label: 'High' },
    { count: medium, color: 'bg-amber-500', hatchColor: 'rgba(146,64,14,0.8)', label: 'Medium' },
    { count: low, color: 'bg-emerald-500', hatchColor: 'rgba(6,78,59,0.8)', label: 'Low' },
  ];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn(
        'flex-1 flex gap-0.5 rounded-full overflow-hidden bg-zinc-800/50',
        size === 'sm' ? 'p-0.5' : 'p-0.5'
      )}>
        {segments.map((segment) => (
          <Segment
            key={segment.label}
            count={segment.count}
            total={total}
            color={segment.color}
            hatchColor={segment.hatchColor}
            label={segment.label}
            showLabel={showLabels}
            size={size}
          />
        ))}
      </div>

      {showLabels && (
        <div className="flex items-center gap-3 text-xs shrink-0">
          {critical > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-zinc-400">{critical}</span>
            </span>
          )}
          {high > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-zinc-400">{high}</span>
            </span>
          )}
          {medium > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-zinc-400">{medium}</span>
            </span>
          )}
          {low > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-zinc-400">{low}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for table cells
export function RiskLevelBarCompact({
  critical,
  high,
  medium,
  low,
  className,
}: Omit<RiskLevelBarProps, 'showLabels' | 'size'>) {
  const total = critical + high + medium + low;

  if (total === 0) {
    return (
      <div className={cn('w-24 h-1.5 rounded-full bg-zinc-800', className)} />
    );
  }

  return (
    <div className={cn('w-24 flex gap-px rounded-full overflow-hidden', className)}>
      {critical > 0 && (
        <div
          className="h-1.5 bg-red-500"
          style={{ width: `${(critical / total) * 100}%`, minWidth: '4px' }}
        />
      )}
      {high > 0 && (
        <div
          className="h-1.5 bg-orange-500"
          style={{ width: `${(high / total) * 100}%`, minWidth: '4px' }}
        />
      )}
      {medium > 0 && (
        <div
          className="h-1.5 bg-amber-500"
          style={{ width: `${(medium / total) * 100}%`, minWidth: '4px' }}
        />
      )}
      {low > 0 && (
        <div
          className="h-1.5 bg-emerald-500"
          style={{ width: `${(low / total) * 100}%`, minWidth: '4px' }}
        />
      )}
    </div>
  );
}
