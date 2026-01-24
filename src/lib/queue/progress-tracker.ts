/**
 * Redis-Backed Progress Tracker
 *
 * Provides reliable progress tracking for batch processing across
 * distributed workers. Uses Redis for persistence and real-time updates.
 *
 * Features:
 * - Batch-level progress aggregation
 * - Creator-level tracking
 * - Platform-level status
 * - Real-time progress subscription via pub/sub
 */

import { getRedisConnection, isRedisConfigured } from './redis-client';

/**
 * Progress entry for a single item (creator, video, etc.)
 */
export interface ProgressEntry {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Batch progress summary
 */
export interface BatchProgress {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalCreators: number;
  pendingCreators: number;
  processingCreators: number;
  completedCreators: number;
  failedCreators: number;
  totalVideos: number;
  completedVideos: number;
  failedVideos: number;
  startedAt?: string;
  completedAt?: string;
  estimatedTimeRemainingMs?: number;
}

/**
 * Creator progress with platform breakdown
 */
export interface CreatorProgress {
  creatorId: string;
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  platforms: {
    instagram?: ProgressEntry;
    tiktok?: ProgressEntry;
    youtube?: ProgressEntry;
    web?: ProgressEntry;
  };
  videoProgress: {
    total: number;
    completed: number;
    failed: number;
  };
  startedAt?: string;
  completedAt?: string;
}

// Redis key prefixes
const KEYS = {
  BATCH: 'batch:progress:',
  CREATOR: 'creator:progress:',
  VIDEO: 'video:progress:',
  CHANNEL: 'progress:updates:',
};

/**
 * Batch Progress Tracker
 */
export class BatchProgressTracker {
  private batchId: string;

  constructor(batchId: string) {
    this.batchId = batchId;
  }

  /**
   * Initialize batch progress
   */
  async initialize(creatorIds: string[]): Promise<void> {
    if (!isRedisConfigured()) {
      console.warn('[ProgressTracker] Redis not configured, progress will not be persisted');
      return;
    }

    const redis = await getRedisConnection();
    const now = new Date().toISOString();

    const progress: BatchProgress = {
      batchId: this.batchId,
      status: 'processing',
      totalCreators: creatorIds.length,
      pendingCreators: creatorIds.length,
      processingCreators: 0,
      completedCreators: 0,
      failedCreators: 0,
      totalVideos: 0,
      completedVideos: 0,
      failedVideos: 0,
      startedAt: now,
    };

    await redis.set(`${KEYS.BATCH}${this.batchId}`, JSON.stringify(progress));

    // Initialize creator progress entries
    const pipeline = redis.pipeline();
    for (const creatorId of creatorIds) {
      const creatorProgress: CreatorProgress = {
        creatorId,
        batchId: this.batchId,
        status: 'pending',
        platforms: {},
        videoProgress: { total: 0, completed: 0, failed: 0 },
      };
      pipeline.set(`${KEYS.CREATOR}${creatorId}`, JSON.stringify(creatorProgress));
    }
    await pipeline.exec();

    console.log(`[ProgressTracker] Initialized batch ${this.batchId} with ${creatorIds.length} creators`);
  }

  /**
   * Update creator status
   */
  async updateCreatorStatus(
    creatorId: string,
    status: 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    if (!isRedisConfigured()) return;

    const redis = await getRedisConnection();
    const key = `${KEYS.CREATOR}${creatorId}`;
    const now = new Date().toISOString();

    const existing = await redis.get(key);
    const progress: CreatorProgress = existing
      ? JSON.parse(existing)
      : {
          creatorId,
          batchId: this.batchId,
          status: 'pending',
          platforms: {},
          videoProgress: { total: 0, completed: 0, failed: 0 },
        };

    const previousStatus = progress.status;
    progress.status = status;

    if (status === 'processing' && !progress.startedAt) {
      progress.startedAt = now;
    }

    if (status === 'completed' || status === 'failed') {
      progress.completedAt = now;
    }

    await redis.set(key, JSON.stringify(progress));

    // Update batch counters
    await this.updateBatchCounters(previousStatus, status);

    // Publish update
    await this.publishUpdate('creator', { creatorId, status, error });
  }

  /**
   * Update platform status for a creator
   */
  async updatePlatformStatus(
    creatorId: string,
    platform: 'instagram' | 'tiktok' | 'youtube' | 'web',
    status: 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    if (!isRedisConfigured()) return;

    const redis = await getRedisConnection();
    const key = `${KEYS.CREATOR}${creatorId}`;
    const now = new Date().toISOString();

    const existing = await redis.get(key);
    if (!existing) return;

    const progress: CreatorProgress = JSON.parse(existing);

    progress.platforms[platform] = {
      id: platform,
      status,
      ...(status === 'processing' && { startedAt: now }),
      ...(status === 'completed' || status === 'failed' ? { completedAt: now } : {}),
      ...(error && { error }),
    };

    await redis.set(key, JSON.stringify(progress));

    // Publish update
    await this.publishUpdate('platform', { creatorId, platform, status, error });
  }

