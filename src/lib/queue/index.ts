/**
 * Distributed Queue Module
 *
 * Provides BullMQ-based distributed queue system for media analysis:
 * - Video analysis queue with Twelve Labs integration
 * - Image analysis queue with Claude Vision
 * - Scraper queue with Apify integration
 * - Redis-backed progress tracking
 *
 * Usage:
 * 1. Ensure REDIS_URL or REDIS_HOST environment variable is set
 * 2. Import queue functions: addVideoAnalysisJob, addScraperJob, etc.
 * 3. Start workers in a separate process: startAllWorkers()
 * 4. Track progress with BatchProgressTracker
 */

// Redis client
export {
  getRedisConnection,
  getRedisConnectionOptions,
  closeRedisConnection,
  checkRedisHealth,
  isRedisConfigured,
} from './redis-client';

// Job types
export {
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  QUEUE_CONCURRENCY,
  QUEUE_RATE_LIMITS,
  type QueueName,
  type VideoAnalysisJobData,
  type VideoAnalysisJobResult,
  type ImageAnalysisJobData,
  type ImageAnalysisJobResult,
  type ScraperJobData,
  type ScraperJobResult,
  type BatchCoordinatorJobData,
  type BatchCoordinatorJobResult,
  type AdFormatAnalysisJobData,
  type AdFormatAnalysisJobResult,
  type AdFormatAnalysis,
  type SceneAnalysis,
  type HookAnalysis,
  type CTAAnalysis,
  type PacingAnalysis,
  type ProductMention,
  type JobProgress,
} from './job-types';

// Queue management
export {
  isDistributedQueueAvailable,
  getQueue,
  getQueueEvents,
  addVideoAnalysisJob,
  addVideoAnalysisJobs,
  addImageAnalysisJob,
  addScraperJob,
  addScraperJobs,
  addBatchCoordinatorJob,
  addAdFormatAnalysisJob,
  addAdFormatAnalysisJobs,
  getJob,
  getQueueStats,
  getAllQueueStats,
  pauseQueue,
  resumeQueue,
  clearQueue,
  closeAllQueues,
  onJobCompleted,
  onJobFailed,
  onJobProgress,
} from './media-queue';

// Progress tracking
export {
  BatchProgressTracker,
  subscribeToBatchProgress,
  type ProgressEntry,
  type BatchProgress,
  type CreatorProgress,
} from './progress-tracker';

// Workers (import separately to avoid loading in main app)
// Use: import { getVideoWorker } from '@/lib/queue/workers/video-worker'
// Use: import { getScraperWorker } from '@/lib/queue/workers/scraper-worker'
// Use: import { getAdFormatWorker } from '@/lib/queue/workers/ad-format-worker'

/**
 * Start all workers for processing queue jobs
 * Call this in a separate worker process
 */
export async function startAllWorkers(): Promise<void> {
  const { getVideoWorker } = await import('./workers/video-worker');
  const { getScraperWorker } = await import('./workers/scraper-worker');
  const { getAdFormatWorker } = await import('./workers/ad-format-worker');

  getVideoWorker();
  getScraperWorker();
  getAdFormatWorker();

  console.log('[Queue] All workers started');
}

/**
 * Stop all workers gracefully
 */
export async function stopAllWorkers(): Promise<void> {
  const { stopVideoWorker } = await import('./workers/video-worker');
  const { stopScraperWorker } = await import('./workers/scraper-worker');
  const { stopAdFormatWorker } = await import('./workers/ad-format-worker');

  await Promise.all([stopVideoWorker(), stopScraperWorker(), stopAdFormatWorker()]);

  console.log('[Queue] All workers stopped');
}
