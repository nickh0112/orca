'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { BatchStatus, RiskLevel } from '@/types';

interface CampaignCardProps {
  id: string;
  name: string;
  clientName?: string | null;
  status: BatchStatus;
  creatorCount: number;
  completedCount: number;
  riskBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  createdAt: string | Date;
  className?: string;
}

function getStatusIcon(status: BatchStatus) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle size={14} className="text-emerald-500" />;
    case 'PROCESSING':
      return <Loader2 size={14} className="text-blue-500 animate-spin" />;
    case 'FAILED':
      return <AlertTriangle size={14} className="text-red-500" />;
    default:
      return <Clock size={14} className="text-zinc-500" />;
  }
}

function getStatusLabel(status: BatchStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'Completed';
    case 'PROCESSING':
      return 'Processing';
    case 'FAILED':
      return 'Failed';
    default:
      return 'Pending';
  }
}

export function CampaignCard({
  id,
  name,
  clientName,
  status,
  creatorCount,
  completedCount,
  riskBreakdown,
  createdAt,
  className,
}: CampaignCardProps) {
  const locale = useLocale();
  const progress = creatorCount > 0 ? (completedCount / creatorCount) * 100 : 0;
  const total = riskBreakdown.critical + riskBreakdown.high + riskBreakdown.medium + riskBreakdown.low;
  const highRiskCount = riskBreakdown.critical + riskBreakdown.high;

  // Determine primary color based on dominant risk
  const getProgressColor = () => {
    if (status !== 'COMPLETED') return 'bg-blue-500';
    if (riskBreakdown.critical > 0) return 'bg-red-500';
    if (riskBreakdown.high > 0) return 'bg-orange-500';
    if (riskBreakdown.medium > 0) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <Link href={`/${locale}/batches/${id}`}>
      <div
        className={cn(
          'group relative bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 transition-all duration-200',
          'hover:bg-zinc-900 hover:border-zinc-700',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-zinc-200 text-sm font-medium truncate group-hover:text-white transition-colors">
              {name}
            </h4>
            {clientName && (
              <p className="text-zinc-500 text-xs mt-0.5">{clientName}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-3 shrink-0">
            {getStatusIcon(status)}
            <span className="text-zinc-500 text-xs">{getStatusLabel(status)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
          <div
            className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-500', getProgressColor())}
            style={{ width: `${progress}%` }}
          />
          {status === 'PROCESSING' && (
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-zinc-400">
              {completedCount}/{creatorCount} creators
            </span>
            {status === 'COMPLETED' && highRiskCount > 0 && (
              <span className="text-red-400">
                {highRiskCount} high risk
              </span>
            )}
          </div>
          <span className="text-zinc-600">
            {formatDate(new Date(createdAt))}
          </span>
        </div>

        {/* Risk mini-bar for completed */}
        {status === 'COMPLETED' && total > 0 && (
          <div className="flex gap-0.5 mt-3 h-1 rounded-full overflow-hidden">
            {riskBreakdown.critical > 0 && (
              <div
                className="bg-red-500"
                style={{ width: `${(riskBreakdown.critical / total) * 100}%` }}
              />
            )}
            {riskBreakdown.high > 0 && (
              <div
                className="bg-orange-500"
                style={{ width: `${(riskBreakdown.high / total) * 100}%` }}
              />
            )}
            {riskBreakdown.medium > 0 && (
              <div
                className="bg-amber-500"
                style={{ width: `${(riskBreakdown.medium / total) * 100}%` }}
              />
            )}
            {riskBreakdown.low > 0 && (
              <div
                className="bg-emerald-500"
                style={{ width: `${(riskBreakdown.low / total) * 100}%` }}
              />
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
