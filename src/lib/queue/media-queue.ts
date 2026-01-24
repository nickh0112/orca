/**
 * BullMQ Media Queue System
 *
 * Provides distributed queue management for media analysis:
 * - Video analysis queue
 * - Image analysis queue
 * - Scraper queue
 * - Batch coordinator queue
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Rate limiting to avoid API overload
 * - Progress tracking via Redis
 * - Job prioritization
 */

import { Queue, QueueEvents, Job, type ConnectionOptions } from 'bullmq';
import {
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  QUEUE_RATE_LIMITS,
  type QueueName,
  type VideoAnalysisJobData,
  type ImageAnalysisJobData,
  type ScraperJobData,
  type BatchCoordinatorJobData,
  type JobProgress,
} from './job-types';
import { getRedisConnectionOptions, isRedisConfigured } from './redis-client';

// Queue instances (lazily initialized)
const queues = new Map<QueueName, Queue>();
const queueEvents = new Map<QueueName, QueueEvents>();

/**
 * Check if the distributed queue system is available
 */
export function isDistributedQueueAvailable(): boolean {
  return isRedisConfigured();
}

/**
 * Get or create a queue instance
 */
export function getQueue<T>(name: QueueName): Queue<T> {
  if (!isRedisConfigured()) {
    throw new Error('Redis is not configured. Set REDIS_URL or REDIS_HOST environment variable.');
  }

  let queue = queues.get(name);
  if (!queue) {
    const connection = getRedisConnectionOptions();

    queue = new Queue(name, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS[name],
    });

    queues.set(name, queue);
    console.log(`[Queue] Created queue: ${name}`);
  }

  return queue as Queue<T>;
}

/**
 * Get or create queue events listener
 */
export function getQueueEvents(name: QueueName): QueueEvents {
  let events = queueEvents.get(name);
  if (!events) {
    const connection = getRedisConnectionOptions();
    events = new QueueEvents(name, {
      connection,
    });
    queueEvents.set(name, events);
    console.log(`[Queue] Created queue events listener: ${name}`);
  }
  return events;
}

/**
 * Add a video analysis job to the queue
 */
export async function addVideoAnalysisJob(
  data: VideoAnalysisJobData,
  options?: { priority?: number; delay?: number }
): Promise<Job<VideoAnalysisJobData>> {
  const queue = getQueue<VideoAnalysisJobData>(QUEUE_NAMES.VIDEO_ANALYSIS);
  const job = await queue.add('analyze-video', data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: data.jobId,
  });
  console.log(`[Queue] Added video analysis job: ${data.jobId} for post ${data.postId}`);
  return job;
}

/**
 * Add multiple video analysis jobs in bulk
 */
export async function addVideoAnalysisJobs(
  jobs: Array<{ data: VideoAnalysisJobData; priority?: number }>
): Promise<Job<VideoAnalysisJobData>[]> {
  const queue = getQueue<VideoAnalysisJobData>(QUEUE_NAMES.VIDEO_ANALYSIS);
  const bulkJobs = jobs.map(({ data, priority }) => ({
    name: 'analyze-video',
    data,
    opts: { priority, jobId: data.jobId },
  }));

  const addedJobs = await queue.addBulk(bulkJobs);
  console.log(`[Queue] Added ${addedJobs.length} video analysis jobs in bulk`);
  return addedJobs;
}

/**
 * Add an image analysis job to the queue
 */
export async function addImageAnalysisJob(
  data: ImageAnalysisJobData,
  options?: { priority?: number; delay?: number }
): Promise<Job<ImageAnalysisJobData>> {
  const queue = getQueue<ImageAnalysisJobData>(QUEUE_NAMES.IMAGE_ANALYSIS);
  const job = await queue.add('analyze-image', data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: data.jobId,
  });
  console.log(`[Queue] Added image analysis job: ${data.jobId} for post ${data.postId}`);
  return job;
}

/**
 * Add a scraper job to the queue
 */
export async function addScraperJob(
  data: ScraperJobData,
  options?: { priority?: number; delay?: number }
): Promise<Job<ScraperJobData>> {
  const queue = getQueue<ScraperJobData>(QUEUE_NAMES.SCRAPER);
  const job = await queue.add('scrape', data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: data.jobId,
  });
  console.log(`[Queue] Added scraper job: ${data.jobId} for ${data.platform}/@${data.handle}`);
  return job;
}

/**
 * Add multiple scraper jobs in bulk
 */
