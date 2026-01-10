'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, UsersRound, Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useUserEmail } from '@/hooks/use-user-email';
import { RiskChart } from '@/components/dashboard/risk-chart';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatDate } from '@/lib/utils';
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
    creatorCount: number;
    userEmail: string | null;
    createdAt: string;
    status: string;
  }>;
}

function getStatusDot(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-500';
    case 'PROCESSING':
      return 'bg-blue-500 animate-pulse';
    case 'FAILED':
      return 'bg-red-500';
    default:
      return 'bg-zinc-600';
  }
}

function getRiskLabel(score: number, t: (key: string) => string): { label: string; color: string } {
  if (score < 1.5) return { label: t('low'), color: 'text-emerald-500' };
  if (score < 2.5) return { label: t('medium'), color: 'text-amber-500' };
  if (score < 3.5) return { label: t('high'), color: 'text-orange-500' };
  return { label: t('critical'), color: 'text-red-500' };
}

type ViewMode = 'team' | 'personal';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('team');
  const { email, hasEmail } = useUserEmail();
  const t = useTranslations('dashboard');
  const tRisk = useTranslations('risk');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  useEffect(() => {
    setIsLoading(true);
    const url = viewMode === 'personal' && email
      ? `/api/dashboard/stats?userEmail=${encodeURIComponent(email)}`
      : '/api/dashboard/stats';

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        // Ensure data has the expected structure
        if (data && data.summary) {
          setStats(data);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [viewMode, email]);

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
    ? getRiskLabel(stats.summary.avgRiskScore, tRisk)
    : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div>
            <h1 className="text-zinc-200 text-lg font-light tracking-wide mb-1">
              {viewMode === 'personal' ? t('personalTitle') : t('teamTitle')}
            </h1>
            <p className="text-zinc-600 text-sm">{t('subtitle')}</p>
          </div>
          {hasEmail && (
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => setViewMode('team')}
                className={cn(
                  'flex items-center gap-2 transition-colors',
                  viewMode === 'team' ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'
                )}
              >
                <UsersRound className="w-4 h-4" />
                {t('team')}
              </button>
              <button
                onClick={() => setViewMode('personal')}
                className={cn(
                  'flex items-center gap-2 transition-colors',
                  viewMode === 'personal' ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'
                )}
              >
                <User className="w-4 h-4" />
                {t('personal')}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-12 mb-16">
          <div>
            <p className="text-zinc-600 text-xs uppercase tracking-wider mb-2">{t('creatorsVetted')}</p>
            <p className="text-2xl text-zinc-200 font-light">{stats.summary.totalCreators}</p>
          </div>
          <div>
            <p className="text-zinc-600 text-xs uppercase tracking-wider mb-2">{t('batchesThisMonth')}</p>
            <p className="text-2xl text-zinc-200 font-light">{stats.summary.batchesThisMonth}</p>
          </div>
          <div>
            <p className="text-zinc-600 text-xs uppercase tracking-wider mb-2">{t('avgRiskLevel')}</p>
            <p className={cn('text-2xl font-light', riskInfo?.color || 'text-zinc-500')}>
              {riskInfo ? riskInfo.label : '—'}
            </p>
          </div>
          <div>
            <p className="text-zinc-600 text-xs uppercase tracking-wider mb-2">{t('successRate')}</p>
            <p className="text-2xl text-zinc-200 font-light">{stats.summary.successRate}%</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-8 mb-16">
          <RiskChart data={stats.riskDistribution} />
          <TrendChart data={stats.activityTrend} />
        </div>

        {/* Team Activity - minimal table */}
        {viewMode === 'team' && stats.teamActivity.length > 0 && (
          <div className="mb-16">
            <p className="text-zinc-600 text-xs uppercase tracking-wider mb-6">{t('teamActivity')}</p>
            <div className="space-y-px">
              {stats.teamActivity.map((member) => (
                <div key={member.userEmail} className="flex items-center py-4 border-b border-zinc-900">
                  <div className="flex-1">
                    <span className="text-zinc-300">{member.userEmail}</span>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-zinc-500 text-sm">{member.batchCount} {t('batches')}</span>
                  </div>
                  <div className="w-32 text-right">
                    <span className="text-zinc-500 text-sm">{member.creatorCount} {t('creators')}</span>
                  </div>
                  <div className="w-24 text-right">
                    <span className={cn(
                      'text-sm',
                      member.completionRate >= 90 ? 'text-emerald-500' :
                      member.completionRate >= 70 ? 'text-amber-500' : 'text-red-500'
                    )}>
                      {member.completionRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Batches */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-zinc-600 text-xs uppercase tracking-wider">
              {viewMode === 'personal' ? t('myRecentBatches') : t('recentBatches')}
            </p>
            <Link
              href={`/${locale}/batches`}
              className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
            >
              {tCommon('viewAll')} →
            </Link>
          </div>

          {stats.recentBatches.length > 0 ? (
            <div className="space-y-px">
              {stats.recentBatches.slice(0, 5).map((batch) => (
                <Link
                  key={batch.id}
                  href={`/${locale}/batches/${batch.id}`}
                  className="block group"
                >
                  <div className="flex items-center py-5 border-b border-zinc-900 hover:border-zinc-800 transition-colors">
                    {/* Status dot */}
                    <div className="w-12 flex justify-center">
                      {batch.status === 'PROCESSING' ? (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      ) : (
                        <div className={cn('w-2 h-2 rounded-full', getStatusDot(batch.status))} />
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1">
                      <span className="text-zinc-300 group-hover:text-zinc-100 transition-colors">
                        {batch.name}
                      </span>
                    </div>

                    {/* Creators */}
                    <div className="w-28 text-right">
                      <span className="text-zinc-600 text-sm">{batch.creatorCount} {t('creators')}</span>
                    </div>

                    {/* Date */}
                    <div className="w-28 text-right">
                      <span className="text-zinc-700 text-sm">{formatDate(new Date(batch.createdAt))}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-zinc-600 text-sm">{t('noBatches')}</p>
            </div>
          )}
        </div>

        {/* New Batch Link */}
        <div className="mt-12 text-center">
          <Link
            href={`/${locale}/batches/new`}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            {t('createNewBatch')}
          </Link>
        </div>
      </div>
    </div>
  );
}
