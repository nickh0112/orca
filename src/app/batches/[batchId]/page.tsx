'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { useBatchStream } from '@/hooks/use-batch-stream';
import { CreatorResultCard } from '@/components/batch/creator-result-card';
import { BatchProgress } from '@/components/batch/batch-progress';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { BatchStatus, CreatorStatus, RiskLevel } from '@/types';

interface Creator {
  id: string;
  name: string;
  status: CreatorStatus;
  socialLinks: string;
  report?: {
    id: string;
    riskLevel: RiskLevel;
    summary: string | null;
  } | null;
}

interface Batch {
  id: string;
  name: string;
  status: BatchStatus;
  searchTerms: string | null;
  creators: Creator[];
  createdAt: string;
}

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = use(params);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const { results, resultsMap, isStreaming, isComplete, error, startStream } =
    useBatchStream(batchId);

  useEffect(() => {
    fetch(`/api/batches/${batchId}`)
      .then((res) => res.json())
      .then((data) => {
        setBatch(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [batchId]);

  const handleStartProcessing = async () => {
    setIsStarting(true);
    try {
      await fetch(`/api/batches/${batchId}/process`, { method: 'POST' });
      startStream();
    } catch (err) {
      console.error('Failed to start processing:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Batch not found</p>
          <Link href="/batches" className="text-zinc-300 hover:text-white">
            Back to batches
          </Link>
        </div>
      </div>
    );
  }

  const completedCount =
    results.filter((r) => r.status === 'completed').length +
    batch.creators.filter(
      (c) => c.status === 'COMPLETED' && !resultsMap.has(c.id)
    ).length;

  const failedCount =
    results.filter((r) => r.status === 'failed').length +
    batch.creators.filter(
      (c) => c.status === 'FAILED' && !resultsMap.has(c.id)
    ).length;

  const canStart =
    batch.status === 'PENDING' && !isStreaming && !isStarting;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/batches"
          className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Batches
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-50 mb-4">
            {batch.name}
          </h1>
          <BatchProgress
            total={batch.creators.length}
            completed={completedCount}
            failed={failedCount}
            isProcessing={isStreaming}
          />
        </header>

        {canStart && (
          <div className="text-center py-12 mb-8 border border-dashed border-zinc-800 rounded-xl">
            <p className="text-zinc-400 mb-4">
              Ready to research {batch.creators.length} creator
              {batch.creators.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={handleStartProcessing} disabled={isStarting}>
              <Play className="w-4 h-4 mr-2" />
              {isStarting ? 'Starting...' : 'Start Research'}
            </Button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/30 border border-red-900 rounded-lg mb-6 flex items-center justify-between">
            <p className="text-red-400">{error}</p>
            <Button variant="ghost" size="sm" onClick={handleRetry}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {batch.creators.map((creator) => {
            const streamResult = resultsMap.get(creator.id);
            return (
              <CreatorResultCard
                key={creator.id}
                creator={creator}
                result={
                  streamResult || (creator.status === 'COMPLETED' && creator.report
                    ? {
                        creatorId: creator.id,
                        name: creator.name,
                        status: 'completed',
                        riskLevel: creator.report.riskLevel,
                        summary: creator.report.summary || undefined,
                      }
                    : undefined)
                }
                batchId={batchId}
              />
            );
          })}
        </div>

        {isComplete && (
          <div className="mt-8 p-4 bg-green-950/30 border border-green-900 rounded-lg text-center">
            <p className="text-green-400">
              Research complete! {completedCount} of {batch.creators.length}{' '}
              creators processed successfully.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
