/**
 * Video Analysis Worker
 *
 * Processes video analysis jobs from the BullMQ queue.
 * Uses Twelve Labs for video understanding with optional thumbnail pre-screening.
 *
 * Features:
 * - Thumbnail pre-screening for cost optimization
 * - Tiered analysis (light/standard/full)
 * - Progress reporting
 * - Graceful error handling
 */

import { Worker, Job } from 'bullmq';
import {
  QUEUE_NAMES,
  QUEUE_CONCURRENCY,
  type VideoAnalysisJobData,
  type VideoAnalysisJobResult,
  type JobProgress,
} from '../job-types';
import { getRedisConnectionOptions } from '../redis-client';
import {
  analyzeVideoWithOptions,
  isTwelveLabsConfigured,
  type AnalysisTier,
} from '@/lib/video-analysis/twelve-labs';
import {
  preScreenThumbnail,
  getRecommendedTier,
  isPreScreeningConfigured,
} from '@/lib/video-analysis/thumbnail-prescreener';

/**
 * Process a single video analysis job
 */
async function processVideoAnalysisJob(
  job: Job<VideoAnalysisJobData>
): Promise<VideoAnalysisJobResult> {
  const startTime = Date.now();
  const data = job.data;

  console.log(`[VideoWorker] Processing job ${data.jobId} for post ${data.postId}`);

  try {
    // Check if Twelve Labs is configured
    if (!isTwelveLabsConfigured()) {
      return {
        success: false,
        postId: data.postId,
        creatorId: data.creatorId,
        error: 'Twelve Labs API not configured',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Update progress: pre-screening
    await updateProgress(job, {
      stage: 'pre-screening',
      percentage: 10,
      message: 'Pre-screening thumbnail...',
    });

    // Determine analysis tier
    let tier: AnalysisTier = data.tier || 'standard';
    let preScreenResult = data.preScreenResult;

    // Pre-screen thumbnail if available and not already done
    if (!preScreenResult && data.thumbnailUrl && isPreScreeningConfigured()) {
      preScreenResult = await preScreenThumbnail(data.thumbnailUrl);

      if (!preScreenResult.needsFullAnalysis) {
        console.log(`[VideoWorker] Pre-screen: skipping full analysis for ${data.postId} (reason: ${preScreenResult.reason})`);
        return {
          success: true,
          postId: data.postId,
          creatorId: data.creatorId,
          visualAnalysis: JSON.stringify({
            description: preScreenResult.thumbnailDescription || 'Pre-screened as safe content',
            brands: preScreenResult.detectedBrands?.map((b: string) => ({
              brand: b,
              confidence: 'low',
              context: 'Detected in thumbnail pre-screen',
            })) || [],
            actions: [],
            textInVideo: [],
            sceneContext: {
              setting: 'Unknown',
              mood: 'Unknown',
              contentType: 'Unknown',
              concerns: [],
            },
            brandSafetyRating: 'safe',
          }),
          processingTimeMs: Date.now() - startTime,
          tierUsed: 'light',
        };
      }

      // Use recommended tier based on pre-screening
      tier = getRecommendedTier(preScreenResult);
      console.log(`[VideoWorker] Pre-screen result: needs analysis, tier=${tier}`);
    }

    // Update progress: indexing
    await updateProgress(job, {
      stage: 'indexing',
      percentage: 30,
      message: 'Uploading video to Twelve Labs...',
    });

    // Prepare video buffer if provided
    let videoBuffer: Buffer | undefined;
    if (data.videoBufferBase64) {
      videoBuffer = Buffer.from(data.videoBufferBase64, 'base64');
    }

    // Update progress: analyzing
    await updateProgress(job, {
      stage: 'analyzing',
      percentage: 50,
      message: `Running ${tier} tier analysis...`,
    });

    // Run analysis
    const result = await analyzeVideoWithOptions(data.videoUrl, videoBuffer, { tier });

    if (!result) {
      return {
        success: false,
        postId: data.postId,
        creatorId: data.creatorId,
        error: 'Video analysis returned null result',
        processingTimeMs: Date.now() - startTime,
        tierUsed: tier,
      };
    }

    // Update progress: complete
    await updateProgress(job, {
      stage: 'complete',
      percentage: 100,
      message: 'Analysis complete',
    });

    const processingTimeMs = Date.now() - startTime;
    console.log(`[VideoWorker] Completed job ${data.jobId} in ${processingTimeMs}ms`);

    return {
      success: true,
      postId: data.postId,
      creatorId: data.creatorId,
      transcript: result.transcript?.text,
      visualAnalysis: JSON.stringify(result.visualAnalysis),
      logoDetections: result.logoDetections ? JSON.stringify(result.logoDetections) : undefined,
      contentClassification: result.contentClassification
        ? JSON.stringify(result.contentClassification)
        : undefined,
      processingTimeMs,
      tierUsed: tier,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[VideoWorker] Job ${data.jobId} failed:`, errorMessage);

    await updateProgress(job, {
      stage: 'failed',
      percentage: 0,
      message: errorMessage,
    });

    return {
      success: false,
      postId: data.postId,
      creatorId: data.creatorId,
      error: errorMessage,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Update job progress
 */
async function updateProgress(
  job: Job<VideoAnalysisJobData>,
  progress: JobProgress
): Promise<void> {
  await job.updateProgress(progress);
}

/**
 * Create and start the video analysis worker
 */
export function createVideoWorker(): Worker<VideoAnalysisJobData, VideoAnalysisJobResult> {
  const connection = getRedisConnectionOptions();

  const worker = new Worker<VideoAnalysisJobData, VideoAnalysisJobResult>(
    QUEUE_NAMES.VIDEO_ANALYSIS,
    processVideoAnalysisJob,
    {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.VIDEO_ANALYSIS],
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job: Job<VideoAnalysisJobData>, result: VideoAnalysisJobResult) => {
    console.log(`[VideoWorker] Job ${job.id} completed: ${result.success ? 'success' : 'failed'}`);
  });

  worker.on('failed', (job: Job<VideoAnalysisJobData> | undefined, err: Error) => {
    console.error(`[VideoWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err: Error) => {
    console.error('[VideoWorker] Worker error:', err);
  });

  console.log('[VideoWorker] Worker started');
  return worker;
}

/**
 * Singleton worker instance
 */
let workerInstance: Worker<VideoAnalysisJobData, VideoAnalysisJobResult> | null = null;

/**
 * Get or create the video worker
 */
export function getVideoWorker(): Worker<VideoAnalysisJobData, VideoAnalysisJobResult> {
  if (!workerInstance) {
    workerInstance = createVideoWorker();
  }
  return workerInstance;
}

/**
 * Stop the video worker
 */
export async function stopVideoWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
    console.log('[VideoWorker] Worker stopped');
  }
}
