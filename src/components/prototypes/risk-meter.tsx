'use client';

import { cn } from '@/lib/utils';
import { Scale, ShieldAlert, FileText, Flag } from 'lucide-react';

interface RiskMeterProps {
  label: string;
  score: number; // 0-5
  maxScore?: number;
  variant?: 'dots' | 'bar' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

function getScoreColor(score: number, max: number): 'green' | 'yellow' | 'orange' | 'red' {
  const ratio = score / max;
  if (ratio <= 0.25) return 'green';
  if (ratio <= 0.5) return 'yellow';
  if (ratio <= 0.75) return 'orange';
  return 'red';
}

const colorClasses = {
  green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500' },
  red: { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
};

export function RiskMeter({
  label,
  score,
  maxScore = 5,
  variant = 'dots',
  size = 'md',
  showLabel = true,
  icon,
  className,
}: RiskMeterProps) {
  const color = getScoreColor(score, maxScore);
  const colors = colorClasses[color];

  const sizeClasses = {
    sm: { dot: 'w-2 h-2', bar: 'h-1', text: 'text-xs' },
    md: { dot: 'w-3 h-3', bar: 'h-2', text: 'text-sm' },
    lg: { dot: 'w-4 h-4', bar: 'h-3', text: 'text-base' },
  };

  const sizes = sizeClasses[size];

  if (variant === 'bar') {
    const percentage = (score / maxScore) * 100;
    return (
      <div className={cn('space-y-1', className)}>
        {showLabel && (
          <div className="flex items-center justify-between">
            <span className={cn('text-zinc-400', sizes.text)}>{label}</span>
            <span className={cn(colors.text, sizes.text, 'font-medium')}>{score}/{maxScore}</span>
          </div>
        )}
        <div className={cn('w-full bg-zinc-800 rounded-full overflow-hidden', sizes.bar)}>
          <div
            className={cn('h-full rounded-full transition-all duration-500', colors.bg)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  if (variant === 'circular') {
    const percentage = (score / maxScore) * 100;
    const circumference = 2 * Math.PI * 40; // radius = 40
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className={cn('flex flex-col items-center', className)}>
        <div className="relative w-24 h-24">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-zinc-800"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={cn(
                'transition-all duration-500',
                color === 'green' && 'text-green-500',
                color === 'yellow' && 'text-yellow-500',
                color === 'orange' && 'text-orange-500',
                color === 'red' && 'text-red-500',
              )}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-2xl font-bold', colors.text)}>{score}</span>
            <span className="text-xs text-zinc-500">/ {maxScore}</span>
          </div>
        </div>
        {showLabel && (
          <span className="mt-2 text-sm text-zinc-400">{label}</span>
        )}
      </div>
    );
  }

  // Default: dots variant
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showLabel && (
        <div className="flex items-center gap-1.5">
          {icon}
          <span className={cn('text-zinc-400', sizes.text)}>{label}</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {Array.from({ length: maxScore }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'rounded-full transition-colors',
              sizes.dot,
              i < score ? colors.bg : 'bg-zinc-700'
            )}
          />
        ))}
      </div>
    </div>
  );
}

// Category risk meters preset
interface CategoryRiskMetersProps {
  scores: {
    legal: number;
    brandSafety: number;
    content: number;
    political: number;
  };
  variant?: 'dots' | 'bar' | 'circular';
  layout?: 'horizontal' | 'vertical' | 'grid';
  className?: string;
}

export function CategoryRiskMeters({
  scores,
  variant = 'dots',
  layout = 'horizontal',
  className,
}: CategoryRiskMetersProps) {
  const categories = [
    { key: 'legal', label: 'Legal', icon: <Scale className="w-4 h-4 text-zinc-500" />, score: scores.legal },
    { key: 'brandSafety', label: 'Brand Safety', icon: <ShieldAlert className="w-4 h-4 text-zinc-500" />, score: scores.brandSafety },
    { key: 'content', label: 'Content', icon: <FileText className="w-4 h-4 text-zinc-500" />, score: scores.content },
    { key: 'political', label: 'Political', icon: <Flag className="w-4 h-4 text-zinc-500" />, score: scores.political },
  ];

  const layoutClasses = {
    horizontal: 'flex items-center gap-6',
    vertical: 'flex flex-col gap-4',
    grid: 'grid grid-cols-2 gap-4',
  };

  return (
    <div className={cn(layoutClasses[layout], className)}>
      {categories.map((cat) => (
        <RiskMeter
          key={cat.key}
          label={cat.label}
          score={cat.score}
          variant={variant}
          icon={cat.icon}
        />
      ))}
    </div>
  );
}

// Risk Radar visualization (for command center)
interface RiskRadarProps {
  scores: {
    legal: number;
    brandSafety: number;
    content: number;
    political: number;
  };
  size?: number;
  className?: string;
}

export function RiskRadar({ scores, size = 200, className }: RiskRadarProps) {
  const center = size / 2;
  const maxRadius = (size / 2) - 20;

  const categories = [
    { key: 'legal', label: 'Legal', angle: -90, score: scores.legal },
    { key: 'brandSafety', label: 'Brand', angle: 0, score: scores.brandSafety },
    { key: 'content', label: 'Content', angle: 90, score: scores.content },
    { key: 'political', label: 'Political', angle: 180, score: scores.political },
  ];

  const getPoint = (angle: number, score: number) => {
    const radius = (score / 5) * maxRadius;
    const radians = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians),
    };
  };

  const points = categories.map(cat => getPoint(cat.angle, cat.score));
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        {/* Background rings */}
        {[1, 2, 3, 4, 5].map((ring) => (
          <circle
            key={ring}
            cx={center}
            cy={center}
            r={(ring / 5) * maxRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-zinc-800"
          />
        ))}

        {/* Axis lines */}
        {categories.map((cat) => {
          const end = getPoint(cat.angle, 5);
          return (
            <line
              key={cat.key}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-zinc-700"
            />
          );
        })}

        {/* Data polygon */}
        <path
          d={pathData}
          fill="currentColor"
          fillOpacity="0.3"
          stroke="currentColor"
          strokeWidth="2"
          className="text-red-500"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="currentColor"
            className="text-red-400"
          />
        ))}
      </svg>

      {/* Labels */}
      {categories.map((cat) => {
        const labelOffset = maxRadius + 15;
        const pos = getPoint(cat.angle, 5);
        const labelX = center + ((pos.x - center) / maxRadius) * labelOffset;
        const labelY = center + ((pos.y - center) / maxRadius) * labelOffset;

        return (
          <div
            key={cat.key}
            className="absolute text-xs text-zinc-400 transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: labelX, top: labelY }}
          >
            {cat.label}
          </div>
        );
      })}
    </div>
  );
}
