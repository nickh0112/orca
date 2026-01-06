import Link from 'next/link';
import { Clock, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { BatchStatus } from '@/types';

interface BatchCardProps {
  batch: {
    id: string;
    name: string;
    status: BatchStatus;
    createdAt: Date;
    _count: {
      creators: number;
    };
  };
}

const statusConfig: Record<
  BatchStatus,
  { icon: typeof CheckCircle; color: string; label: string }
> = {
  PENDING: { icon: Clock, color: 'text-zinc-400', label: 'Pending' },
  PROCESSING: { icon: Loader2, color: 'text-blue-400', label: 'Processing' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-400', label: 'Completed' },
  FAILED: { icon: AlertCircle, color: 'text-red-400', label: 'Failed' },
};

export function BatchCard({ batch }: BatchCardProps) {
  const { icon: Icon, color, label } = statusConfig[batch.status];

  return (
    <Link
      href={`/batches/${batch.id}`}
      className="block p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-zinc-100 truncate">{batch.name}</h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {batch._count.creators} creators
            </span>
            <span>{formatDate(batch.createdAt)}</span>
          </div>
        </div>
        <span className={cn('flex items-center gap-1.5 text-sm', color)}>
          <Icon
            className={cn('w-4 h-4', {
              'animate-spin': batch.status === 'PROCESSING',
            })}
          />
          {label}
        </span>
      </div>
    </Link>
  );
}
