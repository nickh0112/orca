'use client';

import { Shield, ShieldAlert, ShieldX, Clock, FileText, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SafetyRationale } from '@/types/video-analysis';

interface SafetySummaryProps {
  rating: 'safe' | 'caution' | 'unsafe';
  summary?: string;
  safetyRationale?: SafetyRationale;
  className?: string;
}

/**
 * Get styling and icon for safety rating
 */
function getRatingConfig(rating: 'safe' | 'caution' | 'unsafe') {
  switch (rating) {
    case 'safe':
      return {
        icon: Shield,
        label: 'Brand Safe',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        textColor: 'text-emerald-400',
        iconColor: 'text-emerald-400',
      };
    case 'caution':
      return {
        icon: ShieldAlert,
        label: 'Caution',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        textColor: 'text-amber-400',
        iconColor: 'text-amber-400',
      };
    case 'unsafe':
      return {
        icon: ShieldX,
        label: 'Not Brand Safe',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-400',
        iconColor: 'text-red-400',
      };
  }
}

/**
 * Format duration in seconds to human readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

/**
 * Safety summary card - displays professional assessment at top of analysis
 */
export function SafetySummary({
  rating,
  summary,
  safetyRationale,
  className,
}: SafetySummaryProps) {
  const config = getRatingConfig(rating);
  const Icon = config.icon;

  // Use summary from safetyRationale if available
  const displaySummary = safetyRationale?.summary || summary;
  const coverageStats = safetyRationale?.coverageStats;
  const evidenceCount = safetyRationale?.evidence?.length || 0;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {/* Header with rating */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('p-2 rounded-lg', config.bgColor)}>
          <Icon className={cn('w-6 h-6', config.iconColor)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={cn('text-lg font-semibold', config.textColor)}>
              {config.label}
            </h3>
            {evidenceCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-400 rounded">
                {evidenceCount} {evidenceCount === 1 ? 'flag' : 'flags'}
              </span>
            )}
          </div>

          {/* Professional summary */}
          {displaySummary && (
            <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
              {displaySummary}
            </p>
          )}
        </div>
      </div>

      {/* Coverage stats (if available) */}
      {coverageStats && (coverageStats.videoDuration > 0 || coverageStats.transcriptWords > 0) && (
        <div className="flex items-center gap-4 pt-3 border-t border-zinc-800/50">
          {coverageStats.videoDuration > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Film className="w-3.5 h-3.5" />
              <span>{formatDuration(coverageStats.videoDuration)}</span>
            </div>
          )}
          {coverageStats.transcriptWords > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <FileText className="w-3.5 h-3.5" />
              <span>{coverageStats.transcriptWords.toLocaleString()} words analyzed</span>
            </div>
          )}
          {coverageStats.framesAnalyzed > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{coverageStats.framesAnalyzed} frames</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact safety badge for list views
 */
export function SafetyBadge({
  rating,
  className,
}: {
  rating: 'safe' | 'caution' | 'unsafe';
  className?: string;
}) {
  const config = getRatingConfig(rating);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </div>
  );
}

/**
 * Inline safety indicator for minimal space
 */
export function SafetyIndicator({
  rating,
  showLabel = false,
  className,
}: {
  rating: 'safe' | 'caution' | 'unsafe';
  showLabel?: boolean;
  className?: string;
}) {
  const config = getRatingConfig(rating);
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Icon className={cn('w-4 h-4', config.iconColor)} />
      {showLabel && (
        <span className={cn('text-xs', config.textColor)}>{config.label}</span>
      )}
    </div>
  );
}
