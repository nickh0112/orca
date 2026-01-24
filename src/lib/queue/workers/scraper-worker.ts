/**
 * Scraper Worker
 *
 * Processes scraping jobs from the BullMQ queue.
 * Uses Apify for TikTok and Instagram scraping.
 *
 * Features:
 * - Parallel scraping with rate limiting
 * - Progress reporting
 * - Graceful error handling
 */

import { Worker, Job } from 'bullmq';
import {
  QUEUE_NAMES,
  QUEUE_CONCURRENCY,
  type ScraperJobData,
  type ScraperJobResult,
  type JobProgress,
} from '../job-types';
import { getRedisConnectionOptions } from '../redis-client';
import {
  isApifyConfigured,
  fetchTikTokViaApify,
  fetchInstagramViaApify,
} from '@/lib/social-media/apify';

/**
 * Process a single scraper job
 */
async function processScraperJob(job: Job<ScraperJobData>): Promise<ScraperJobResult> {
  const startTime = Date.now();
  const data = job.data;

  console.log(`[ScraperWorker] Processing job ${data.jobId} for ${data.platform}/@${data.handle}`);

  try {
    // Check if Apify is configured
    if (!isApifyConfigured()) {
      return {
        success: false,
        creatorId: data.creatorId,
        platform: data.platform,
        handle: data.handle,
        error: 'Apify not configured',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Update progress: scraping
    await updateProgress(job, {
      stage: 'analyzing',
      percentage: 20,
      message: `Fetching ${data.platform} content for @${data.handle}...`,
    });

    // Fetch content based on platform
    let content;
    if (data.platform === 'tiktok') {
      content = await fetchTikTokViaApify(data.handle, data.monthsBack);
    } else if (data.platform === 'instagram') {
      content = await fetchInstagramViaApify(data.handle, data.monthsBack);
    } else {
      throw new Error(`Unsupported platform: ${data.platform}`);
    }

    if (!content) {
      return {
        success: false,
        creatorId: data.creatorId,
        platform: data.platform,
        handle: data.handle,
        error: 'Failed to fetch content',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Update progress: complete
    await updateProgress(job, {
      stage: 'complete',
      percentage: 100,
      message: `Fetched ${content.posts.length} posts`,
    });

    const processingTimeMs = Date.now() - startTime;
    console.log(
      `[ScraperWorker] Completed job ${data.jobId}: ${content.posts.length} posts in ${processingTimeMs}ms`
    );

    return {
      success: true,
      creatorId: data.creatorId,
      platform: data.platform,
      handle: data.handle,
      postCount: content.posts.length,
      postsData: JSON.stringify(content.posts),
      processingTimeMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ScraperWorker] Job ${data.jobId} failed:`, errorMessage);

    await updateProgress(job, {
      stage: 'failed',
      percentage: 0,
      message: errorMessage,
    });

    return {
      success: false,
      creatorId: data.creatorId,
      platform: data.platform,
      handle: data.handle,
      error: errorMessage,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Update job progress
 */
async function updateProgress(job: Job<ScraperJobData>, progress: JobProgress): Promise<void> {
  await job.updateProgress(progress);
}

/**
 * Create and start the scraper worker
 */
export function createScraperWorker(): Worker<ScraperJobData, ScraperJobResult> {
  const connection = getRedisConnectionOptions();

  const worker = new Worker<ScraperJobData, ScraperJobResult>(
    QUEUE_NAMES.SCRAPER,
    processScraperJob,
    {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.SCRAPER],
      limiter: {
        max: 5,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job: Job<ScraperJobData>, result: ScraperJobResult) => {
    console.log(
      `[ScraperWorker] Job ${job.id} completed: ` +
        `${result.success ? `${result.postCount} posts` : 'failed'}`
    );
  });

  worker.on('failed', (job: Job<ScraperJobData> | undefined, err: Error) => {
    console.error(`[ScraperWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err: Error) => {
    console.error('[ScraperWorker] Worker error:', err);
  });

  console.log('[ScraperWorker] Worker started');
  return worker;
}

/**
 * Singleton worker instance
 */
let workerInstance: Worker<ScraperJobData, ScraperJobResult> | null = null;

/**
 * Get or create the scraper worker
 */
export function getScraperWorker(): Worker<ScraperJobData, ScraperJobResult> {
  if (!workerInstance) {
    workerInstance = createScraperWorker();
  }
  return workerInstance;
}

/**
 * Stop the scraper worker
 */
export async function stopScraperWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
    console.log('[ScraperWorker] Worker stopped');
  }
}
