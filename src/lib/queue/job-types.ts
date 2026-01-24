/**
 * Job Type Definitions for BullMQ Queues
 *
 * Defines the structure of jobs for different queue types:
 * - Video analysis jobs
 * - Image analysis jobs
 * - Scraper jobs (Apify)
 * - Batch processing jobs
 */

import type { AnalysisTier } from '@/lib/video-analysis/twelve-labs';
import type { PreScreenResult } from '@/lib/video-analysis/thumbnail-prescreener';

/**
 * Queue names for different job types
 */
export const QUEUE_NAMES = {
  VIDEO_ANALYSIS: 'video-analysis',
  IMAGE_ANALYSIS: 'image-analysis',
  SCRAPER: 'scraper',
  BATCH_COORDINATOR: 'batch-coordinator',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Video analysis job data
 */
export interface VideoAnalysisJobData {
  /** Unique job identifier */
  jobId: string;
  /** Batch ID this job belongs to */
  batchId: string;
  /** Creator ID */
  creatorId: string;
  /** Post ID from social media */
  postId: string;
  /** Video URL to analyze */
  videoUrl: string;
  /** Pre-downloaded video buffer (base64 encoded) */
  videoBufferBase64?: string;
  /** Thumbnail URL for pre-screening */
  thumbnailUrl?: string;
  /** Analysis tier to use */
  tier?: AnalysisTier;
  /** Pre-screen result if already performed */
  preScreenResult?: PreScreenResult;
  /** Platform (instagram, tiktok, youtube) */
  platform: string;
  /** Handle of the creator */
  handle: string;
  /** Retry count */
  attempt?: number;
}

/**
 * Video analysis job result
 */
export interface VideoAnalysisJobResult {
  success: boolean;
  postId: string;
  creatorId: string;
  /** Transcript text */
  transcript?: string;
  /** Visual analysis results (serialized) */
  visualAnalysis?: string;
  /** Logo detections (serialized) */
  logoDetections?: string;
  /** Content classification (serialized) */
  contentClassification?: string;
  /** Error message if failed */
  error?: string;
  /** Processing time in ms */
  processingTimeMs?: number;
  /** Tier used for analysis */
  tierUsed?: AnalysisTier;
}

/**
 * Image analysis job data
 */
export interface ImageAnalysisJobData {
  /** Unique job identifier */
  jobId: string;
  /** Batch ID */
  batchId: string;
  /** Creator ID */
  creatorId: string;
  /** Post ID */
  postId: string;
  /** Image URL to analyze */
  imageUrl: string;
  /** Pre-downloaded image buffer (base64 encoded) */
  imageBufferBase64?: string;
  /** Platform */
  platform: string;
  /** Handle */
  handle: string;
  /** Retry count */
  attempt?: number;
}

/**
 * Image analysis job result
 */
export interface ImageAnalysisJobResult {
  success: boolean;
  postId: string;
  creatorId: string;
  /** Visual analysis results (serialized) */
  visualAnalysis?: string;
  /** Error message if failed */
  error?: string;
  /** Processing time in ms */
  processingTimeMs?: number;
}

/**
 * Scraper job data (Apify)
 */
export interface ScraperJobData {
  /** Unique job identifier */
  jobId: string;
  /** Batch ID */
  batchId: string;
  /** Creator ID */
  creatorId: string;
  /** Platform to scrape */
  platform: 'instagram' | 'tiktok';
  /** Handle to scrape */
  handle: string;
  /** Months back to fetch */
  monthsBack: number;
  /** Max posts to fetch */
  maxPosts?: number;
  /** Retry count */
  attempt?: number;
}

/**
 * Scraper job result
 */
export interface ScraperJobResult {
  success: boolean;
  creatorId: string;
  platform: string;
  handle: string;
  /** Number of posts fetched */
  postCount?: number;
  /** Posts data (serialized) */
  postsData?: string;
  /** Error message if failed */
  error?: string;
  /** Processing time in ms */
  processingTimeMs?: number;
}

/**
 * Batch coordinator job data
 */
export interface BatchCoordinatorJobData {
  /** Batch ID to process */
  batchId: string;
  /** Search terms for the batch */
  searchTerms?: string[];
  /** Creator IDs to process */
  creatorIds: string[];
}

/**
 * Batch coordinator job result
 */
export interface BatchCoordinatorJobResult {
  success: boolean;
  batchId: string;
  totalCreators: number;
  completedCreators: number;
  failedCreators: number;
  error?: string;
}

/**
 * Job progress update
 */
export interface JobProgress {
  /** Current stage */
  stage: 'queued' | 'pre-screening' | 'indexing' | 'analyzing' | 'complete' | 'failed';
  /** Progress percentage (0-100) */
  percentage: number;
  /** Status message */
  message?: string;
  /** Estimated time remaining in ms */
  etaMs?: number;
}

/**
 * Default job options for each queue
 */
export const DEFAULT_JOB_OPTIONS = {
  [QUEUE_NAMES.VIDEO_ANALYSIS]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: { age: 3600 }, // 1 hour
    removeOnFail: { age: 86400 }, // 24 hours
  },
  [QUEUE_NAMES.IMAGE_ANALYSIS]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
  [QUEUE_NAMES.SCRAPER]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
  [QUEUE_NAMES.BATCH_COORDINATOR]: {
    attempts: 1,
    removeOnComplete: { age: 7200 }, // 2 hours
    removeOnFail: { age: 86400 },
  },
};

/**
 * Queue concurrency settings
 */
export const QUEUE_CONCURRENCY = {
  [QUEUE_NAMES.VIDEO_ANALYSIS]: 10,
  [QUEUE_NAMES.IMAGE_ANALYSIS]: 20,
  [QUEUE_NAMES.SCRAPER]: 5,
  [QUEUE_NAMES.BATCH_COORDINATOR]: 3,
};

/**
 * Rate limiting settings (jobs per second)
 */
export const QUEUE_RATE_LIMITS = {
  [QUEUE_NAMES.VIDEO_ANALYSIS]: { max: 10, duration: 1000 },
  [QUEUE_NAMES.IMAGE_ANALYSIS]: { max: 20, duration: 1000 },
  [QUEUE_NAMES.SCRAPER]: { max: 5, duration: 1000 },
  [QUEUE_NAMES.BATCH_COORDINATOR]: { max: 3, duration: 1000 },
};
