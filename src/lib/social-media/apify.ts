/**
 * Apify Integration for TikTok and Instagram Content Scraping
 *
 * Uses Apify actors to fetch social media content with direct video URLs:
 * - TikTok Scraper: https://apify.com/clockworks/tiktok-scraper
 * - Instagram Scraper: https://apify.com/apify/instagram-scraper
 *
 * Cost: ~$0.30-0.50 per 1K posts (pay-as-you-go)
 */

import { SocialMediaContent, SocialMediaPost } from '@/types/social-media';
import {
  ApifyTikTokPost,
  ApifyInstagramPost,
} from '@/types/video-analysis';

// Apify API configuration
const APIFY_API_BASE = 'https://api.apify.com/v2';

// Actor IDs for the scrapers
const ACTORS = {
  TIKTOK: 'clockworks~tiktok-scraper',
  INSTAGRAM: 'apify~instagram-scraper',
};

// Configuration
const CONFIG = {
  MAX_POSTS_DEFAULT: 20,
  RUN_TIMEOUT_MS: 300000, // 5 minutes
  POLL_INTERVAL_MS: 5000, // 5 seconds
};

/**
 * Check if Apify is configured
 */
export function isApifyConfigured(): boolean {
  return !!process.env.APIFY_API_KEY;
}

/**
 * Get Apify API headers
 */
function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.APIFY_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Calculate date N months ago
 */
function getDateMonthsAgo(monthsBack: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsBack);
  return date;
}

/**
 * Wait for an Apify run to complete
 */
async function waitForRun(runId: string): Promise<'SUCCEEDED' | 'FAILED'> {
  const startTime = Date.now();

  while (Date.now() - startTime < CONFIG.RUN_TIMEOUT_MS) {
    const response = await fetch(`${APIFY_API_BASE}/actor-runs/${runId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to check run status: ${response.status}`);
    }

    const data = await response.json();
    const status = data.data?.status;

    if (status === 'SUCCEEDED') {
      return 'SUCCEEDED';
    }
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      console.error(`Apify run failed with status: ${status}`);
      return 'FAILED';
    }

    // Still running, wait and poll again
    await new Promise((resolve) => setTimeout(resolve, CONFIG.POLL_INTERVAL_MS));
  }

  throw new Error('Apify run timed out');
}

/**
 * Get results from a completed Apify run
 */
