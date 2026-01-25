/**
 * Media Analysis Queue System
 *
 * Provides high-throughput batch processing for videos and images:
 * - Separate queues for videos (Twelve Labs) and images (Claude Vision)
 * - Configurable concurrency limits per media type
 * - Retry logic with exponential backoff
 * - Progress tracking and callbacks
 * - Rate limiting to avoid API overload
 *
 * Designed to handle 100+ items simultaneously.
 */

import PQueue from 'p-queue';
import {
  MediaItem,
  MediaAnalysisResult,
  MediaQueueOptions,
  ProgressCallback,
  VisualAnalysis,
} from '@/types/video-analysis';
import { analyzeVideoWithOptions, isTwelveLabsConfigured } from './twelve-labs';
import { analyzeImage, isClaudeVisionConfigured } from './image-analysis';

// Default configuration - optimized for production throughput
const DEFAULTS = {
  VIDEO_CONCURRENCY: 10,   // Increased from 5 for faster batch processing
  IMAGE_CONCURRENCY: 20,   // Increased from 10 for faster batch processing
  RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  VIDEO_INTERVAL_MS: 500,  // Reduced from 1000ms - 2 videos per second max
  IMAGE_INTERVAL_MS: 50,   // Reduced from 100ms - 20 images per second max
};

interface QueueStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
}

/**
 * Media Analysis Queue for batch processing
 */
export class MediaAnalysisQueue {
  private videoQueue: PQueue;
  private imageQueue: PQueue;
  private stats: QueueStats;
  private onProgress?: ProgressCallback;
  private retries: number;
  private retryDelayMs: number;

  constructor(options?: MediaQueueOptions) {
    const {
      videoConcurrency = DEFAULTS.VIDEO_CONCURRENCY,
      imageConcurrency = DEFAULTS.IMAGE_CONCURRENCY,
      retries = DEFAULTS.RETRIES,
      retryDelayMs = DEFAULTS.RETRY_DELAY_MS,
      onProgress,
    } = options || {};

    // Create video queue with concurrency and rate limiting
    this.videoQueue = new PQueue({
      concurrency: videoConcurrency,
      interval: DEFAULTS.VIDEO_INTERVAL_MS,
      intervalCap: videoConcurrency,
    });

    // Create image queue with higher concurrency
    this.imageQueue = new PQueue({
      concurrency: imageConcurrency,
      interval: DEFAULTS.IMAGE_INTERVAL_MS,
      intervalCap: imageConcurrency,
    });

    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0,
    };

