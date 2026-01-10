'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import type { Severity, RiskLevel } from '@/lib/dummy-report-data';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

const severityConfig: Record<Severity, {
  label: string;
  icon: typeof AlertTriangle;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  critical: {
    label: 'Critical',
    icon: AlertOctagon,
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/50',
  },
  high: {
    label: 'High',
    icon: AlertTriangle,
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/50',
  },
  medium: {
    label: 'Medium',
    icon: AlertCircle,
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/50',
  },
  low: {
    label: 'Low',
    icon: CheckCircle2,
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/50',
  },
};

const sizeConfig = {
  sm: { badge: 'px-1.5 py-0.5 text-xs', icon: 'w-3 h-3' },
  md: { badge: 'px-2 py-1 text-sm', icon: 'w-4 h-4' },
  lg: { badge: 'px-3 py-1.5 text-base', icon: 'w-5 h-5' },
};

export function SeverityBadge({
  severity,
  size = 'md',
  showIcon = true,
  showLabel = true,
  className,
}: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeStyles.badge,
        className
      )}
    >
      {showIcon && <Icon className={sizeStyles.icon} />}
      {showLabel && config.label}
    </span>
  );
}

// Risk Level Badge (for overall creator risk)
interface RiskLevelBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const riskLevelConfig: Record<RiskLevel, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
}> = {
  CRITICAL: {
    label: 'CRITICAL',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    borderColor: 'border-red-500',
    glowColor: 'shadow-red-500/20',
  },
  HIGH: {
    label: 'HIGH',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500',
    glowColor: 'shadow-orange-500/20',
  },
  MEDIUM: {
    label: 'MEDIUM',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500',
    glowColor: 'shadow-yellow-500/20',
  },
  LOW: {
    label: 'LOW',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400',
    borderColor: 'border-green-500',
    glowColor: 'shadow-green-500/20',
  },
};

const riskSizeConfig = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
  xl: 'px-6 py-2 text-lg',
};

export function RiskLevelBadge({
  level,
  size = 'md',
  className,
}: RiskLevelBadgeProps) {
  const config = riskLevelConfig[level];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border-2 font-bold tracking-wider shadow-lg',
        config.bgColor,
        config.textColor,
        config.borderColor,
        config.glowColor,
        riskSizeConfig[size],
        className
      )}
    >
      {config.label}
    </span>
  );
}

// Pulsing indicator for critical alerts
export function PulsingDot({ severity }: { severity: Severity }) {
  const colors: Record<Severity, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };

  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={cn(
          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
          colors[severity]
        )}
      />
      <span
        className={cn(
          'relative inline-flex rounded-full h-2.5 w-2.5',
          colors[severity]
        )}
      />
    </span>
  );
}
