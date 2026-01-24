#!/usr/bin/env npx tsx
/**
 * Test script for batch media analysis with a real TikTok creator
 *
 * Fetches videos from @alixearle via Apify with video download enabled,
 * then runs batch analysis through Twelve Labs.
 *
 * Usage:
 *   npx tsx scripts/test-creator-batch.ts
 *
 * Requires environment variables:
 *   - APIFY_API_KEY (for TikTok scraping)
 *   - TWELVE_LABS_API_KEY (for video analysis)
 */

import 'dotenv/config';
import {
  isApifyConfigured,
} from '../src/lib/social-media/apify';
import {
  analyzeAllMedia,
  isTwelveLabsConfigured,
  getAnalysisSummary,
  MediaType,
} from '../src/lib/video-analysis';

// Configuration
const CREATOR_HANDLE = 'alixearle';
const VIDEO_COUNT = 10;
const MONTHS_BACK = 6;

// Apify API configuration
const APIFY_API_BASE = 'https://api.apify.com/v2';
const TIKTOK_ACTOR = 'clockworks~tiktok-scraper';
const RUN_TIMEOUT_MS = 600000; // 10 minutes (videos take longer to download)
const POLL_INTERVAL_MS = 5000;

interface ApifyTikTokPostWithVideo {
  id: string;
  text: string;
  createTime: number;
  videoMeta: {
    duration: number;
    coverUrl: string;
    downloadUrl?: string;
    playUrl?: string;
  };
  webVideoUrl: string;
  // mediaUrls contains the video download URLs
  mediaUrls?: string[];
  // When shouldDownloadVideos=true, Apify may store the video here
  videoUrl?: string;
}

/**
 * Fetch TikTok videos with Apify's video download feature
 * Videos are stored in Apify's key-value store with stable URLs
 */
async function fetchTikTokWithVideos(
  handle: string,
  maxVideos: number
): Promise<{
  posts: ApifyTikTokPostWithVideo[];
  runId: string;
  error?: string;
}> {
  const headers = {
    Authorization: `Bearer ${process.env.APIFY_API_KEY}`,
    'Content-Type': 'application/json',
  };

  console.log(`[Apify] Starting TikTok scraper with video download for @${handle}...`);

  // Start the scraper with video download enabled
  const runResponse = await fetch(
    `${APIFY_API_BASE}/acts/${TIKTOK_ACTOR}/runs`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        profiles: [handle],
        resultsPerPage: maxVideos + 5, // Fetch a few extra in case some fail
        shouldDownloadVideos: true,  // This stores videos in Apify's KV store
        shouldDownloadCovers: false,
      }),
    }
  );

  if (!runResponse.ok) {
    const errorText = await runResponse.text();
    return { posts: [], runId: '', error: `Failed to start scraper: ${errorText}` };
  }

  const runData = await runResponse.json();
  const runId = runData.data?.id;

  if (!runId) {
    return { posts: [], runId: '', error: 'No run ID returned' };
  }

  console.log(`[Apify] Run started: ${runId}`);
  console.log(`[Apify] Waiting for video downloads (this may take a few minutes)...`);

  // Wait for completion
  const startTime = Date.now();
  while (Date.now() - startTime < RUN_TIMEOUT_MS) {
    const statusResponse = await fetch(`${APIFY_API_BASE}/actor-runs/${runId}`, {
      headers,
    });

    if (!statusResponse.ok) {
      return { posts: [], runId, error: `Failed to check status: ${statusResponse.status}` };
    }

    const statusData = await statusResponse.json();
    const status = statusData.data?.status;

    if (status === 'SUCCEEDED') {
      console.log(`[Apify] Scraping completed successfully`);
      break;
    }
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      return { posts: [], runId, error: `Run failed with status: ${status}` };
    }

    // Show progress
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    process.stdout.write(`\r[Apify] Still running... (${elapsed}s elapsed)    `);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  console.log(''); // New line after progress

  // Get results
  const resultsResponse = await fetch(
    `${APIFY_API_BASE}/actor-runs/${runId}/dataset/items`,
    { headers }
  );

  if (!resultsResponse.ok) {
    return { posts: [], runId, error: `Failed to get results: ${resultsResponse.status}` };
  }

  const posts = await resultsResponse.json() as ApifyTikTokPostWithVideo[];
  console.log(`[Apify] Got ${posts.length} posts`);

  return { posts, runId };
}

