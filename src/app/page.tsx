import Link from 'next/link';
import { Plus, FolderOpen, Shield } from 'lucide-react';
import { db } from '@/lib/db';
import { BatchCard } from '@/components/batch/batch-card';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const recentBatches = await db.batch.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { creators: true } },
    },
  });

  const stats = await db.batch.aggregate({
    _count: true,
  });

  const creatorStats = await db.creator.aggregate({
    _count: true,
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-zinc-400" />
            <h1 className="text-3xl font-semibold text-zinc-50">
              Creator Vetting
            </h1>
          </div>
          <p className="text-zinc-400">
            Research content creators for brand safety risks
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 mb-12">
          <Link
            href="/batches/new"
            className="group p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors"
          >
            <Plus className="w-8 h-8 text-zinc-500 group-hover:text-zinc-300 mb-4 transition-colors" />
            <h2 className="text-lg font-medium text-zinc-100 mb-1">
              New Research Batch
            </h2>
            <p className="text-sm text-zinc-500">
              Add creators manually or upload CSV
            </p>
          </Link>

          <Link
            href="/batches"
            className="group p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors"
          >
            <FolderOpen className="w-8 h-8 text-zinc-500 group-hover:text-zinc-300 mb-4 transition-colors" />
            <h2 className="text-lg font-medium text-zinc-100 mb-1">
              View All Batches
            </h2>
            <p className="text-sm text-zinc-500">
              {stats._count} batches, {creatorStats._count} creators researched
            </p>
          </Link>
        </div>

        {recentBatches.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-zinc-300">
                Recent Batches
              </h2>
              <Link
                href="/batches"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {recentBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))}
            </div>
          </section>
        )}

        {recentBatches.length === 0 && (
          <div className="text-center py-16">
            <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-400 mb-2">
              No batches yet
            </h3>
            <p className="text-zinc-500 mb-6">
              Create your first batch to start vetting creators
            </p>
            <Link
              href="/batches/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Batch
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
