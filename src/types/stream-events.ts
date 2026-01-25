import type { RiskLevel, Severity } from './index';

// Search events
export interface SearchStartedEvent {
  creatorId: string;
  searchId: string;
  query: string;
  source: 'exa' | 'google';
  timestamp: number;
}

export interface SearchCompletedEvent {
  creatorId: string;
  searchId: string;
  resultsCount: number;
  durationMs: number;
  timestamp: number;
}

// Platform events
export interface PlatformStartedEvent {
  creatorId: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  timestamp: number;
}

export interface PlatformCompletedEvent {
  creatorId: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  postsCount: number;
  durationMs: number;
  timestamp: number;
}

// Analysis events
export type AnalysisStepType =
  | 'validation'
  | 'content_analysis'
  | 'brand_detection'
  | 'profanity_check'
  | 'competitor_analysis'
  | 'rationale_generation';

export interface AnalysisStepEvent {
  creatorId: string;
  step: AnalysisStepType;
  status: 'started' | 'completed';
  timestamp: number;
}

// Finding events
export interface FindingDiscoveredEvent {
  creatorId: string;
  title: string;
  severity: Severity;
  type: string;
  source: string;
  timestamp: number;
}

// Creator events (existing, but documented)
export interface CreatorStartedEvent {
  creatorId: string;
  name: string;
  timestamp: number;
}

export interface CreatorCompletedEvent {
  creatorId: string;
  name: string;
  riskLevel: RiskLevel;
  findingsCount: number;
  summary: string;
  profanityDetected: boolean;
  googleResults: number;
  brandPartnerships: number;
  uniqueBrands: number;
  competitorPartnerships: number;
  timestamp: number;
}

export interface CreatorFailedEvent {
  creatorId: string;
  name: string;
  error: string;
  timestamp: number;
}

// Batch events (existing)
export interface BatchCompletedEvent {
  batchId: string;
  status: 'COMPLETED';
  metrics: {
    durationMs: number;
    durationMinutes: number;
    totalCreators: number;
    completedCreators: number;
    failedCreators: number;
    totalPosts: number;
    creatorsPerMinute: number;
    postsPerMinute: number;
    concurrencyUsed: number;
  };
  timestamp: number;
}

// Union type for all stream events
export type StreamEventType =
  | 'search_started'
  | 'search_completed'
  | 'platform_started'
  | 'platform_completed'
  | 'analysis_step'
  | 'finding_discovered'
  | 'creator_started'
  | 'creator_completed'
  | 'creator_failed'
  | 'batch_completed'
  | 'error';

export type StreamEventData =
  | SearchStartedEvent
  | SearchCompletedEvent
  | PlatformStartedEvent
  | PlatformCompletedEvent
  | AnalysisStepEvent
  | FindingDiscoveredEvent
  | CreatorStartedEvent
  | CreatorCompletedEvent
  | CreatorFailedEvent
  | BatchCompletedEvent;
