'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Calendar, TrendingUp, CheckCircle, ExternalLink, User, UsersRound } from 'lucide-react';
import { useUserEmail } from '@/hooks/use-user-email';
import { StatCard } from '@/components/dashboard/stat-card';
import { TeamTable } from '@/components/dashboard/team-table';
import { RiskChart } from '@/components/dashboard/risk-chart';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

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

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-green-500/10 text-green-400',
  PROCESSING: 'bg-yellow-500/10 text-yellow-400',
  PENDING: 'bg-zinc-500/10 text-zinc-400',
  FAILED: 'bg-red-500/10 text-red-400',
};

const riskScoreLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Low', color: 'text-green-400' },
  2: { label: 'Medium', color: 'text-yellow-400' },
  3: { label: 'High', color: 'text-orange-400' },
  4: { label: 'Critical', color: 'text-red-400' },
};

function getRiskLabel(score: number) {
  if (score < 1.5) return riskScoreLabels[1];
  if (score < 2.5) return riskScoreLabels[2];
  if (score < 3.5) return riskScoreLabels[3];
  return riskScoreLabels[4];
}

type ViewMode = 'team' | 'personal';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('team');
  const { email, hasEmail } = useUserEmail();

  useEffect(() => {
    setIsLoading(true);
    const url = viewMode === 'personal' && email
      ? `/api/dashboard/stats?userEmail=${encodeURIComponent(email)}`
      : '/api/dashboard/stats';

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
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
        <p className="text-zinc-400">Failed to load dashboard</p>
      </div>
    );
  }

  const riskInfo = getRiskLabel(stats.summary.avgRiskScore);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-zinc-50">
            {viewMode === 'personal' ? 'My Performance' : 'Team Dashboard'}
          </h1>
          {hasEmail && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('team')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'team'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <UsersRound className="w-4 h-4" />
                Team
              </button>
              <button
                onClick={() => setViewMode('personal')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'personal'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <User className="w-4 h-4" />
                Personal
              </button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Creators Vetted"
            value={stats.summary.totalCreators}
            icon={Users}
          />
          <StatCard
            title="Batches This Month"
            value={stats.summary.batchesThisMonth}
            icon={Calendar}
          />
          <StatCard
            title="Avg Risk Level"
            value={stats.summary.avgRiskScore > 0 ? stats.summary.avgRiskScore.toFixed(1) : '-'}
            subtitle={stats.summary.avgRiskScore > 0 ? riskInfo.label : 'No data'}
            icon={TrendingUp}
          />
          <StatCard
            title="Success Rate"
            value={`${stats.summary.successRate}%`}
            icon={CheckCircle}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <RiskChart data={stats.riskDistribution} />
          <TrendChart data={stats.activityTrend} />
        </div>

        {/* Team Activity - only show in team view */}
        {viewMode === 'team' && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-zinc-200 mb-4">Team Activity</h2>
            <TeamTable data={stats.teamActivity} />
          </div>
        )}

        {/* Recent Batches */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-zinc-200">
              {viewMode === 'personal' ? 'My Recent Batches' : 'Recent Batches'}
            </h2>
            <Link
              href="/batches"
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {stats.recentBatches.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {stats.recentBatches.slice(0, 5).map((batch) => (
                  <Link
                    key={batch.id}
                    href={`/batches/${batch.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {batch.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {batch.creatorCount} creators • {batch.userEmail || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          statusColors[batch.status]
                        )}
                      >
                        {batch.status}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(batch.createdAt).toLocaleDateString()}
                      </span>
                      <ExternalLink className="w-4 h-4 text-zinc-500" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-zinc-400">No batches yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
