/**
 * Queue Analysis Jobs Script
 *
 * Queues ad format analysis jobs for all videos in the Twelve Labs index.
 * Run with: npm run batch:analyze
 *
 * Features:
 * - Fetches all videos from Twelve Labs index
 * - Skips already-analyzed videos (checks existing jobs)
 * - Queues jobs in bulk for efficient processing
 * - Saves video mapping to data/video-mapping.json
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  addAdFormatAnalysisJobs,
  isDistributedQueueAvailable,
  getQueueStats,
  QUEUE_NAMES,
} from '../src/lib/queue';
import type { AdFormatAnalysisJobData } from '../src/lib/queue/job-types';

const TWELVE_LABS_API_BASE = 'https://api.twelvelabs.io/v1.3';
const INDEX_NAME = 'orca-brand-safety';
const VIDEO_MAPPING_PATH = path.join(process.cwd(), 'data', 'video-mapping.json');

interface VideoInfo {
  videoId: string;
  filename: string;
  duration: number;
  indexId: string;
  createdAt: string;
}

interface VideoMapping {
  indexId: string;
  indexName: string;
  lastUpdated: string;
  videos: VideoInfo[];
}

function getHeaders(): HeadersInit {
  return {
    'x-api-key': process.env.TWELVE_LABS_API_KEY || '',
    'Content-Type': 'application/json',
  };
}

/**
 * Find the index ID by name
 */
async function findIndexId(): Promise<string | null> {
  const response = await fetch(`${TWELVE_LABS_API_BASE}/indexes`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to list indexes: ${response.status}`);
  }

  const data = await response.json();
  const index = data.data?.find(
    (idx: { index_name: string }) => idx.index_name === INDEX_NAME
  );

  return index?._id || null;
}

/**
 * Fetch all videos from the index
 */
async function fetchAllVideos(indexId: string): Promise<VideoInfo[]> {
  const videos: VideoInfo[] = [];
  let page = 1;
  const pageSize = 50;

  console.log(`[Queue] Fetching videos from index ${indexId}...`);

  while (true) {
    const response = await fetch(
      `${TWELVE_LABS_API_BASE}/indexes/${indexId}/videos?page=${page}&page_limit=${pageSize}`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch videos: ${response.status}`);
    }

    const data = await response.json();
    const pageVideos = data.data || [];

    for (const video of pageVideos) {
      videos.push({
        videoId: video._id,
        filename: video.system_metadata?.filename || video.metadata?.filename || `video_${video._id}`,
        duration: video.system_metadata?.duration || video.metadata?.duration || 0,
        indexId,
        createdAt: video.created_at || new Date().toISOString(),
      });
    }

    console.log(`[Queue] Fetched page ${page}: ${pageVideos.length} videos`);

    // Check if there are more pages
    const totalPages = Math.ceil((data.page_info?.total_results || 0) / pageSize);
    if (page >= totalPages || pageVideos.length === 0) {
      break;
    }

    page++;
  }

  return videos;
}

/**
 * Load existing video mapping
 */
function loadVideoMapping(): VideoMapping | null {
  try {
    if (fs.existsSync(VIDEO_MAPPING_PATH)) {
      const data = fs.readFileSync(VIDEO_MAPPING_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('[Queue] Could not load existing video mapping:', error);
  }
  return null;
}

/**
 * Save video mapping
 */
function saveVideoMapping(mapping: VideoMapping): void {
  const dir = path.dirname(VIDEO_MAPPING_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(VIDEO_MAPPING_PATH, JSON.stringify(mapping, null, 2));
  console.log(`[Queue] Saved video mapping to ${VIDEO_MAPPING_PATH}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Queue Analysis Jobs');
  console.log('='.repeat(60));

  // Check environment
  if (!process.env.TWELVE_LABS_API_KEY) {
    console.error('\nError: TWELVE_LABS_API_KEY is not set');
    process.exit(1);
  }

  if (!isDistributedQueueAvailable()) {
    console.error('\nError: Redis is not configured.');
    console.error('Set REDIS_URL or REDIS_HOST environment variable.');
    process.exit(1);
  }

  console.log('\nEnvironment:');
  console.log(`  TWELVE_LABS_API_KEY: Set`);
  console.log(`  REDIS_URL: ${process.env.REDIS_URL ? 'Set' : 'Not set'}`);

  // Find the index
  console.log(`\nLooking for index: ${INDEX_NAME}...`);
  const indexId = await findIndexId();

  if (!indexId) {
    console.error(`\nError: Index "${INDEX_NAME}" not found.`);
    console.error('Make sure videos have been indexed first.');
    process.exit(1);
  }

  console.log(`Found index: ${indexId}`);

  // Fetch all videos from the index
  const videos = await fetchAllVideos(indexId);
  console.log(`\nTotal videos found: ${videos.length}`);

  if (videos.length === 0) {
    console.log('No videos to analyze. Index is empty.');
    process.exit(0);
  }

  // Save video mapping
  const mapping: VideoMapping = {
    indexId,
    indexName: INDEX_NAME,
    lastUpdated: new Date().toISOString(),
    videos,
  };
  saveVideoMapping(mapping);

  // Display videos
  console.log('\nVideos to analyze:');
  for (const video of videos) {
    console.log(`  - ${video.filename} (${video.duration.toFixed(1)}s) [${video.videoId}]`);
  }

  // Check current queue status
  const queueStats = await getQueueStats(QUEUE_NAMES.AD_FORMAT_ANALYSIS);
  console.log('\nCurrent queue status:');
  console.log(`  Waiting: ${queueStats.waiting}`);
  console.log(`  Active: ${queueStats.active}`);
  console.log(`  Completed: ${queueStats.completed}`);
  console.log(`  Failed: ${queueStats.failed}`);

  // Create job data for each video
  const jobs: Array<{ data: AdFormatAnalysisJobData }> = videos.map((video) => ({
    data: {
      jobId: `ad-format-${video.videoId}-${uuidv4().slice(0, 8)}`,
      filename: video.filename,
      videoId: video.videoId,
      indexId: video.indexId,
      duration: video.duration,
    },
  }));

  // Queue all jobs
  console.log(`\nQueuing ${jobs.length} analysis jobs...`);
  const addedJobs = await addAdFormatAnalysisJobs(jobs);
  console.log(`Successfully queued ${addedJobs.length} jobs.`);

  // Show new queue status
  const newStats = await getQueueStats(QUEUE_NAMES.AD_FORMAT_ANALYSIS);
  console.log('\nNew queue status:');
  console.log(`  Waiting: ${newStats.waiting}`);
  console.log(`  Active: ${newStats.active}`);
  console.log(`  Completed: ${newStats.completed}`);
  console.log(`  Failed: ${newStats.failed}`);

  console.log('\n' + '='.repeat(60));
  console.log('Jobs queued successfully!');
  console.log('Run "npm run workers" in another terminal to process the jobs.');
  console.log('='.repeat(60));

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
