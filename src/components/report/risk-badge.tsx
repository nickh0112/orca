import { cn } from '@/lib/utils';
import { Shield, ShieldAlert, ShieldX, ShieldQuestion } from 'lucide-react';
import type { RiskLevel } from '@/types';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

const config: Record<RiskLevel, { icon: typeof Shield; color: string; bg: string }> = {
  LOW: { icon: Shield, color: 'text-green-400', bg: 'bg-green-950/50 border-green-900' },
  MEDIUM: { icon: ShieldAlert, color: 'text-yellow-400', bg: 'bg-yellow-950/50 border-yellow-900' },
  HIGH: { icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-950/50 border-orange-900' },
  CRITICAL: { icon: ShieldX, color: 'text-red-400', bg: 'bg-red-950/50 border-red-900' },
  UNKNOWN: { icon: ShieldQuestion, color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700' },
};

export function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const { icon: Icon, color, bg } = config[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        color,
        bg,
        {
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-3 py-1 text-sm': size === 'md',
          'px-4 py-1.5 text-base': size === 'lg',
        }
      )}
    >
      <Icon
        className={cn({
          'w-3 h-3': size === 'sm',
          'w-4 h-4': size === 'md',
          'w-5 h-5': size === 'lg',
        })}
      />
      {level}
    </span>
  );
}
