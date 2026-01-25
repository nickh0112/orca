'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, FileText, Tag, ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { TranscriptSegment } from '@/types';

interface TranscriptPanelProps {
  segments?: TranscriptSegment[];
  fullText?: string;
  brands?: string[];
  currentTime?: number;
  className?: string;
  onSeek?: (time: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function highlightText(
  text: string,
  searchQuery: string,
  brands: string[],
  t: (key: string) => string
): React.ReactNode[] {
  if (!searchQuery && brands.length === 0) {
    return [text];
  }

  // Build regex pattern for both search and brands
  const patterns: string[] = [];
  if (searchQuery) {
    patterns.push(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }
  brands.forEach(brand => {
    patterns.push(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  });

  if (patterns.length === 0) return [text];

  const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isSearchMatch = searchQuery && part.toLowerCase() === searchQuery.toLowerCase();
    const isBrandMatch = brands.some(b => b.toLowerCase() === part.toLowerCase());

    if (isSearchMatch) {
      return (
        <mark key={i} className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      );
    }
    if (isBrandMatch) {
      return (
        <span
          key={i}
          className="bg-purple-500/20 text-purple-300 px-0.5 rounded border-b border-purple-500/50"
          title={t('brandMention')}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export function TranscriptPanel({
  segments,
  fullText,
  brands = [],
  currentTime = 0,
  className,
  onSeek
}: TranscriptPanelProps) {
  const t = useTranslations('creatorReport.transcript');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Generate segments from full text if not provided
  // Merge word-level segments into ~5 second chunks for readability
  const processedSegments = useMemo(() => {
    if (segments && segments.length > 0) {
      // Merge word-level segments into ~5 second chunks
      const CHUNK_DURATION = 5; // seconds
      const merged: TranscriptSegment[] = [];
      let current: TranscriptSegment | null = null;

      for (const seg of segments) {
        if (!current) {
          current = { ...seg };
        } else if (seg.start - current.start < CHUNK_DURATION) {
          // Within chunk duration, merge text
          current.text += ' ' + seg.text;
          current.end = seg.end;
          // Keep lowest confidence if available
          if (seg.confidence !== undefined && current.confidence !== undefined) {
            current.confidence = Math.min(current.confidence, seg.confidence);
          }
        } else {
          // Start a new chunk
          merged.push(current);
          current = { ...seg };
        }
      }
      if (current) merged.push(current);

      return merged;
    }
    // If only full text is provided, create a single segment
    if (fullText) {
      return [{ text: fullText, start: 0, end: 0 }];
    }
    return [];
  }, [segments, fullText]);

  // Find matching segments
  const matchingSegments = useMemo(() => {
    if (!searchQuery) return [];
    return processedSegments
      .map((segment, index) => ({ segment, index }))
      .filter(({ segment }) =>
        segment.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [processedSegments, searchQuery]);

  // Find current segment based on playback time
  const currentSegmentIndex = useMemo(() => {
    return processedSegments.findIndex(
      segment => currentTime >= segment.start && currentTime <= segment.end
    );
  }, [processedSegments, currentTime]);

  // Navigate to match
  const navigateToMatch = useCallback((index: number) => {
    if (matchingSegments.length === 0) return;

    const wrappedIndex = ((index % matchingSegments.length) + matchingSegments.length) % matchingSegments.length;
    setMatchIndex(wrappedIndex);

    const segmentIndex = matchingSegments[wrappedIndex].index;
    const element = segmentRefs.current.get(segmentIndex);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [matchingSegments]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!searchQuery || matchingSegments.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        navigateToMatch(matchIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateToMatch(matchIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, matchingSegments, matchIndex, navigateToMatch]);

  // Auto-scroll disabled - it was scrolling the entire page, not just the transcript container.
  // Users can click timestamps to jump to specific parts of the transcript.

  if (processedSegments.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/10 rounded-md">
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-zinc-300 text-sm font-medium">{t('title')}</span>
        </div>
        <p className="text-zinc-600 text-sm">{t('noTranscript')}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/10 rounded-md">
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-zinc-300 text-sm font-medium">{t('title')}</span>
        </div>
        {brands.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-purple-400">
            <Tag className="w-3 h-3" />
            <span>{brands.length} brands</span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setMatchIndex(0);
          }}
          placeholder={t('search')}
          className="w-full pl-9 pr-20 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
        />
        {searchQuery && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {matchingSegments.length > 0 ? (
              <>
                <span className="text-xs text-zinc-500">
                  {matchIndex + 1}/{matchingSegments.length}
                </span>
                <button
                  onClick={() => navigateToMatch(matchIndex - 1)}
                  className="p-1 hover:bg-zinc-800 rounded"
                >
                  <ChevronUp className="w-3 h-3 text-zinc-500" />
                </button>
                <button
                  onClick={() => navigateToMatch(matchIndex + 1)}
                  className="p-1 hover:bg-zinc-800 rounded"
                >
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>
              </>
            ) : (
              <span className="text-xs text-zinc-600">{t('noResults')}</span>
            )}
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 hover:bg-zinc-800 rounded"
            >
              <X className="w-3 h-3 text-zinc-500" />
            </button>
          </div>
        )}
      </div>

      {/* Transcript Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto max-h-64 pr-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
      >
        {processedSegments.map((segment, index) => {
          const isCurrentSegment = index === currentSegmentIndex;
          const isMatchingSegment = matchingSegments.some(m => m.index === index);
          const isCurrentMatch = matchingSegments[matchIndex]?.index === index;

          return (
            <div
              key={index}
              ref={(el) => {
                if (el) segmentRefs.current.set(index, el);
              }}
              onClick={() => segment.start > 0 && onSeek?.(segment.start)}
              className={cn(
                'flex gap-3 p-2 rounded-lg transition-colors',
                segment.start > 0 && 'cursor-pointer hover:bg-zinc-800/50',
                isCurrentSegment && 'bg-cyan-950/30 border-l-2 border-cyan-500',
                isCurrentMatch && 'bg-yellow-950/30 border-l-2 border-yellow-500',
                isMatchingSegment && !isCurrentMatch && 'bg-yellow-950/10'
              )}
            >
              {/* Timestamp */}
              {segment.start > 0 && (
                <span className="text-xs text-zinc-600 font-mono w-10 shrink-0 pt-0.5">
                  {formatTime(segment.start)}
                </span>
              )}

              {/* Text */}
              <p className="text-sm text-zinc-300 flex-1">
                {highlightText(segment.text, searchQuery, brands, t)}
              </p>

              {/* Confidence indicator */}
              {segment.confidence !== undefined && segment.confidence < 0.8 && (
                <span className="text-[10px] text-zinc-600" title="Lower confidence">
                  ~
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      {onSeek && processedSegments.some(s => s.start > 0) && (
        <p className="text-[10px] text-zinc-600 mt-2 pt-2 border-t border-zinc-800">
          {t('clickToSeek')}
        </p>
      )}
    </div>
  );
}

// Compact version showing just the full transcript text
export function TranscriptCompact({
  fullText,
  maxLength = 200,
  className
}: {
  fullText?: string;
  maxLength?: number;
  className?: string;
}) {
  const t = useTranslations('creatorReport.transcript');

  if (!fullText) return null;

  const truncated = fullText.length > maxLength
    ? fullText.slice(0, maxLength) + '...'
    : fullText;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <FileText className="w-3 h-3 text-cyan-400" />
        <span className="text-zinc-500 text-xs">{t('title')}</span>
      </div>
      <p className="text-zinc-400 text-sm leading-relaxed">
        &ldquo;{truncated}&rdquo;
      </p>
    </div>
  );
}