    this.onProgress = onProgress;
    this.retries = retries;
    this.retryDelayMs = retryDelayMs;
  }

  /**
   * Process all media items and return results
   */
  async processAll(
    media: MediaItem[]
  ): Promise<Map<string, MediaAnalysisResult | null>> {
    const results = new Map<string, MediaAnalysisResult | null>();

    if (media.length === 0) {
      return results;
    }

    // Separate by type
    const videos = media.filter((m) => m.type === 'video');
    const images = media.filter((m) => m.type === 'image');

    this.stats = {
      total: media.length,
      completed: 0,
      failed: 0,
      pending: media.length,
    };

    console.log(
      `[MediaQueue] Processing ${media.length} items: ${videos.length} videos, ${images.length} images`
    );

    // Check API configurations
    const twelveLabsAvailable = isTwelveLabsConfigured();
    const claudeVisionAvailable = isClaudeVisionConfigured();

    if (videos.length > 0 && !twelveLabsAvailable) {
      console.warn('[MediaQueue] Twelve Labs not configured, videos will be skipped');
    }

    if (images.length > 0 && !claudeVisionAvailable) {
      console.warn('[MediaQueue] Claude Vision not configured, images will be skipped');
    }

    // Create promises for all items
    const promises: Promise<void>[] = [];

    // Add video tasks
    if (twelveLabsAvailable) {
      for (const video of videos) {
        const promise = this.videoQueue.add(async () => {
          const result = await this.processVideoWithRetry(video);
          results.set(video.id, result);
        });
        promises.push(promise as Promise<void>);
      }
    } else {
      // Mark videos as failed if Twelve Labs not available
      for (const video of videos) {
        results.set(video.id, null);
        this.updateStats(false);
      }
    }

    // Add image tasks
    if (claudeVisionAvailable) {
      for (const image of images) {
        const promise = this.imageQueue.add(async () => {
          const result = await this.processImageWithRetry(image);
          results.set(image.id, result);
        });
        promises.push(promise as Promise<void>);
      }
    } else {
      // Mark images as failed if Claude Vision not available
      for (const image of images) {
        results.set(image.id, null);
        this.updateStats(false);
      }
    }

    // Wait for all tasks to complete
    await Promise.all(promises);

    console.log(
      `[MediaQueue] Complete: ${this.stats.completed}/${this.stats.total} ` +
        `(${this.stats.failed} failed)`
    );

    return results;
  }

  /**
   * Process a video with retry logic
   */
  private async processVideoWithRetry(
    video: MediaItem
  ): Promise<MediaAnalysisResult | null> {
    let lastError: Error | null = null;

    // Debug logging for video processing
    console.log(`[MediaQueue] Processing video ${video.id}:`);
    console.log(`  URL: ${video.url.slice(0, 60)}...`);
    console.log(`  Buffer: ${video.buffer ? `${(video.buffer.length / 1024).toFixed(0)}KB` : 'not provided'}`);
    console.log(`  ContentType: ${video.contentType || 'default (video/mp4)'}`);

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const result = await analyzeVideoWithOptions(
          video.url,
          video.buffer,
          {
            skipLogoDetection: false,
            skipClassification: false,
          },
          video.contentType || 'video/mp4'
        );

        if (result) {
          this.updateStats(true);
          return {
            type: 'video',
            visualAnalysis: result.visualAnalysis,
            transcript: result.transcript,
            indexInfo: result.indexInfo,
            logoDetections: result.logoDetections,
            contentClassification: result.contentClassification,
          };
        }

        // Result was null but no error - likely indexing failed
        this.updateStats(false);
        return null;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retries && this.isRetryableError(lastError)) {
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          console.log(
            `[MediaQueue] Video ${video.id} retry ${attempt + 1}/${this.retries} after ${delay}ms`
          );
          await this.sleep(delay);
        }
      }
    }

    console.error(
      `[MediaQueue] Video ${video.id} failed after ${this.retries + 1} attempts:`,
      lastError?.message
    );
    this.updateStats(false);
    return null;
  }

  /**
   * Process an image with retry logic
   */
  private async processImageWithRetry(
    image: MediaItem
  ): Promise<MediaAnalysisResult | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const visualAnalysis = await analyzeImage(image.url, image.buffer);

        // Check if we got a valid result (not the default error response)
        if (visualAnalysis.description !== 'Unable to analyze visual content') {
          this.updateStats(true);
          return {
            type: 'image',
            visualAnalysis,
          };
        }

        // Got default response, might be retriable
        throw new Error('Analysis returned default response');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retries && this.isRetryableError(lastError)) {
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          console.log(
            `[MediaQueue] Image ${image.id} retry ${attempt + 1}/${this.retries} after ${delay}ms`
          );
          await this.sleep(delay);
        }
      }
    }

    console.error(
      `[MediaQueue] Image ${image.id} failed after ${this.retries + 1} attempts:`,
      lastError?.message
    );
    this.updateStats(false);
    return null;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('429') ||
      message.includes('529') ||
      message.includes('rate limit') ||
      message.includes('overloaded') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('socket hang up')
    );
  }

  /**
   * Update stats and fire progress callback
   */
  private updateStats(success: boolean): void {
    this.stats.completed++;
    this.stats.pending--;
    if (!success) {
      this.stats.failed++;
    }

    if (this.onProgress) {
      this.onProgress(
        this.stats.completed,
        this.stats.total,
        this.stats.failed
      );
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queue statistics
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Get video queue size
   */
  get videoQueueSize(): number {
    return this.videoQueue.size + this.videoQueue.pending;
  }

  /**
   * Get image queue size
   */
  get imageQueueSize(): number {
    return this.imageQueue.size + this.imageQueue.pending;
  }

  /**
   * Pause all queues
   */
  pause(): void {
    this.videoQueue.pause();
    this.imageQueue.pause();
  }

  /**
   * Resume all queues
   */
  start(): void {
    this.videoQueue.start();
    this.imageQueue.start();
  }

  /**
   * Clear all queues
   */
  clear(): void {
    this.videoQueue.clear();
    this.imageQueue.clear();
  }
}

/**
 * Create a new media analysis queue
 */
export function createMediaQueue(options?: MediaQueueOptions): MediaAnalysisQueue {
  return new MediaAnalysisQueue(options);
}

/**
 * Process media items using the queue system
 * Convenience function for one-off batch processing
 */
export async function processMediaBatch(
  media: MediaItem[],
  options?: MediaQueueOptions
): Promise<Map<string, MediaAnalysisResult | null>> {
  const queue = new MediaAnalysisQueue(options);
  return queue.processAll(media);
}
