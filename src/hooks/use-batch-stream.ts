'use client';

import { useCallback, useState, useRef } from 'react';
import type { CreatorResult, RiskLevel } from '@/types';

interface StreamEvent {
  creatorId: string;
  name: string;
  riskLevel?: RiskLevel;
  findingsCount?: number;
  summary?: string;
  error?: string;
}

export function useBatchStream(batchId: string | null) {
  const [results, setResults] = useState<Map<string, CreatorResult>>(new Map());
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startStream = useCallback(() => {
    if (!batchId || eventSourceRef.current) return;

    setIsStreaming(true);
    setError(null);
    setIsComplete(false);

    const eventSource = new EventSource(`/api/batches/${batchId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('creator_started', (event) => {
      const data: StreamEvent = JSON.parse(event.data);
      setResults((prev) => {
        const next = new Map(prev);
        next.set(data.creatorId, {
          creatorId: data.creatorId,
          name: data.name,
          status: 'processing',
        });
        return next;
      });
    });

    eventSource.addEventListener('creator_completed', (event) => {
      const data: StreamEvent = JSON.parse(event.data);
      setResults((prev) => {
        const next = new Map(prev);
        next.set(data.creatorId, {
          creatorId: data.creatorId,
          name: data.name,
          riskLevel: data.riskLevel,
          findingsCount: data.findingsCount,
          summary: data.summary,
          status: 'completed',
        });
        return next;
      });
    });

    eventSource.addEventListener('creator_failed', (event) => {
      const data: StreamEvent = JSON.parse(event.data);
      setResults((prev) => {
        const next = new Map(prev);
        next.set(data.creatorId, {
          creatorId: data.creatorId,
          name: data.name,
          error: data.error,
          status: 'failed',
        });
        return next;
      });
    });

    eventSource.addEventListener('batch_completed', () => {
      setIsComplete(true);
      setIsStreaming(false);
      eventSource.close();
      eventSourceRef.current = null;
    });

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
  }, [batchId]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  return {
    results: Array.from(results.values()),
    resultsMap: results,
    isStreaming,
    isComplete,
    error,
    startStream,
    stopStream,
  };
}
