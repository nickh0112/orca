'use client';

import { useState, useEffect } from 'react';
import { Clock, LayoutList, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResearchFeed, type CreatorProgress } from '@/hooks/use-research-feed';
import { CreatorCard } from './creator-card';
import { ActivityStream } from './activity-stream';

interface ResearchFeedProps {
  batchId: string;
  creators: Array<{ id: string; name: string }>;
  onComplete?: () => void;
}

type ViewMode = 'cards' | 'activity';

export function ResearchFeed({ batchId, creators, onComplete }: ResearchFeedProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [expandedCreators, setExpandedCreators] = useState<Set<string>>(new Set());

  const {
    creators: creatorsProgress,
    creatorsArray,
    activityLog,
    isStreaming,
    isComplete,
    error,
    startTime,
    completedCount,
    failedCount,
    processingCount,
    startStream,
  } = useResearchFeed(batchId);

  // Start streaming on mount
  useEffect(() => {
    startStream();
  }, [startStream]);

  // Call onComplete when batch finishes
  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  // Auto-expand currently processing creators
  useEffect(() => {
    const processingIds = creatorsArray
      .filter((c) => c.status === 'processing')
      .map((c) => c.id);

    if (processingIds.length > 0) {
      setExpandedCreators((prev) => {
        const next = new Set(prev);
        processingIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [creatorsArray]);

  const toggleCreator = (id: string) => {
    setExpandedCreators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Merge creator list with progress data
  const mergedCreators: CreatorProgress[] = creators.map((c) => {
    const progress = creatorsProgress.get(c.id);
    if (progress) return progress;
    return {
      id: c.id,
      name: c.name,
      status: 'pending' as const,
      searches: [],
      platforms: new Map(),
      completedSteps: [],
      findings: [],
    };
  });

  // Calculate elapsed time
  const elapsedMs = startTime ? Date.now() - startTime : 0;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const elapsedFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Users className="w-4 h-4" />
            <span>
              <span className="text-zinc-300">{completedCount}</span>
              <span className="text-zinc-600">/</span>
              <span>{creators.length}</span>
            </span>
          </div>

          {isStreaming && startTime && (
            <div className="flex items-center gap-1.5 text-zinc-500 text-sm">
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums">{elapsedFormatted}</span>
            </div>
          )}

          {processingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-400 text-sm">{processingCount} active</span>
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
          <button
            onClick={() => setViewMode('cards')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              viewMode === 'cards'
                ? 'bg-zinc-800 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-400'
            )}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('activity')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
              viewMode === 'activity'
                ? 'bg-zinc-800 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-400'
            )}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Activity
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-950/30 border border-red-900 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Content */}
      {viewMode === 'cards' ? (
        <div className="space-y-2">
          {mergedCreators.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              isExpanded={expandedCreators.has(creator.id)}
              onToggle={() => toggleCreator(creator.id)}
            />
          ))}
        </div>
      ) : (
        <ActivityStream
          activities={activityLog}
          isStreaming={isStreaming}
        />
      )}

      {/* Completion message */}
      {isComplete && (
        <div className="text-center py-4">
          <p className="text-zinc-500 text-sm">
            Research complete. {completedCount} analyzed
            {failedCount > 0 && `, ${failedCount} failed`}
          </p>
        </div>
      )}
    </div>
  );
}
