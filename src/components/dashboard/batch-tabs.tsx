'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUserEmail } from '@/hooks/use-user-email';
import { BatchCard } from '@/components/batch/batch-card';
import type { BatchWithCounts } from '@/types';

interface BatchTabsProps {
  initialBatches: BatchWithCounts[];
}

export function BatchTabs({ initialBatches }: BatchTabsProps) {
  const { email } = useUserEmail();
  const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine');
  const [batches, setBatches] = useState<BatchWithCounts[]>(initialBatches);

  useEffect(() => {
    setBatches(initialBatches);
  }, [initialBatches]);

  const filteredBatches =
    activeTab === 'mine'
      ? batches.filter((b) => b.userEmail === email)
      : batches;

  const myCount = batches.filter((b) => b.userEmail === email).length;
  const allCount = batches.length;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg mb-4 w-fit">
        <button
          onClick={() => setActiveTab('mine')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'mine'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          My Reports ({myCount})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'all'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          All Reports ({allCount})
        </button>
      </div>

      {/* Batch List */}
      {filteredBatches.length > 0 ? (
        <div className="space-y-3">
          {filteredBatches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} showOwner={activeTab === 'all'} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-500">
          {activeTab === 'mine' ? (
            <p>
              No reports yet.{' '}
              <Link href="/batches/new" className="text-zinc-300 hover:underline">
                Create your first batch
              </Link>
            </p>
          ) : (
            <p>No reports found.</p>
          )}
        </div>
      )}
    </div>
  );
}