export async function addScraperJobs(
  jobs: Array<{ data: ScraperJobData; priority?: number }>
): Promise<Job<ScraperJobData>[]> {
  const queue = getQueue<ScraperJobData>(QUEUE_NAMES.SCRAPER);
  const bulkJobs = jobs.map(({ data, priority }) => ({
    name: 'scrape',
    data,
    opts: { priority, jobId: data.jobId },
  }));

  const addedJobs = await queue.addBulk(bulkJobs);
  console.log(`[Queue] Added ${addedJobs.length} scraper jobs in bulk`);
  return addedJobs;
}

/**
 * Add a batch coordinator job
 */
export async function addBatchCoordinatorJob(
  data: BatchCoordinatorJobData
): Promise<Job<BatchCoordinatorJobData>> {
  const queue = getQueue<BatchCoordinatorJobData>(QUEUE_NAMES.BATCH_COORDINATOR);
  const job = await queue.add('coordinate', data, {
    jobId: `batch-${data.batchId}`,
  });
  console.log(`[Queue] Added batch coordinator job for batch ${data.batchId}`);
  return job;
}

/**
 * Get job by ID from a specific queue
 */
export async function getJob<T>(
  queueName: QueueName,
  jobId: string
): Promise<Job<T> | undefined> {
  const queue = getQueue<T>(queueName);
  return queue.getJob(jobId);
}

/**
 * Get queue statistics
 */
export async function getQueueStats(
  queueName: QueueName
): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Get all queue statistics
 */
export async function getAllQueueStats(): Promise<
  Record<QueueName, Awaited<ReturnType<typeof getQueueStats>>>
> {
  const stats: Record<string, Awaited<ReturnType<typeof getQueueStats>>> = {};

  for (const name of Object.values(QUEUE_NAMES)) {
    try {
      stats[name] = await getQueueStats(name);
    } catch (error) {
      console.error(`[Queue] Failed to get stats for ${name}:`, error);
      stats[name] = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }

  return stats as Record<QueueName, Awaited<ReturnType<typeof getQueueStats>>>;
}

/**
 * Pause a queue
 */
export async function pauseQueue(queueName: QueueName): Promise<void> {
  const queue = getQueue(queueName);
  await queue.pause();
  console.log(`[Queue] Paused queue: ${queueName}`);
}

/**
 * Resume a queue
 */
export async function resumeQueue(queueName: QueueName): Promise<void> {
  const queue = getQueue(queueName);
  await queue.resume();
  console.log(`[Queue] Resumed queue: ${queueName}`);
}

/**
 * Clear all jobs from a queue
 */
export async function clearQueue(queueName: QueueName): Promise<void> {
  const queue = getQueue(queueName);
  await queue.obliterate({ force: true });
  console.log(`[Queue] Cleared queue: ${queueName}`);
}

/**
 * Close all queues and connections
 */
export async function closeAllQueues(): Promise<void> {
  console.log('[Queue] Closing all queues...');

  for (const [name, queue] of queues) {
    await queue.close();
    console.log(`[Queue] Closed queue: ${name}`);
  }

  for (const [name, events] of queueEvents) {
    await events.close();
    console.log(`[Queue] Closed queue events: ${name}`);
  }

  queues.clear();
  queueEvents.clear();
}

/**
 * Subscribe to job completion events
 */
export function onJobCompleted<T>(
  queueName: QueueName,
  callback: (jobId: string, result: T) => void
): () => void {
  const events = getQueueEvents(queueName);

  const handler = ({ jobId, returnvalue }: { jobId: string; returnvalue: string }) => {
    try {
      const result = JSON.parse(returnvalue) as T;
      callback(jobId, result);
    } catch (error) {
      console.error(`[Queue] Failed to parse job result for ${jobId}:`, error);
    }
  };

  events.on('completed', handler);

  return () => {
    events.off('completed', handler);
  };
}

/**
 * Subscribe to job failure events
 */
export function onJobFailed(
  queueName: QueueName,
  callback: (jobId: string, failedReason: string) => void
): () => void {
  const events = getQueueEvents(queueName);

  const handler = ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
    callback(jobId, failedReason);
  };

  events.on('failed', handler);

  return () => {
    events.off('failed', handler);
  };
}

/**
 * Subscribe to job progress events
 */
export function onJobProgress(
  queueName: QueueName,
  callback: (jobId: string, progress: JobProgress) => void
): () => void {
  const events = getQueueEvents(queueName);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler = (args: { jobId: string; data: any }) => {
    callback(args.jobId, args.data as JobProgress);
  };

  events.on('progress', handler);

  return () => {
    events.off('progress', handler);
  };
}
