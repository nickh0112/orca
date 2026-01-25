'use client';

import { ChevronDown, ChevronRight, Loader2, Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreatorProgress } from '@/hooks/use-research-feed';
import { SearchActivity } from './search-activity';
import { PlatformProgress } from './platform-progress';
import { FindingsStream } from './findings-stream';

interface CreatorCardProps {
  creator: CreatorProgress;
  isExpanded: boolean;
  onToggle: () => void;
}

function getRiskBadgeStyles(riskLevel: string | undefined): string {
  switch (riskLevel) {
    case 'CRITICAL':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'HIGH':
      return 'bg-red-500/15 text-red-400 border-red-500/25';
    case 'MEDIUM':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/25';
    case 'LOW':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
    default:
      return 'bg-zinc-800 text-zinc-500 border-zinc-700';
  }
}

function formatDuration(startTime: number, endTime?: number): string {
  const duration = (endTime || Date.now()) - startTime;
  const seconds = Math.floor(duration / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function getStepLabel(step: string): string {
  const labels: Record<string, string> = {
    validation: 'Validating sources',
    content_analysis: 'Analyzing content',
    brand_detection: 'Detecting brands',
    profanity_check: 'Checking profanity',
    competitor_analysis: 'Analyzing competitors',
    rationale_generation: 'Generating report',
  };
  return labels[step] || step;
}

export function CreatorCard({ creator, isExpanded, onToggle }: CreatorCardProps) {
  const isProcessing = creator.status === 'processing';
  const isCompleted = creator.status === 'completed';
  const isFailed = creator.status === 'failed';
  const isPending = creator.status === 'pending';

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isProcessing
          ? 'border-blue-500/30 bg-blue-950/10'
          : isCompleted
          ? 'border-zinc-800 bg-zinc-900/50'
          : isFailed
          ? 'border-red-500/30 bg-red-950/10'
          : 'border-zinc-800/50 bg-zinc-900/30'
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-800/20 transition-colors rounded-lg"
      >
        {/* Expand icon */}
        <div className="text-zinc-600">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        {/* Status indicator */}
        <div className="w-6 flex justify-center">
          {isProcessing && (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          )}
          {isCompleted && <Check className="w-4 h-4 text-emerald-400" />}
          {isFailed && <X className="w-4 h-4 text-red-400" />}
          {isPending && <div className="w-2 h-2 rounded-full bg-zinc-700" />}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              'font-medium truncate block',
              isProcessing
                ? 'text-zinc-200'
                : isCompleted
                ? 'text-zinc-300'
                : 'text-zinc-500'
            )}
          >
            {creator.name}
          </span>
        </div>

        {/* Current step (when processing) */}
        {isProcessing && creator.currentStep && (
          <div className="flex items-center gap-2 text-xs text-blue-400/80">
            <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
            <span>{getStepLabel(creator.currentStep)}</span>
          </div>
        )}

        {/* Duration */}
        {creator.startedAt && (
          <div className="text-zinc-600 text-xs tabular-nums">
            {formatDuration(creator.startedAt, creator.completedAt)}
          </div>
        )}

        {/* Risk badge (when completed) */}
        {isCompleted && creator.riskLevel && (
          <div
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium border',
              getRiskBadgeStyles(creator.riskLevel)
            )}
          >
            {creator.riskLevel}
          </div>
        )}

        {/* Findings count */}
        {isCompleted && creator.findingsCount !== undefined && creator.findingsCount > 0 && (
          <div className="flex items-center gap-1 text-zinc-500 text-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>{creator.findingsCount}</span>
          </div>
        )}

        {/* Error indicator */}
        {isFailed && (
          <span className="text-red-400 text-xs">Failed</span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (creator.status === 'processing' || creator.status === 'completed') && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800/50 pt-4 ml-10">
          {/* Searches */}
          {creator.searches.length > 0 && (
            <SearchActivity searches={creator.searches} />
          )}

          {/* Platforms */}
          {creator.platforms.size > 0 && (
            <PlatformProgress platforms={creator.platforms} />
          )}

          {/* Findings */}
          {creator.findings.length > 0 && (
            <FindingsStream findings={creator.findings} />
          )}

          {/* Analysis steps progress */}
          {isProcessing && creator.completedSteps.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {creator.completedSteps.map((step) => (
                <div
                  key={step}
                  className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800/50 rounded text-xs text-zinc-500"
                >
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>{getStepLabel(step)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {isFailed && creator.error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
              <p className="text-red-400 text-sm">{creator.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
