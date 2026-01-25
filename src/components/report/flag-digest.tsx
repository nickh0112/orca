'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Clock, Quote, Eye, Volume2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlagEvidence, FlagCategory, FlagSeverity, FlagSource, CategoryScores } from '@/types/video-analysis';

interface FlagDigestProps {
  evidence: FlagEvidence[];
  categoryScores?: CategoryScores;
  selectedFlagId?: string;
  onFlagClick?: (evidence: FlagEvidence) => void;
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
 * Get severity color classes
 */
function getSeverityConfig(severity: FlagSeverity) {
  switch (severity) {
    case 'high':
      return { dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
    case 'medium':
      return { dot: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    case 'low':
      return { dot: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
  }
}

/**
 * Get source icon
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
 * Get category display config
 */
function getCategoryConfig(category: FlagCategory) {
  const configs: Record<FlagCategory, { label: string; color: string }> = {
    profanity: { label: 'Profanity', color: 'text-red-400' },
    violence: { label: 'Violence', color: 'text-orange-400' },
    adult: { label: 'Adult Content', color: 'text-pink-400' },
    substances: { label: 'Substances', color: 'text-purple-400' },
    controversial: { label: 'Controversial', color: 'text-amber-400' },
    dangerous: { label: 'Dangerous', color: 'text-red-400' },
    political: { label: 'Political', color: 'text-blue-400' },
    competitor: { label: 'Competitor', color: 'text-rose-400' },
    sponsor: { label: 'Sponsor', color: 'text-emerald-400' },
  };
  return configs[category] || { label: category, color: 'text-zinc-400' };
}

/**
 * Create unique ID for a flag evidence item
 */
function getFlagId(evidence: FlagEvidence, index: number): string {
  return `${evidence.category}-${evidence.timestamp}-${index}`;
}

/**
 * Single flag item in the digest
 */
function FlagItem({
  evidence,
  index,
  isSelected,
  onFlagClick,
  onTimestampClick,
}: {
  evidence: FlagEvidence;
  index: number;
  isSelected: boolean;
  onFlagClick?: (evidence: FlagEvidence) => void;
  onTimestampClick?: (timestamp: number) => void;
}) {
  const severityConfig = getSeverityConfig(evidence.severity);
  const SourceIcon = getSourceIcon(evidence.source);

  const handleClick = () => {
    onFlagClick?.(evidence);
    onTimestampClick?.(evidence.timestamp);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left px-3 py-2 rounded-lg transition-all',
        'hover:bg-zinc-800/50',
        isSelected && 'bg-zinc-800 ring-1 ring-zinc-700'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Severity dot */}
        <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', severityConfig.dot)} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs uppercase font-medium', severityConfig.text)}>
              {evidence.severity}
            </span>
            <span className="text-zinc-600">·</span>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="w-3 h-3" />
              <span>{formatTimestamp(evidence.timestamp)}</span>
            </div>
            <span className="text-zinc-600">·</span>
            <div className="flex items-center gap-1 text-[10px] text-zinc-600">
              <SourceIcon className="w-3 h-3" />
              <span className="capitalize">{evidence.source}</span>
            </div>
          </div>

          {/* Quote if available */}
          {evidence.quote && (
            <div className="flex items-start gap-1.5 mb-1">
              <Quote className="w-3 h-3 text-zinc-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-zinc-300 italic truncate">"{evidence.quote}"</p>
            </div>
          )}

          {/* Description */}
          {evidence.description && !evidence.quote && (
            <p className="text-sm text-zinc-400 truncate">{evidence.description}</p>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * Collapsible category group
 */
function CategoryGroup({
  category,
  evidence,
  score,
  selectedFlagId,
  onFlagClick,
  onTimestampClick,
  defaultExpanded = true,
}: {
  category: FlagCategory;
  evidence: FlagEvidence[];
  score?: { score: number; reason: string };
  selectedFlagId?: string;
  onFlagClick?: (evidence: FlagEvidence) => void;
  onTimestampClick?: (timestamp: number) => void;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const categoryConfig = getCategoryConfig(category);

  // Sort by severity (high first), then by timestamp
  const sortedEvidence = useMemo(() => {
    const severityOrder: Record<FlagSeverity, number> = { high: 0, medium: 1, low: 2 };
    return [...evidence].sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.timestamp - b.timestamp;
    });
  }, [evidence]);

  // Count by severity
  const highCount = evidence.filter(e => e.severity === 'high').length;
  const medCount = evidence.filter(e => e.severity === 'medium').length;
  const lowCount = evidence.filter(e => e.severity === 'low').length;

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          )}
          <span className={cn('font-medium', categoryConfig.color)}>
            {categoryConfig.label}
          </span>
          <span className="text-zinc-500 text-sm">({evidence.length})</span>
        </div>

        {/* Severity counts */}
        <div className="flex items-center gap-1.5">
          {highCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded">
              {highCount}
            </span>
          )}
          {medCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">
              {medCount}
            </span>
          )}
          {lowCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">
              {lowCount}
            </span>
          )}
        </div>
      </button>

      {/* Items */}
      {isExpanded && (
        <div className="divide-y divide-zinc-800/50">
          {sortedEvidence.map((e, idx) => (
            <FlagItem
              key={getFlagId(e, idx)}
              evidence={e}
              index={idx}
              isSelected={selectedFlagId === getFlagId(e, idx)}
              onFlagClick={onFlagClick}
              onTimestampClick={onTimestampClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * FlagDigest - Groups all evidence by category, sortable by severity
 * Main navigation component for reviewing flagged content
 */
export function FlagDigest({
  evidence,
  categoryScores,
  selectedFlagId,
  onFlagClick,
  onTimestampClick,
  className,
}: FlagDigestProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 mb-2">
          <Eye className="w-5 h-5 text-emerald-400" />
        </div>
        <p className="text-sm text-zinc-400">No flags detected</p>
        <p className="text-xs text-zinc-600 mt-1">Content appears brand-safe</p>
      </div>
    );
  }

  // Group evidence by category
  const groupedEvidence = useMemo(() => {
    const groups: Partial<Record<FlagCategory, FlagEvidence[]>> = {};
    for (const e of evidence) {
      if (!groups[e.category]) {
        groups[e.category] = [];
      }
      groups[e.category]!.push(e);
    }
    return groups;
  }, [evidence]);

  // Sort categories by severity (most high-severity flags first)
  const sortedCategories = useMemo(() => {
    const severityWeight = (items: FlagEvidence[]) => {
      return items.reduce((sum, e) => {
        if (e.severity === 'high') return sum + 3;
        if (e.severity === 'medium') return sum + 2;
        return sum + 1;
      }, 0);
    };

    return Object.entries(groupedEvidence)
      .sort(([, a], [, b]) => severityWeight(b!) - severityWeight(a!))
      .map(([category]) => category as FlagCategory);
  }, [groupedEvidence]);

  // Summary counts
  const highCount = evidence.filter(e => e.severity === 'high').length;
  const medCount = evidence.filter(e => e.severity === 'medium').length;
  const lowCount = evidence.filter(e => e.severity === 'low').length;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs uppercase tracking-wider text-zinc-500">Flag Digest</h3>
        <div className="flex items-center gap-1.5">
          {highCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded font-medium">
              {highCount} high
            </span>
          )}
          {medCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded font-medium">
              {medCount} med
            </span>
          )}
          {lowCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded font-medium">
              {lowCount} low
            </span>
          )}
        </div>
      </div>

      {/* Category groups */}
      <div className="space-y-2">
        {sortedCategories.map((category, idx) => (
          <CategoryGroup
            key={category}
            category={category}
            evidence={groupedEvidence[category]!}
            score={categoryScores?.[category as keyof CategoryScores]}
            selectedFlagId={selectedFlagId}
            onFlagClick={onFlagClick}
            onTimestampClick={onTimestampClick}
            defaultExpanded={idx < 3} // Expand first 3 categories by default
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact summary of flags for header display
 */
export function FlagSummaryCompact({
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
  const medCount = evidence.filter(e => e.severity === 'medium').length;
  const lowCount = evidence.filter(e => e.severity === 'low').length;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {highCount > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
          {highCount} high
        </span>
      )}
      {medCount > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
          {medCount} med
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
