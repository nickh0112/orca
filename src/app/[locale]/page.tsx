'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { User, UsersRound, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useUserEmail } from '@/hooks/use-user-email';
import { BatchesTable } from '@/components/dashboard/batches-table';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { BatchStatus } from '@/types';

interface DashboardStats {
  summary: {
    totalCreators: number;
    batchesThisMonth: number;
    avgRiskScore: number;
    successRate: number;
  };
  teamActivity: Array<{
    userEmail: string;
    batchCount: number;
    creatorCount: number;
    completionRate: number;
    lastActive: string | null;
  }>;
  riskDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  activityTrend: Array<{
    month: string;
    batchCount: number;
  }>;
  recentBatches: Array<{
    id: string;
    name: string;
    clientName?: string | null;
    creatorCount: number;
    completedCount?: number;
    userEmail: string | null;
    createdAt: string;
    status: BatchStatus;
    riskBreakdown?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }>;
}

function StatCard({
  label,
  value,
  trend,
  trendLabel,
  color = 'default',
}: {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    default: 'text-zinc-100',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <p className={cn('text-2xl font-light', colorClasses[color])}>{value}</p>
        {trend && trendLabel && (
          <div className={cn(
            'flex items-center gap-1 text-xs',
            trend === 'up' ? 'text-emerald-500' :
            trend === 'down' ? 'text-red-500' : 'text-zinc-500'
          )}>
            {trend === 'up' && <TrendingUp size={12} />}
            {trend === 'down' && <TrendingDown size={12} />}
            {trend === 'neutral' && <Minus size={12} />}
            <span>{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function getRiskLabel(score: number): { label: string; color: 'success' | 'warning' | 'danger' | 'default' } {
  if (score < 1.5) return { label: 'Low', color: 'success' };
  if (score < 2.5) return { label: 'Medium', color: 'warning' };
  if (score < 3.5) return { label: 'High', color: 'danger' };
  return { label: 'Critical', color: 'danger' };
}

type ViewMode = 'team' | 'personal';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('team');
  const { email, hasEmail } = useUserEmail();
  const t = useTranslations('dashboard');
  const locale = useLocale();

  useEffect(() => {
    setIsLoading(true);
    const url = viewMode === 'personal' && email
      ? `/api/dashboard/stats?userEmail=${encodeURIComponent(email)}`
      : '/api/dashboard/stats';

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.summary) {
          setStats(data);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [viewMode, email]);

  // Transform data for BatchesTable
  const batchesForTable = useMemo(() => {
    if (!stats?.recentBatches) return [];

    return stats.recentBatches.slice(0, 8).map((batch) => ({
      id: batch.id,
      name: batch.name,
      status: batch.status,
      userEmail: batch.userEmail,
      clientName: batch.clientName ?? null,
      createdAt: batch.createdAt,  // Keep as string, not Date
      completedAt: null,
      completedCount: batch.completedCount || (batch.status === 'COMPLETED' ? batch.creatorCount : 0),
      riskBreakdown: batch.riskBreakdown || { critical: 0, high: 0, medium: 0, low: 0 },
      _count: { creators: batch.creatorCount },
    }));
  }, [stats?.recentBatches]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">{t('failedToLoad')}</p>
      </div>
    );
  }

  const riskInfo = stats.summary.avgRiskScore > 0
    ? getRiskLabel(stats.summary.avgRiskScore)
    : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="h-full p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-zinc-100 text-xl font-medium tracking-tight mb-1">
              {viewMode === 'personal' ? t('personalTitle') : t('teamTitle')}
            </h1>
            <p className="text-zinc-500 text-sm">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            {hasEmail && (
              <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                <button
                  onClick={() => setViewMode('team')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                    viewMode === 'team'
                      ? 'bg-zinc-800 text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-400'
                  )}
                >
                  <UsersRound size={14} />
                  {t('team')}
                </button>
                <button
                  onClick={() => setViewMode('personal')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                    viewMode === 'personal'
                      ? 'bg-zinc-800 text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-400'
                  )}
                >
                  <User size={14} />
                  {t('personal')}
                </button>
              </div>
            )}
            <Link
              href={`/${locale}/batches/new`}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New Batch
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label={t('creatorsVetted')}
              value={stats.summary.totalCreators}
              trend="up"
              trendLabel="+12%"
            />
            <StatCard
              label={t('batchesThisMonth')}
              value={stats.summary.batchesThisMonth}
              trend="neutral"
              trendLabel="same"
            />
            <StatCard
              label={t('avgRiskLevel')}
              value={riskInfo?.label || '—'}
              color={riskInfo?.color || 'default'}
            />
            <StatCard
              label={t('successRate')}
              value={`${stats.summary.successRate}%`}
              trend={stats.summary.successRate >= 90 ? 'up' : stats.summary.successRate >= 70 ? 'neutral' : 'down'}
              trendLabel={stats.summary.successRate >= 90 ? 'great' : stats.summary.successRate >= 70 ? 'ok' : 'low'}
              color={stats.summary.successRate >= 90 ? 'success' : stats.summary.successRate >= 70 ? 'warning' : 'danger'}
            />
          </div>

          {/* Active Campaigns */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-zinc-300 text-sm font-medium">Active Campaigns</h2>
              <Link
                href={`/${locale}/batches`}
                className="text-zinc-500 hover:text-zinc-400 text-xs transition-colors"
              >
                View all →
              </Link>
            </div>
            {batchesForTable.length > 0 ? (
              <BatchesTable batches={batchesForTable} />
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-xl p-12 text-center">
                <p className="text-zinc-500 text-sm mb-3">{t('noBatches')}</p>
                <Link
                  href={`/${locale}/batches/new`}
                  className="text-zinc-400 hover:text-zinc-300 text-sm transition-colors"
                >
                  {t('createNewBatch')} →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
