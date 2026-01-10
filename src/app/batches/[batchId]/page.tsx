'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, RotateCcw, Download, Loader2 } from 'lucide-react';
import { useBatchStream } from '@/hooks/use-batch-stream';
import { BatchProgress } from '@/components/batch/batch-progress';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
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
    findings?: string;
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

function getVerdict(riskLevel: RiskLevel | undefined): { text: string; color: string } {
  switch (riskLevel) {
    case 'CRITICAL':
    case 'HIGH':
      return { text: 'review', color: 'text-red-500' };
    case 'MEDIUM':
      return { text: 'review', color: 'text-amber-500' };
    case 'LOW':
      return { text: 'approve', color: 'text-emerald-600' };
    default:
      return { text: 'pending', color: 'text-zinc-600' };
  }
}

function getStatusDot(status: CreatorStatus, riskLevel?: RiskLevel): string {
  if (status === 'PROCESSING') return 'bg-blue-500 animate-pulse';
  if (status === 'FAILED') return 'bg-red-500';
  if (status !== 'COMPLETED') return 'bg-zinc-700';

  switch (riskLevel) {
    case 'CRITICAL':
    case 'HIGH':
      return 'bg-red-500';
    case 'MEDIUM':
      return 'bg-amber-500';
    case 'LOW':
      return 'bg-emerald-500';
    default:
      return 'bg-zinc-600';
  }
}

function getFindingsCount(findings: string | undefined): number {
  if (!findings) return 0;
  try {
    const parsed = JSON.parse(findings);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
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

  // Fetch batch data initially and when streaming completes
  useEffect(() => {
    fetch(`/api/batches/${batchId}`)
      .then((res) => res.json())
      .then((data) => {
        setBatch(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [batchId]);

  // Refetch batch data when streaming completes to get updated reports
  useEffect(() => {
    if (isComplete) {
      fetch(`/api/batches/${batchId}`)
        .then((res) => res.json())
        .then((data) => setBatch(data))
        .catch(console.error);
    }
  }, [batchId, isComplete]);

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

  const handleExport = () => {
    window.open(`/api/batches/${batchId}/export`, '_blank');
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

  // Calculate creators to review (high/critical risk)
  const reviewCount = batch.creators.filter((c) => {
    const streamResult = resultsMap.get(c.id);
    const riskLevel = streamResult?.riskLevel || c.report?.riskLevel;
    return riskLevel === 'CRITICAL' || riskLevel === 'HIGH';
  }).length;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <Link
          href="/batches"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 mb-12 text-sm tracking-wide"
        >
          <ArrowLeft className="w-4 h-4" />
          batches
        </Link>

        <div className="mb-16">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-zinc-200 text-lg font-light tracking-wide mb-1">{batch.name}</h1>
              <p className="text-zinc-600 text-sm">
                {batch.creators.length} creator{batch.creators.length !== 1 ? 's' : ''}
                {reviewCount > 0 && ` · ${reviewCount} to review`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {canStart && (
                <Button onClick={handleStartProcessing} disabled={isStarting} size="sm">
                  <Play className="w-4 h-4 mr-2" />
                  {isStarting ? 'Starting...' : 'Start Research'}
                </Button>
              )}
              {(batch.status === 'COMPLETED' || completedCount > 0) && (
                <Button variant="secondary" onClick={handleExport} size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>

          {(isStreaming || batch.status === 'PROCESSING') && (
            <BatchProgress
              total={batch.creators.length}
              completed={completedCount}
              failed={failedCount}
              isProcessing={isStreaming}
            />
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-950/30 border border-red-900 rounded-lg mb-6 flex items-center justify-between">
            <p className="text-red-400 text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={handleRetry}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        )}

        <div className="space-y-px">
          {batch.creators.map((creator) => {
            const streamResult = resultsMap.get(creator.id);
            const effectiveStatus = streamResult?.status === 'processing' ? 'PROCESSING' : creator.status;
            const riskLevel = streamResult?.riskLevel || creator.report?.riskLevel;
            const verdict = getVerdict(riskLevel);
            const statusDot = getStatusDot(effectiveStatus, riskLevel);
            const findingsCount = streamResult?.findingsCount ?? getFindingsCount(creator.report?.findings);
            const isProcessing = effectiveStatus === 'PROCESSING';
            const isClickable = effectiveStatus === 'COMPLETED';

            const content = (
              <div className="flex items-center py-5 border-b border-zinc-900 hover:border-zinc-800 transition-colors">
                {/* Status dot */}
                <div className="w-16 flex justify-center">
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : (
                    <div className={cn('w-2 h-2 rounded-full', statusDot)} />
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 text-left">
                  <span className={cn(
                    'transition-colors',
                    isClickable ? 'text-zinc-300 group-hover:text-zinc-100' : 'text-zinc-500'
                  )}>
                    {creator.name}
                  </span>
                </div>

                {/* Verdict */}
                <div className="w-32 text-left">
                  <span className={cn(
                    'text-sm uppercase tracking-wider',
                    effectiveStatus === 'COMPLETED' ? verdict.color : 'text-zinc-700'
                  )}>
                    {effectiveStatus === 'COMPLETED' ? verdict.text : effectiveStatus.toLowerCase()}
                  </span>
                </div>

                {/* Flags */}
                <div className="w-20 text-right">
                  <span className="text-zinc-600 text-sm">
                    {effectiveStatus === 'COMPLETED' ? findingsCount : '—'}
                  </span>
                </div>
              </div>
            );

            if (isClickable) {
              return (
                <Link
                  key={creator.id}
                  href={`/batches/${batchId}/creators/${creator.id}`}
                  className="block group"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div key={creator.id} className="cursor-default">
                {content}
              </div>
            );
          })}
        </div>

        {isComplete && (
          <div className="mt-12 text-center">
            <p className="text-zinc-600 text-sm">
              Research complete · {completedCount} of {batch.creators.length} processed
              {failedCount > 0 && ` · ${failedCount} failed`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
