import { cn } from '@/lib/utils';

interface BatchProgressProps {
  total: number;
  completed: number;
  failed: number;
  isProcessing: boolean;
}

export function BatchProgress({
  total,
  completed,
  failed,
  isProcessing,
}: BatchProgressProps) {
  const pending = total - completed - failed;
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const failedPercent = total > 0 ? (failed / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-zinc-400">
            {completed} of {total} completed
          </span>
          {failed > 0 && (
            <span className="text-red-400">{failed} failed</span>
          )}
        </div>
        {isProcessing && (
          <span className="text-blue-400 animate-pulse">Processing...</span>
        )}
      </div>

      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div
            className={cn(
              'bg-green-500 transition-all duration-500',
              isProcessing && 'animate-pulse'
            )}
            style={{ width: `${completedPercent}%` }}
          />
          <div
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${failedPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
