'use client';

import { useRef, useEffect, useState } from 'react';
import {
  Search,
  Instagram,
  Youtube,
  Music2,
  AlertTriangle,
  Play,
  Check,
  X,
  Zap,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityItem } from '@/hooks/use-research-feed';

interface ActivityStreamProps {
  activities: ActivityItem[];
  isStreaming: boolean;
}

function getActivityIcon(type: ActivityItem['type'], data: Record<string, unknown>) {
  switch (type) {
    case 'search_started':
    case 'search_completed':
      return Search;
    case 'platform_started':
    case 'platform_completed':
      const platform = data.platform as string;
      if (platform === 'instagram') return Instagram;
      if (platform === 'youtube') return Youtube;
      if (platform === 'tiktok') return Music2;
      return Music2;
    case 'finding_discovered':
      return AlertTriangle;
    case 'creator_started':
      return Play;
    case 'creator_completed':
      return Check;
    case 'creator_failed':
      return X;
    case 'analysis_step':
      return Zap;
    default:
      return Zap;
  }
}

function getActivityColor(type: ActivityItem['type'], data: Record<string, unknown>): string {
  switch (type) {
    case 'search_started':
      return 'text-violet-400';
    case 'search_completed':
      return 'text-violet-400';
    case 'platform_started':
    case 'platform_completed':
      const platform = data.platform as string;
      if (platform === 'instagram') return 'text-pink-400';
      if (platform === 'youtube') return 'text-red-400';
      if (platform === 'tiktok') return 'text-cyan-400';
      return 'text-zinc-400';
    case 'finding_discovered':
      const severity = data.severity as string;
      if (severity === 'critical' || severity === 'high') return 'text-red-400';
      if (severity === 'medium') return 'text-amber-400';
      return 'text-zinc-400';
    case 'creator_started':
      return 'text-blue-400';
    case 'creator_completed':
      return 'text-emerald-400';
    case 'creator_failed':
      return 'text-red-400';
    case 'analysis_step':
      return 'text-indigo-400';
    default:
      return 'text-zinc-400';
  }
}

function getActivityMessage(activity: ActivityItem): string {
  const { type, creatorName, data } = activity;

  switch (type) {
    case 'search_started':
      return `Searching "${data.query}" via ${data.source}`;
    case 'search_completed':
      return `Found ${data.resultsCount} results`;
    case 'platform_started':
      return `Fetching ${data.platform} posts`;
    case 'platform_completed':
      return `Retrieved ${data.postsCount} ${data.platform} posts`;
    case 'finding_discovered':
      return `${data.title}`;
    case 'creator_started':
      return `Started processing ${creatorName}`;
    case 'creator_completed':
      return `Completed ${creatorName} - ${data.riskLevel} risk, ${data.findingsCount} findings`;
    case 'creator_failed':
      return `Failed: ${data.error}`;
    case 'analysis_step':
      const stepLabels: Record<string, string> = {
        validation: 'Validating sources',
        content_analysis: 'Analyzing content',
        brand_detection: 'Detecting brands',
        profanity_check: 'Checking profanity',
        competitor_analysis: 'Analyzing competitors',
        rationale_generation: 'Generating report',
      };
      const step = data.step as string;
      const status = data.status as string;
      return `${stepLabels[step] || step} ${status === 'completed' ? 'done' : '...'}`;
    default:
      return 'Processing...';
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function ActivityStream({ activities, isStreaming }: ActivityStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  // Auto-scroll to bottom when new activities arrive
  useEffect(() => {
    if (autoScroll && !isHovering && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [activities, autoScroll, isHovering]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className="relative">
      {/* Auto-scroll indicator */}
      {!autoScroll && isStreaming && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300 hover:bg-zinc-700 transition-colors shadow-lg"
        >
          <Pause className="w-3 h-3" />
          Resume auto-scroll
        </button>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="h-[500px] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-sm"
      >
        {activities.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-600">
            Waiting for activity...
          </div>
        ) : (
          <div className="p-3 space-y-0.5">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type, activity.data);
              const color = getActivityColor(activity.type, activity.data);

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-2 py-1 hover:bg-zinc-900/50 px-1 rounded transition-colors animate-in fade-in slide-in-from-bottom-1 duration-200"
                >
                  {/* Timestamp */}
                  <span className="text-zinc-600 text-xs tabular-nums flex-shrink-0 w-16">
                    {formatTime(activity.timestamp)}
                  </span>

                  {/* Icon */}
                  <Icon className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', color)} />

                  {/* Creator name */}
                  <span className="text-zinc-500 flex-shrink-0 w-24 truncate">
                    {activity.creatorName}
                  </span>

                  {/* Message */}
                  <span className={cn('flex-1 truncate', color)}>
                    {getActivityMessage(activity)}
                  </span>
                </div>
              );
            })}

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 py-1 px-1">
                <span className="text-zinc-600 text-xs w-16" />
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
