'use client';

import { ProcessingSteps, type ProcessingStep } from './processing-steps';
import { LiveResultsPanel } from './live-results-panel';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';

interface ProcessingViewProps {
  // Processing steps
  steps: ProcessingStep[];
  currentStepIndex: number;
  elapsedTime?: number;

  // Creator info
  creatorName: string;
  creatorAvatar?: string;
  creatorHandles?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };

  // Search queries
  searchQueries?: Array<{
    query: string;
    source: 'web' | 'instagram' | 'tiktok';
    status: 'pending' | 'searching' | 'found' | 'none';
    resultsCount?: number;
  }>;

  // Results
  results?: Array<{
    id: string;
    source: 'web' | 'instagram' | 'tiktok';
    title: string;
    url?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
  }>;

  // Risk assessment
  riskLevel?: RiskLevel;
  riskCounts?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  verdict?: 'approve' | 'review' | 'pending';
  isComplete?: boolean;

  className?: string;
}

export function ProcessingView({
  steps,
  currentStepIndex,
  elapsedTime,
  creatorName,
  creatorAvatar,
  creatorHandles,
  searchQueries = [],
  results = [],
  riskLevel,
  riskCounts,
  verdict,
  isComplete = false,
  className,
}: ProcessingViewProps) {
  return (
    <div className={cn('flex h-full bg-zinc-950', className)}>
      {/* Left panel - Processing steps */}
      <div className="w-[360px] border-r border-zinc-800 bg-zinc-900/30 py-6">
        <ProcessingSteps
          steps={steps}
          currentStepIndex={currentStepIndex}
          elapsedTime={elapsedTime}
        />
      </div>

      {/* Right panel - Live results */}
      <div className="flex-1 bg-zinc-950">
        <LiveResultsPanel
          creator={{
            name: creatorName,
            avatarUrl: creatorAvatar,
            handles: creatorHandles,
          }}
          searchQueries={searchQueries}
          results={results}
          riskLevel={riskLevel}
          riskCounts={riskCounts}
          verdict={verdict}
          isComplete={isComplete}
        />
      </div>
    </div>
  );
}

// Demo/preview version with mock data
export function ProcessingViewDemo() {
  const mockSteps: ProcessingStep[] = [
    { id: 'deep-dive', label: 'Deep Dive', status: 'completed', duration: 3 },
    { id: 'thinking', label: 'Thinking', status: 'completed', duration: 2 },
    { id: 'exploring', label: 'Exploring the request', status: 'completed', duration: 4 },
    { id: 'web-sources', label: 'Evaluating web sources', status: 'active' },
    { id: 'instagram', label: 'Scanning Instagram', status: 'pending' },
    { id: 'analyzing', label: 'Analyzing Content', status: 'pending' },
    { id: 'tiktok', label: 'Scanning TikTok', status: 'pending' },
  ];

  const mockQueries = [
    { query: 'controversy news', source: 'web' as const, status: 'found' as const, resultsCount: 12 },
    { query: '@creator_handle', source: 'instagram' as const, status: 'searching' as const },
    { query: 'brand partnerships', source: 'web' as const, status: 'found' as const, resultsCount: 5 },
  ];

  const mockResults = [
    { id: '1', source: 'web' as const, title: 'Creator mentioned in news article about influencer marketing', severity: 'low' as const, timestamp: new Date() },
    { id: '2', source: 'web' as const, title: 'Brand partnership announcement with competitor', severity: 'high' as const, timestamp: new Date() },
    { id: '3', source: 'instagram' as const, title: 'Sponsored post with disclosure issues', severity: 'medium' as const, timestamp: new Date() },
  ];

  return (
    <ProcessingView
      steps={mockSteps}
      currentStepIndex={3}
      elapsedTime={45}
      creatorName="@example_creator"
      creatorHandles={{ instagram: 'example_creator', tiktok: 'example_creator' }}
      searchQueries={mockQueries}
      results={mockResults}
      riskCounts={{ critical: 0, high: 1, medium: 1, low: 1 }}
    />
  );
}
