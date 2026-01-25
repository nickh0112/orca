'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, UsersRound, ArrowRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useUserEmail } from '@/hooks/use-user-email';
import { Spinner } from '@/components/ui/spinner';
import { BatchesTable } from '@/components/dashboard/batches-table';
import { cn } from '@/lib/utils';
import type { BatchStatus } from '@/types';

interface BatchWithCounts {
  id: string;
  name: string;
  status: BatchStatus;
  userEmail: string | null;
  clientName: string | null;
  createdAt: string;
  completedAt: string | null;
  completedCount: number;
  riskBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  _count: {
    creators: number;
  };
}

type ViewMode = 'mine' | 'all';

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('mine');
  const { email, hasEmail } = useUserEmail();
  const t = useTranslations('batches');
  const locale = useLocale();

  useEffect(() => {
    fetch('/api/batches')
      .then((res) => res.json())
      .then((data) => {
        if (data.batches && Array.isArray(data.batches)) {
          setBatches(data.batches);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const filteredBatches = viewMode === 'mine' && email
    ? batches.filter((b) => b.userEmail === email)
    : batches;

  const myCount = batches.filter((b) => b.userEmail === email).length;

  // Active campaigns: non-completed batches (PENDING, PROCESSING) or recently completed
  const activeBatches = filteredBatches.filter(
    (b) => b.status === 'PENDING' || b.status === 'PROCESSING' || b.status === 'FAILED'
  );

  // Include recently completed batches in active if we don't have enough
  const recentlyCompletedForActive = filteredBatches
    .filter((b) => b.status === 'COMPLETED')
    .slice(0, Math.max(0, 6 - activeBatches.length));

  const displayActiveBatches = [...activeBatches, ...recentlyCompletedForActive].slice(0, 6);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-5xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-zinc-200 text-lg font-light tracking-wide">
            Active Campaigns
          </h1>
          <div className="flex items-center gap-6">
            {hasEmail && (
              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={() => setViewMode('mine')}
                  className={cn(
                    'flex items-center gap-2 transition-colors',
                    viewMode === 'mine' ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'
                  )}
                >
                  <User className="w-4 h-4" />
                  {t('mine')} ({myCount})
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  className={cn(
                    'flex items-center gap-2 transition-colors',
                    viewMode === 'all' ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'
                  )}
                >
                  <UsersRound className="w-4 h-4" />
                  {t('all')} ({batches.length})
                </button>
              </div>
            )}
            <Link
              href={`/${locale}/batches/all`}
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Active Campaigns Section */}
        {displayActiveBatches.length > 0 ? (
          <BatchesTable batches={displayActiveBatches} />
        ) : (
          <div className="py-12 text-center border border-zinc-800 rounded-xl bg-zinc-900/30">
            <p className="text-zinc-600 text-sm mb-4">
              {viewMode === 'mine' ? t('noBatches') : t('noBatchesFound')}
            </p>
            <Link
              href={`/${locale}/batches/new`}
              className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              {t('createFirst')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
