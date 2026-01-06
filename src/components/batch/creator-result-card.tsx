import Link from 'next/link';
import { User, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiskBadge } from '@/components/report/risk-badge';
import type { CreatorResult, RiskLevel, CreatorStatus } from '@/types';

interface CreatorResultCardProps {
  creator: {
    id: string;
    name: string;
    status: CreatorStatus;
    socialLinks: string;
  };
  result?: CreatorResult;
  batchId: string;
}

export function CreatorResultCard({
  creator,
  result,
  batchId,
}: CreatorResultCardProps) {
  const status = result?.status || 'pending';
  const riskLevel = result?.riskLevel as RiskLevel | undefined;

  return (
    <div
      className={cn(
        'p-4 bg-zinc-900 border border-zinc-800 rounded-lg transition-all',
        status === 'processing' && 'border-blue-800 bg-blue-950/20',
        status === 'failed' && 'border-red-800 bg-red-950/20'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
              'bg-zinc-800 text-zinc-400'
            )}
          >
            <User className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-zinc-100 truncate">{creator.name}</h4>

            {status === 'pending' && (
              <p className="text-sm text-zinc-500 mt-1">Waiting...</p>
            )}

            {status === 'processing' && (
              <p className="text-sm text-blue-400 mt-1 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Researching...
              </p>
            )}

            {status === 'completed' && result?.summary && (
              <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                {result.summary}
              </p>
            )}

            {status === 'failed' && (
              <p className="text-sm text-red-400 mt-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {result?.error || 'Research failed'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {status === 'completed' && riskLevel && (
            <RiskBadge level={riskLevel} size="sm" />
          )}

          {status === 'completed' && (
            <Link
              href={`/batches/${batchId}/creators/${creator.id}`}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
