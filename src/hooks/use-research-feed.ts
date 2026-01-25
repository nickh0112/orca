'use client';

import { useCallback, useState, useRef } from 'react';
import type { RiskLevel, Severity } from '@/types';
import type { AnalysisStepType } from '@/types/stream-events';

export interface SearchProgress {
  id: string;
  query: string;
  source: 'exa' | 'google';
  status: 'searching' | 'completed';
  resultsCount?: number;
  startedAt: number;
  completedAt?: number;
}

export interface PlatformProgress {
  status: 'pending' | 'fetching' | 'completed' | 'failed';
  postsCount?: number;
  startedAt?: number;
  completedAt?: number;
}

export interface FindingItem {
  title: string;
  severity: Severity;
  type: string;
  source: string;
  timestamp: number;
}

export interface CreatorProgress {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  error?: string;

  // Active searches
  searches: SearchProgress[];

  // Platform progress
  platforms: Map<string, PlatformProgress>;

  // Analysis steps
  currentStep?: AnalysisStepType;
  completedSteps: AnalysisStepType[];

  // Findings stream
  findings: FindingItem[];

  // Final result
  riskLevel?: RiskLevel;
  summary?: string;
  findingsCount?: number;
}

export interface ActivityItem {
  id: string;
  type: 'search_started' | 'search_completed' | 'platform_started' | 'platform_completed' |
        'analysis_step' | 'finding_discovered' | 'creator_started' | 'creator_completed' | 'creator_failed';
  creatorId: string;
  creatorName: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface ResearchFeedState {
  creators: Map<string, CreatorProgress>;
  activityLog: ActivityItem[];
  isStreaming: boolean;
  isComplete: boolean;
  error: string | null;
  startTime?: number;
}

let activityIdCounter = 0;

export function useResearchFeed(batchId: string | null) {
  const [creators, setCreators] = useState<Map<string, CreatorProgress>>(new Map());
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | undefined>();
  const eventSourceRef = useRef<EventSource | null>(null);
  const creatorNamesRef = useRef<Map<string, string>>(new Map());

  const addActivity = useCallback((
    type: ActivityItem['type'],
    creatorId: string,
    data: Record<string, unknown>,
    timestamp: number
  ) => {
    const creatorName = creatorNamesRef.current.get(creatorId) || 'Unknown';
    setActivityLog((prev) => [
      ...prev,
      {
        id: `activity-${++activityIdCounter}`,
        type,
        creatorId,
        creatorName,
        timestamp,
        data,
      },
    ]);
  }, []);

  const startStream = useCallback(() => {
    if (!batchId || eventSourceRef.current) return;

    setIsStreaming(true);
    setError(null);
    setIsComplete(false);
    setStartTime(Date.now());
    setCreators(new Map());
    setActivityLog([]);

    const eventSource = new EventSource(`/api/batches/${batchId}/stream`);
    eventSourceRef.current = eventSource;

    // Creator started
    eventSource.addEventListener('creator_started', (event) => {
      const data = JSON.parse(event.data);
      const { creatorId, name, timestamp } = data;

      creatorNamesRef.current.set(creatorId, name);

      setCreators((prev) => {
        const next = new Map(prev);
        next.set(creatorId, {
          id: creatorId,
          name,
          status: 'processing',
          startedAt: timestamp,
          searches: [],
          platforms: new Map(),
          completedSteps: [],
          findings: [],
        });
        return next;
      });

      addActivity('creator_started', creatorId, { name }, timestamp);
    });

    // Search started
    eventSource.addEventListener('search_started', (event) => {
      const data = JSON.parse(event.data);
      const { creatorId, searchId, query, source, timestamp } = data;

      setCreators((prev) => {
        const next = new Map(prev);
        const creator = next.get(creatorId);
        if (creator) {
          next.set(creatorId, {
            ...creator,
            searches: [
              ...creator.searches,
              {
                id: searchId,
                query,
                source,
                status: 'searching',
                startedAt: timestamp,
              },
            ],
          });
        }
        return next;
      });

      addActivity('search_started', creatorId, { query, source }, timestamp);
    });

    // Search completed
    eventSource.addEventListener('search_completed', (event) => {
      const data = JSON.parse(event.data);
      const { creatorId, searchId, resultsCount, durationMs, timestamp } = data;

      setCreators((prev) => {
        const next = new Map(prev);
        const creator = next.get(creatorId);
        if (creator) {
          next.set(creatorId, {
            ...creator,
            searches: creator.searches.map((s) =>
              s.id === searchId
                ? { ...s, status: 'completed' as const, resultsCount, completedAt: timestamp }
                : s
            ),
          });
        }
        return next;
      });

      addActivity('search_completed', creatorId, { resultsCount, durationMs }, timestamp);
    });

    // Platform started
    eventSource.addEventListener('platform_started', (event) => {
      const data = JSON.parse(event.data);
      const { creatorId, platform, timestamp } = data;

      setCreators((prev) => {
        const next = new Map(prev);
        const creator = next.get(creatorId);
        if (creator) {
          const platforms = new Map(creator.platforms);
          platforms.set(platform, {
            status: 'fetching',
            startedAt: timestamp,
          });
          next.set(creatorId, { ...creator, platforms });
        }
        return next;
      });

      addActivity('platform_started', creatorId, { platform }, timestamp);
    });

    // Platform completed
    eventSource.addEventListener('platform_completed', (event) => {
      const data = JSON.parse(event.data);
      const { creatorId, platform, postsCount, durationMs, timestamp } = data;

      setCreators((prev) => {
        const next = new Map(prev);
        const creator = next.get(creatorId);
        if (creator) {
          const platforms = new Map(creator.platforms);
          platforms.set(platform, {
            status: 'completed',
            postsCount,
            completedAt: timestamp,
          });
          next.set(creatorId, { ...creator, platforms });
        }
        return next;
      });

      addActivity('platform_completed', creatorId, { platform, postsCount, durationMs }, timestamp);
    });

    // Analysis step
    eventSource.addEventListener('analysis_step', (event) => {
      const data = JSON.parse(event.data);
      const { creatorId, step, status, timestamp } = data;

      setCreators((prev) => {
        const next = new Map(prev);
        const creator = next.get(creatorId);
        if (creator) {
          if (status === 'started') {
            next.set(creatorId, {
              ...creator,
              currentStep: step,
            });
          } else if (status === 'completed') {
            next.set(creatorId, {
              ...creator,
              currentStep: undefined,
              completedSteps: [...creator.completedSteps, step],
            });
          }
        }
        return next;
      });

      addActivity('analysis_step', creatorId, { step, status }, timestamp);
    });

    // Finding discovered
    eventSource.addEventListener('finding_discovered', (event) => {
      const data = JSON.parse(event.data);
      const { creatorId, title, severity, type, source, timestamp } = data;

      setCreators((prev) => {
        const next = new Map(prev);
        const creator = next.get(creatorId);
        if (creator) {
          next.set(creatorId, {
            ...creator,
            findings: [
              ...creator.findings,
              { title, severity, type, source, timestamp },
            ],
          });
        }
        return next;
      });

      addActivity('finding_discovered', creatorId, { title, severity, type }, timestamp);
    });

    // Creator completed
    eventSource.addEventListener('creator_completed', (event) => {
      const data = JSON.parse(event.data);
      const { creatorId, name, riskLevel, findingsCount, summary, timestamp } = data;

      setCreators((prev) => {
        const next = new Map(prev);
        const creator = next.get(creatorId);
        if (creator) {
          next.set(creatorId, {
            ...creator,
            status: 'completed',
            completedAt: timestamp,
            riskLevel,
            summary,
            findingsCount,
            currentStep: undefined,
          });
        }
        return next;
      });

      addActivity('creator_completed', creatorId, { riskLevel, findingsCount }, timestamp);
    });

    // Creator failed
    eventSource.addEventListener('creator_failed', (event) => {
      const data = JSON.parse(event.data);
      const { creatorId, name, error: errorMsg, timestamp } = data;

      setCreators((prev) => {
        const next = new Map(prev);
        const creator = next.get(creatorId);
        if (creator) {
          next.set(creatorId, {
            ...creator,
            status: 'failed',
            completedAt: timestamp,
            error: errorMsg,
            currentStep: undefined,
          });
        }
        return next;
      });

      addActivity('creator_failed', creatorId, { error: errorMsg }, timestamp);
    });

    // Batch completed
    eventSource.addEventListener('batch_completed', () => {
      setIsComplete(true);
      setIsStreaming(false);
      eventSource.close();
      eventSourceRef.current = null;
    });

    // Error handling
    eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        setError(data.message);
      } catch {
        setError('Connection error');
      }
      setIsStreaming(false);
      eventSource.close();
      eventSourceRef.current = null;
    });

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        setIsStreaming(false);
        eventSourceRef.current = null;
      }
    };
  }, [batchId, addActivity]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  // Computed values
  const creatorsArray = Array.from(creators.values());
  const completedCount = creatorsArray.filter((c) => c.status === 'completed').length;
  const failedCount = creatorsArray.filter((c) => c.status === 'failed').length;
  const processingCount = creatorsArray.filter((c) => c.status === 'processing').length;
  const totalFindings = creatorsArray.reduce((sum, c) => sum + (c.findingsCount || 0), 0);

  return {
    // State
    creators,
    creatorsArray,
    activityLog,
    isStreaming,
    isComplete,
    error,
    startTime,

    // Computed
    completedCount,
    failedCount,
    processingCount,
    totalFindings,

    // Actions
    startStream,
    stopStream,
  };
}
