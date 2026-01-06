import Link from 'next/link';
import { Plus, Shield } from 'lucide-react';
import { db } from '@/lib/db';
import { BatchTabs } from '@/components/dashboard/batch-tabs';
import { UserHeader } from '@/components/user/user-header';
import type { BatchWithCounts } from '@/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const batches = await db.batch.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { creators: true } },
    },
  });

  const creatorStats = await db.creator.aggregate({
    _count: true,
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-zinc-400" />
              <h1 className="text-3xl font-semibold text-zinc-50">Orca</h1>
            </div>
            <UserHeader />
          </div>
          <p className="text-zinc-400">
            Creator vetting for brand safety
          </p>
        </header>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <Link
            href="/batches/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Batch
          </Link>
          <div className="flex items-center px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400">
            {creatorStats._count} creators vetted
          </div>
        </div>

        {/* Batch List with Tabs */}
        <section>
          <BatchTabs initialBatches={batches as BatchWithCounts[]} />
        </section>
      </div>
    </div>
  );
}