async function getRunResults<T>(runId: string): Promise<T[]> {
  const response = await fetch(
    `${APIFY_API_BASE}/actor-runs/${runId}/dataset/items`,
    {
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get run results: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch TikTok content via Apify scraper
 *
 * Returns posts with direct video download URLs
 */
export async function fetchTikTokViaApify(
  handle: string,
  monthsBack: number = 6
): Promise<SocialMediaContent> {
  if (!isApifyConfigured()) {
    return {
      platform: 'tiktok',
      handle,
      posts: [],
      fetchedAt: new Date().toISOString(),
      error: 'Apify API key not configured',
    };
  }

  const cutoffDate = getDateMonthsAgo(monthsBack);

  console.log(`[Apify] Fetching TikTok posts for @${handle} (last ${monthsBack} months)...`);

  try {
    // Start the TikTok scraper actor
    const runResponse = await fetch(
      `${APIFY_API_BASE}/acts/${ACTORS.TIKTOK}/runs`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          profiles: [handle],
          resultsPerPage: CONFIG.MAX_POSTS_DEFAULT,
          shouldDownloadVideos: false, // We just need URLs
          shouldDownloadCovers: false,
        }),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      throw new Error(`Failed to start TikTok scraper: ${runResponse.status} - ${errorText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;

    if (!runId) {
      throw new Error('No run ID returned from Apify');
    }

    console.log(`[Apify] TikTok scraper started, run ID: ${runId}`);

    // Wait for completion
    const status = await waitForRun(runId);
    if (status === 'FAILED') {
      throw new Error('TikTok scraper run failed');
    }

    // Get results
    const results = await getRunResults<ApifyTikTokPost>(runId);

    console.log(`[Apify] Got ${results.length} TikTok posts for @${handle}`);

    // Convert to SocialMediaPost format and filter by date
    const posts: SocialMediaPost[] = results
      .filter((post) => {
        const postDate = new Date(post.createTime * 1000);
        return postDate >= cutoffDate;
      })
      .map((post) => ({
        id: post.id,
        caption: post.text || '',
        permalink: post.webVideoUrl,
        timestamp: new Date(post.createTime * 1000).toISOString(),
        engagement: {
          likes: post.diggCount,
          comments: post.commentCount,
          views: post.playCount,
          shares: post.shareCount,
        },
        mediaUrl: post.videoMeta?.downloadUrl || post.videoMeta?.playUrl || post.webVideoUrl,
        thumbnailUrl: post.videoMeta?.coverUrl,
        mediaType: 'video' as const,
      }));

    console.log(
      `[Apify] Filtered to ${posts.length} TikTok posts within date range, ` +
        `${posts.filter((p) => p.mediaUrl).length} with video URLs`
    );

    return {
      platform: 'tiktok',
      handle,
      posts,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[Apify] TikTok fetch error for @${handle}:`, error);
    return {
      platform: 'tiktok',
      handle,
      posts: [],
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch Instagram content via Apify scraper
 *
 * Returns posts with direct video/image URLs
 */
export async function fetchInstagramViaApify(
  handle: string,
  monthsBack: number = 6
): Promise<SocialMediaContent> {
  if (!isApifyConfigured()) {
    return {
      platform: 'instagram',
      handle,
      posts: [],
      fetchedAt: new Date().toISOString(),
      error: 'Apify API key not configured',
    };
  }

  const cutoffDate = getDateMonthsAgo(monthsBack);

  console.log(`[Apify] Fetching Instagram posts for @${handle} (last ${monthsBack} months)...`);

  try {
    // Start the Instagram scraper actor
    const runResponse = await fetch(
      `${APIFY_API_BASE}/acts/${ACTORS.INSTAGRAM}/runs`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          usernames: [handle],
          resultsLimit: CONFIG.MAX_POSTS_DEFAULT,
          resultsType: 'posts',
          addParentData: false,
        }),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      throw new Error(`Failed to start Instagram scraper: ${runResponse.status} - ${errorText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;

    if (!runId) {
      throw new Error('No run ID returned from Apify');
    }

    console.log(`[Apify] Instagram scraper started, run ID: ${runId}`);

    // Wait for completion
    const status = await waitForRun(runId);
    if (status === 'FAILED') {
      throw new Error('Instagram scraper run failed');
    }

    // Get results
    const results = await getRunResults<ApifyInstagramPost>(runId);

    console.log(`[Apify] Got ${results.length} Instagram posts for @${handle}`);

    // Convert to SocialMediaPost format and filter by date
    const posts: SocialMediaPost[] = results
      .filter((post) => {
        const postDate = new Date(post.timestamp);
        return postDate >= cutoffDate;
      })
      .map((post) => ({
        id: post.id || post.shortCode,
        caption: post.caption || '',
        permalink: post.url,
        timestamp: post.timestamp,
        engagement: {
          likes: post.likesCount,
          comments: post.commentsCount,
        },
        mediaUrl: post.isVideo ? post.videoUrl : post.displayUrl,
        thumbnailUrl: post.displayUrl,
        mediaType: post.isVideo ? ('video' as const) : ('image' as const),
      }));

    console.log(
      `[Apify] Filtered to ${posts.length} Instagram posts within date range, ` +
        `${posts.filter((p) => p.mediaType === 'video' && p.mediaUrl).length} videos with URLs`
    );

    return {
      platform: 'instagram',
      handle,
      posts,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[Apify] Instagram fetch error for @${handle}:`, error);
    return {
      platform: 'instagram',
      handle,
      posts: [],
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download video from URL for further processing
 * Returns a buffer that can be uploaded to Twelve Labs
 */
export async function downloadVideo(
  videoUrl: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(videoUrl);

    if (!response.ok) {
      console.error(`Failed to download video: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const buffer = Buffer.from(await response.arrayBuffer());

    return { buffer, contentType };
  } catch (error) {
    console.error('Video download error:', error);
    return null;
  }
}
