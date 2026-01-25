'use client';

import { Clock, Quote, AlertTriangle, Eye, Volume2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlagEvidence, FlagCategory, FlagSeverity, FlagSource } from '@/types/video-analysis';

interface EvidencePanelProps {
  evidence: FlagEvidence[];
  onTimestampClick?: (timestamp: number) => void;
  className?: string;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get color classes for severity level
 */
function getSeverityColors(severity: FlagSeverity): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'high':
      return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
    case 'medium':
      return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'low':
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
  }
}

/**
 * Get icon for source type
 */
function getSourceIcon(source: FlagSource) {
  switch (source) {
    case 'audio':
      return Volume2;
    case 'visual':
      return Eye;
    case 'text':
    case 'transcript':
      return FileText;
  }
}

/**
 * Get display label for category
 */
function getCategoryLabel(category: FlagCategory): string {
  const labels: Record<FlagCategory, string> = {
    profanity: 'Profanity',
    violence: 'Violence',
    adult: 'Adult Content',
    substances: 'Substances',
    controversial: 'Controversial',
    dangerous: 'Dangerous',
    political: 'Political',
    competitor: 'Competitor',
    sponsor: 'Sponsor',
  };
  return labels[category] || category;
}

/**
 * Single evidence item component
 */
function EvidenceItem({
  evidence,
  onTimestampClick,
}: {
  evidence: FlagEvidence;
  onTimestampClick?: (timestamp: number) => void;
}) {
  const severityColors = getSeverityColors(evidence.severity);
  const SourceIcon = getSourceIcon(evidence.source);

  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-zinc-900/50',
        severityColors.border
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Category badge */}
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded',
              severityColors.bg,
              severityColors.text
            )}
          >
            {getCategoryLabel(evidence.category).toUpperCase()}
          </span>
          {/* Severity */}
          <span className="text-[10px] text-zinc-500 uppercase">
            {evidence.severity}
          </span>
        </div>

        {/* Timestamp button */}
        <button
          onClick={() => onTimestampClick?.(evidence.timestamp)}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs',
            'bg-zinc-800 hover:bg-zinc-700 transition-colors',
            'text-zinc-300 hover:text-white',
            onTimestampClick ? 'cursor-pointer' : 'cursor-default'
          )}
          disabled={!onTimestampClick}
        >
          <Clock className="w-3 h-3" />
          <span>{formatTimestamp(evidence.timestamp)}</span>
          {evidence.endTimestamp && (
            <span className="text-zinc-500">
              - {formatTimestamp(evidence.endTimestamp)}
            </span>
          )}
        </button>
      </div>

      {/* Quote (if available) */}
      {evidence.quote && (
        <div className="flex items-start gap-2 mb-2 p-2 bg-zinc-800/50 rounded">
          <Quote className="w-3 h-3 text-zinc-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-zinc-300 italic">"{evidence.quote}"</p>
        </div>
      )}

      {/* Description */}
      {evidence.description && (
        <p className="text-sm text-zinc-400 mb-2">{evidence.description}</p>
      )}

      {/* Context and source */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500">
        {evidence.context && (
          <span className="truncate max-w-[70%]">{evidence.context}</span>
        )}
        <div className="flex items-center gap-1">
          <SourceIcon className="w-3 h-3" />
          <span className="capitalize">{evidence.source}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Evidence panel component - displays all flagged items with timestamps
 */
export function EvidencePanel({
  evidence,
  onTimestampClick,
  className,
}: EvidencePanelProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-3">
          <AlertTriangle className="w-6 h-6 text-emerald-400" />
        </div>
        <p className="text-sm text-zinc-400">No safety concerns detected</p>
        <p className="text-xs text-zinc-500 mt-1">
          This video appears to be brand-safe
        </p>
      </div>
    );
  }

  // Group evidence by category
  const groupedEvidence = evidence.reduce((acc, e) => {
    const category = e.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(e);
    return acc;
  }, {} as Record<FlagCategory, FlagEvidence[]>);

  // Sort by severity (high first)
  const severityOrder: Record<FlagSeverity, number> = { high: 0, medium: 1, low: 2 };
  const sortedEvidence = [...evidence].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-zinc-300 text-sm font-medium">
            Flagged Content ({evidence.length})
          </span>
        </div>

        {/* Category summary */}
        <div className="flex items-center gap-1">
          {Object.entries(groupedEvidence).map(([category, items]) => (
            <span
              key={category}
              className="px-1.5 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 rounded"
            >
              {getCategoryLabel(category as FlagCategory)}: {items.length}
            </span>
          ))}
        </div>
      </div>

      {/* Evidence list */}
      <div className="space-y-2">
        {sortedEvidence.map((e, index) => (
          <EvidenceItem
            key={`${e.category}-${e.timestamp}-${index}`}
            evidence={e}
            onTimestampClick={onTimestampClick}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact evidence summary for inline display
 */
export function EvidenceSummaryCompact({
  evidence,
  className,
}: {
  evidence: FlagEvidence[];
  className?: string;
}) {
  if (!evidence || evidence.length === 0) {
    return (
      <span className={cn('text-emerald-400 text-sm', className)}>
        No flags
      </span>
    );
  }

  const highCount = evidence.filter(e => e.severity === 'high').length;
  const mediumCount = evidence.filter(e => e.severity === 'medium').length;
  const lowCount = evidence.filter(e => e.severity === 'low').length;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {highCount > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
          {highCount} high
        </span>
      )}
      {mediumCount > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
          {mediumCount} medium
        </span>
      )}
      {lowCount > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
          {lowCount} low
        </span>
      )}
    </div>
  );
}
