'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, User, UsersRound } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useUserEmail } from '@/hooks/use-user-email';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatDate } from '@/lib/utils';
import type { BatchStatus } from '@/types';

interface BatchWithCounts {
  id: string;
  name: string;
  status: BatchStatus;
  userEmail: string | null;
  clientName: string | null;
  createdAt: string;
  _count: {
    creators: number;
  };
}

function getStatusDot(status: BatchStatus): string {
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
        // API returns { batches: [...] }
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
          <div>
            <h1 className="text-zinc-200 text-lg font-light tracking-wide mb-1">
              {viewMode === 'mine' ? t('myTitle') : t('title')}
            </h1>
            <p className="text-zinc-600 text-sm">
              {t('subtitle', { count: filteredBatches.length })}
            </p>
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
          <div className="space-y-px">
            {filteredBatches.map((batch) => (
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
                    {batch.clientName && (
                      <span className="text-zinc-600 text-sm ml-3">
                        {batch.clientName}
                      </span>
                    )}
                  </div>

                  {/* Creators */}
                  <div className="w-28 text-right">
                    <span className="text-zinc-600 text-sm">
                      {t('creators', { count: batch._count.creators })}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="w-28 text-right">
                    <span className="text-zinc-700 text-sm">
                      {formatDate(new Date(batch.createdAt))}
                    </span>
                  </div>
                </div>
              </Link>
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

        {/* New Batch Link */}
        {filteredBatches.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href={`/${locale}/batches/new`}
              className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              {t('createNew')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
