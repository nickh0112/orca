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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-50 mb-1">
              Batches
            </h1>
            <p className="text-zinc-500">{batches.length} total batches</p>
          </div>
        </div>

        <BatchTabs initialBatches={batches as BatchWithCounts[]} />
      </div>
    </div>
  );
}
