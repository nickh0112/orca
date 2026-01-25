'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, UsersRound, ArrowLeft } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useUserEmail } from '@/hooks/use-user-email';
import { Spinner } from '@/components/ui/spinner';
import { CampaignCard } from '@/components/dashboard/campaign-card';
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

export default function AllBatchesPage() {
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

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/batches`}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-zinc-200 text-lg font-light tracking-wide mb-1">
                {viewMode === 'mine' ? t('myTitle') : t('title')}
              </h1>
              <p className="text-zinc-600 text-sm">
                {t('subtitle', { count: filteredBatches.length })}
              </p>
            </div>
          </div>
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
        </div>

        {/* Batch List */}
        {filteredBatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBatches.map((batch) => (
              <CampaignCard
                key={batch.id}
                id={batch.id}
                name={batch.name}
                clientName={batch.clientName}
                status={batch.status}
                creatorCount={batch._count.creators}
                completedCount={batch.completedCount}
                riskBreakdown={batch.riskBreakdown}
                createdAt={batch.createdAt}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
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