  /**
   * Update video progress for a creator
   */
  async updateVideoProgress(
    creatorId: string,
    delta: { total?: number; completed?: number; failed?: number }
  ): Promise<void> {
    if (!isRedisConfigured()) return;

    const redis = await getRedisConnection();
    const key = `${KEYS.CREATOR}${creatorId}`;

    const existing = await redis.get(key);
    if (!existing) return;

    const progress: CreatorProgress = JSON.parse(existing);

    if (delta.total) progress.videoProgress.total += delta.total;
    if (delta.completed) progress.videoProgress.completed += delta.completed;
    if (delta.failed) progress.videoProgress.failed += delta.failed;

    await redis.set(key, JSON.stringify(progress));

    // Update batch video counters
    const batchKey = `${KEYS.BATCH}${this.batchId}`;
    const batchData = await redis.get(batchKey);
    if (batchData) {
      const batch: BatchProgress = JSON.parse(batchData);
      if (delta.total) batch.totalVideos += delta.total;
      if (delta.completed) batch.completedVideos += delta.completed;
      if (delta.failed) batch.failedVideos += delta.failed;
      await redis.set(batchKey, JSON.stringify(batch));
    }

    // Publish update
    await this.publishUpdate('video', { creatorId, ...delta });
  }

  /**
   * Update batch counters when creator status changes
   */
  private async updateBatchCounters(
    previousStatus: string,
    newStatus: string
  ): Promise<void> {
    const redis = await getRedisConnection();
    const key = `${KEYS.BATCH}${this.batchId}`;

    const existing = await redis.get(key);
    if (!existing) return;

    const batch: BatchProgress = JSON.parse(existing);

    // Decrement previous counter
    if (previousStatus === 'pending') batch.pendingCreators--;
    if (previousStatus === 'processing') batch.processingCreators--;

    // Increment new counter
    if (newStatus === 'processing') batch.processingCreators++;
    if (newStatus === 'completed') batch.completedCreators++;
    if (newStatus === 'failed') batch.failedCreators++;

    // Check if batch is complete
    if (batch.completedCreators + batch.failedCreators === batch.totalCreators) {
      batch.status = batch.failedCreators > 0 ? 'completed' : 'completed';
      batch.completedAt = new Date().toISOString();
    }

    await redis.set(key, JSON.stringify(batch));
  }

  /**
   * Publish progress update via Redis pub/sub
   */
  private async publishUpdate(
    type: 'creator' | 'platform' | 'video' | 'batch',
    data: Record<string, unknown>
  ): Promise<void> {
    const redis = await getRedisConnection();
    const channel = `${KEYS.CHANNEL}${this.batchId}`;
    await redis.publish(channel, JSON.stringify({ type, ...data, timestamp: Date.now() }));
  }

  /**
   * Get current batch progress
   */
  async getProgress(): Promise<BatchProgress | null> {
    if (!isRedisConfigured()) return null;

    const redis = await getRedisConnection();
    const data = await redis.get(`${KEYS.BATCH}${this.batchId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get creator progress
   */
  async getCreatorProgress(creatorId: string): Promise<CreatorProgress | null> {
    if (!isRedisConfigured()) return null;

    const redis = await getRedisConnection();
    const data = await redis.get(`${KEYS.CREATOR}${creatorId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Mark batch as completed
   */
  async complete(): Promise<void> {
    if (!isRedisConfigured()) return;

    const redis = await getRedisConnection();
    const key = `${KEYS.BATCH}${this.batchId}`;

    const existing = await redis.get(key);
    if (!existing) return;

    const batch: BatchProgress = JSON.parse(existing);
    batch.status = 'completed';
    batch.completedAt = new Date().toISOString();

    await redis.set(key, JSON.stringify(batch));
    await this.publishUpdate('batch', { status: 'completed' });

    console.log(`[ProgressTracker] Batch ${this.batchId} completed`);
  }

  /**
   * Mark batch as failed
   */
  async fail(error: string): Promise<void> {
    if (!isRedisConfigured()) return;

    const redis = await getRedisConnection();
    const key = `${KEYS.BATCH}${this.batchId}`;

    const existing = await redis.get(key);
    if (!existing) return;

    const batch: BatchProgress = JSON.parse(existing);
    batch.status = 'failed';
    batch.completedAt = new Date().toISOString();

    await redis.set(key, JSON.stringify(batch));
    await this.publishUpdate('batch', { status: 'failed', error });

    console.log(`[ProgressTracker] Batch ${this.batchId} failed: ${error}`);
  }

  /**
   * Clean up progress data (call after batch is processed)
   */
  async cleanup(retainForMs: number = 3600000): Promise<void> {
    if (!isRedisConfigured()) return;

    const redis = await getRedisConnection();

    // Set expiry on batch key
    await redis.expire(`${KEYS.BATCH}${this.batchId}`, Math.floor(retainForMs / 1000));

    console.log(`[ProgressTracker] Set expiry on batch ${this.batchId} progress`);
  }
}

/**
 * Subscribe to batch progress updates
 */
export async function subscribeToBatchProgress(
  batchId: string,
  callback: (update: Record<string, unknown>) => void
): Promise<() => Promise<void>> {
  if (!isRedisConfigured()) {
    return async () => {};
  }

  const redis = await getRedisConnection();
  const subscriber = redis.duplicate();
  const channel = `${KEYS.CHANNEL}${batchId}`;

  await subscriber.subscribe(channel);

  subscriber.on('message', (_channel: string, message: string) => {
    try {
      const update = JSON.parse(message);
      callback(update);
    } catch (error) {
      console.error('[ProgressTracker] Failed to parse update:', error);
    }
  });

  return async () => {
    await subscriber.unsubscribe(channel);
    await subscriber.quit();
  };
}