/**
 * Download video from Apify's stored URL or CDN URL
 */
async function downloadVideoBuffer(
  url: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Referer: 'https://www.tiktok.com/',
      },
    });

    if (!response.ok) {
      console.log(`  [Download] Failed: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const buffer = Buffer.from(await response.arrayBuffer());

    // Verify it's actually video data, not HTML
    if (buffer.length < 1000 || buffer.slice(0, 5).toString().includes('<HTML')) {
      console.log(`  [Download] Received HTML instead of video data`);
      return null;
    }

    return { buffer, contentType };
  } catch (error) {
    console.error('  [Download] Error:', error);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Batch Media Analysis Test: @' + CREATOR_HANDLE);
  console.log('='.repeat(60) + '\n');

  // Check configuration
  if (!isApifyConfigured()) {
    console.error('ERROR: APIFY_API_KEY is not configured in .env');
    process.exit(1);
  }

  if (!isTwelveLabsConfigured()) {
    console.error('ERROR: TWELVE_LABS_API_KEY is not configured in .env');
    process.exit(1);
  }

  console.log('API Configuration: OK\n');

  // Step 1: Fetch videos from creator via Apify WITH video download enabled
  console.log(`[Step 1] Fetching videos from @${CREATOR_HANDLE} (with video download)...`);
  const fetchStart = Date.now();

  const { posts, runId, error } = await fetchTikTokWithVideos(CREATOR_HANDLE, VIDEO_COUNT);

  if (error) {
    console.error(`ERROR: ${error}`);
    process.exit(1);
  }

  console.log(`  Fetched ${posts.length} posts in ${((Date.now() - fetchStart) / 1000).toFixed(1)}s\n`);

  // Step 2: Filter to videos - check multiple possible URL locations
  const videosWithUrl = posts.filter(p =>
    p.videoUrl ||
    (p.mediaUrls && p.mediaUrls.length > 0) ||
    p.videoMeta?.downloadUrl ||
    p.videoMeta?.playUrl
  );

  console.log(`[Step 2] Found ${videosWithUrl.length} videos`);
  console.log(`  - With Apify-stored URL: ${posts.filter(p => p.videoUrl).length}`);
  console.log(`  - With mediaUrls: ${posts.filter(p => p.mediaUrls && p.mediaUrls.length > 0).length}`);
  console.log(`  - With CDN URL: ${posts.filter(p => p.videoMeta?.downloadUrl || p.videoMeta?.playUrl).length}`);

  if (videosWithUrl.length === 0) {
    console.error('ERROR: No videos with URLs found');
    process.exit(1);
  }

  // Limit to VIDEO_COUNT videos
  const selectedVideos = videosWithUrl.slice(0, VIDEO_COUNT);
  console.log(`  Selected ${selectedVideos.length} videos for analysis\n`);

  // Step 3: Download videos to buffer
  console.log('[Step 3] Downloading videos...');
  const downloadStart = Date.now();

  const mediaItems: Array<{
    id: string;
    type: MediaType;
    url: string;
    buffer?: Buffer;
    caption: string;
  }> = [];

  for (let i = 0; i < selectedVideos.length; i++) {
    const video = selectedVideos[i];
    // Prefer Apify-stored URL (stable), then mediaUrls, then CDN URL
    const videoUrl =
      video.videoUrl ||
      (video.mediaUrls && video.mediaUrls[0]) ||
      video.videoMeta?.downloadUrl ||
      video.videoMeta?.playUrl ||
      '';

    const source = video.videoUrl ? 'Apify storage'
      : (video.mediaUrls && video.mediaUrls[0]) ? 'mediaUrls'
      : 'TikTok CDN';

    console.log(`  Downloading video ${i + 1}/${selectedVideos.length}: ${video.id}`);
    console.log(`    Source: ${source}`);

    const downloaded = await downloadVideoBuffer(videoUrl);

    if (downloaded) {
      const sizeMB = (downloaded.buffer.length / 1024 / 1024).toFixed(2);
      console.log(`    Size: ${sizeMB}MB`);

      mediaItems.push({
        id: video.id,
        type: 'video',
        url: videoUrl,
        buffer: downloaded.buffer,
        caption: video.text || '',
      });
    } else {
      console.log(`    Failed to download, skipping`);
    }
  }

  if (mediaItems.length === 0) {
    console.error('ERROR: No videos could be downloaded');
    process.exit(1);
  }

  console.log(`  Downloaded ${mediaItems.length}/${selectedVideos.length} videos in ${((Date.now() - downloadStart) / 1000).toFixed(1)}s\n`);

  // Step 4: Run batch analysis
  console.log('[Step 4] Running batch analysis...');
  const analysisStart = Date.now();

  const results = await analyzeAllMedia(
    mediaItems.map(m => ({
      id: m.id,
      type: m.type,
      url: m.url,
      buffer: m.buffer,
    })),
    {
      videoConcurrency: 2,  // Conservative for 10 videos
      retries: 2,
      onProgress: (completed, total, failed) => {
        const pct = ((completed / total) * 100).toFixed(0);
        console.log(`  Progress: ${completed}/${total} (${pct}%) - ${failed} failed`);
      },
    }
  );

  const analysisTime = ((Date.now() - analysisStart) / 1000).toFixed(1);
  console.log(`  Analysis completed in ${analysisTime}s\n`);

  // Step 5: Display results summary
  console.log('='.repeat(60));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(60) + '\n');

  const summary = getAnalysisSummary(results);
  console.log(`Total videos processed: ${summary.total}`);
  console.log(`  Successful: ${summary.successful}`);
  console.log(`  Failed: ${summary.failed}`);
  console.log(`  Brands detected: ${summary.brandsDetected}`);
  console.log(`  Average safety rating: ${summary.averageSafetyRating}\n`);

  // Show individual results
  console.log('-'.repeat(60));
  console.log('INDIVIDUAL VIDEO RESULTS');
  console.log('-'.repeat(60) + '\n');

  for (const [id, result] of results) {
    const videoMeta = mediaItems.find(m => m.id === id);
    console.log(`Video: ${id}`);
    console.log(`  Caption: ${(videoMeta?.caption || '').slice(0, 60)}...`);

    if (result) {
      console.log(`  Safety: ${result.visualAnalysis.brandSafetyRating.toUpperCase()}`);
      console.log(`  Description: ${result.visualAnalysis.description.slice(0, 100)}...`);

      // Brands
      const brands = result.visualAnalysis.brands;
      if (brands.length > 0) {
        console.log(`  Brands detected: ${brands.map(b => `${b.brand} (${b.confidence})`).join(', ')}`);
      } else {
        console.log(`  Brands detected: none`);
      }

      // Logo detections (if available)
      if (result.logoDetections && result.logoDetections.length > 0) {
        console.log(`  Logo detections: ${result.logoDetections.map(l => l.brand).join(', ')}`);
      }

      // Transcript
      if (result.transcript?.text) {
        const transcriptPreview = result.transcript.text.slice(0, 100);
        console.log(`  Transcript: "${transcriptPreview}${result.transcript.text.length > 100 ? '...' : ''}"`);
      } else {
        console.log(`  Transcript: (no speech detected)`);
      }

      // Content classification
      if (result.contentClassification) {
        const topLabels = result.contentClassification.labels
          .slice(0, 3)
          .map(l => l.label)
          .join(', ');
        console.log(`  Content categories: ${topLabels}`);
        console.log(`  Safety score: ${(result.contentClassification.overallSafetyScore * 100).toFixed(0)}%`);
      }
    } else {
      console.log(`  Status: FAILED`);
    }

    console.log('');
  }

  // Final summary
  console.log('='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
  console.log(`Creator: @${CREATOR_HANDLE}`);
  console.log(`Videos analyzed: ${summary.successful}/${summary.total}`);
  console.log(`Total time: ${((Date.now() - fetchStart) / 1000).toFixed(1)}s`);

  if (summary.failed > 0) {
    console.log(`\nWARNING: ${summary.failed} video(s) failed analysis`);
  }

  if (summary.successful === summary.total) {
    console.log('\nSUCCESS: All videos analyzed successfully');
  }
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
