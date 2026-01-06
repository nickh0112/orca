import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { BatchTabs } from '@/components/dashboard/batch-tabs';
import type { BatchWithCounts } from '@/types';

export const dynamic = 'force-dynamic';

export default async function BatchesPage() {
  const batches = await db.batch.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { creators: true } },
    },
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-50 mb-1">
              Batches
            </h1>
            <p className="text-zinc-500">{batches.length} total batches</p>
          </div>
          <Link
            href="/batches/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Batch
          </Link>
        </div>

        <BatchTabs initialBatches={batches as BatchWithCounts[]} />
      </div>
    </div>
  );
}
