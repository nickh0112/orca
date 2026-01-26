import { SocialMediaContent, SocialMediaPost } from '@/types/social-media';
import { extractSocialHandles, SocialHandle } from '@/lib/utils';
import { fetchInstagram } from './instagram';
import { fetchTikTok } from './tiktok';
import { fetchYouTube } from './youtube';
import {
  isApifyConfigured,
  fetchTikTokViaApify,
  fetchInstagramViaApify,
  downloadVideo,
} from './apify';
import {
  isTwelveLabsConfigured,
  isClaudeVisionConfigured,
  analyzeAllMedia,
  MediaType,
  MediaAnalysisResult,
} from '@/lib/video-analysis';
import { storeVideo, isBlobStorageConfigured } from '@/lib/storage/video-storage';

export { fetchInstagram } from './instagram';
export { fetchTikTok } from './tiktok';
export { fetchYouTube } from './youtube';
export { analyzeSocialMediaContent, convertAnalysisToFindings, getSocialMediaAnalysisSummary } from './analyzer';
export {
  detectBrands,
  detectBrandsBatch,
  aggregateBrands,
  extractBrandPartnerships,
  buildPartnershipReport,
} from './brand-detector';
export { identifyCompetitors, isCompetitor, clearCompetitorCache } from './competitor-detector';
export { detectSensitiveKeywords, detectKeywordsBatch, aggregateKeywordResults, getDefaultKeywords, getSeverityColor } from './keyword-detector';
export {
  isApifyConfigured,
  fetchTikTokViaApify,
  fetchInstagramViaApify,
} from './apify';

// Concurrency settings for parallel fetching - increased for higher throughput
const APIFY_CONCURRENCY = 15;

/**
 * Split an array into chunks of specified size
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const MAX_POSTS_PER_PLATFORM = 10; // Limit posts to analyze per platform

/**
 * Enrich posts with media analysis (videos via Twelve Labs, images via Claude Vision)
 * Returns posts with transcript and visualAnalysis fields populated
 * Uses batch processing with concurrency control for high throughput
 */
async function enrichWithMediaAnalysis(
  posts: SocialMediaPost[]
): Promise<SocialMediaPost[]> {
  const twelveLabsAvailable = isTwelveLabsConfigured();
  const claudeVisionAvailable = isClaudeVisionConfigured();

  if (!twelveLabsAvailable && !claudeVisionAvailable) {
    console.log('[Media Analysis] No analyzers configured, skipping enrichment');
    return posts;
  }

  // Collect media items to analyze
  const mediaItems: Array<{
    id: string;
    type: MediaType;
    url: string;
    buffer?: Buffer;
    contentType?: string;
  }> = [];

  // Track stored video URLs for each post
  const storedVideoUrls = new Map<string, string>();
  const blobStorageAvailable = isBlobStorageConfigured();

  const postsWithMedia = posts.filter((p) => p.mediaUrl);

  for (const post of postsWithMedia) {
    const isVideo = post.mediaType === 'video';
    const isImage = post.mediaType === 'image' || post.mediaType === 'carousel';

    // Skip if we can't analyze this type
    if (isVideo && !twelveLabsAvailable) continue;
    if (isImage && !claudeVisionAvailable) continue;

    // Skip posts that already have analysis
    const postWithAnalysis = post as SocialMediaPost & { visualAnalysis?: unknown };
    if (postWithAnalysis.visualAnalysis) continue;

    if (isVideo || isImage) {
      // Download video/image if needed
      let buffer: Buffer | undefined;
      let contentType: string | undefined;
      if (isVideo) {
        try {
          const videoData = await downloadVideo(post.mediaUrl!);
          buffer = videoData?.buffer;
          contentType = videoData?.contentType;

          // Store video in Vercel Blob for persistent access
          if (buffer && blobStorageAvailable) {
            try {
              const filename = `videos/${post.id}.mp4`;
              const storedUrl = await storeVideo(buffer, filename, contentType || 'video/mp4');
              storedVideoUrls.set(post.id, storedUrl);
              console.log(`[Blob Storage] Stored video for ${post.id}: ${storedUrl.slice(0, 60)}...`);
            } catch (blobError) {
              console.warn(`[Blob Storage] Failed to store ${post.id}:`, blobError);
            }
          }
        } catch (error) {
          console.warn(`[Media Analysis] Failed to download ${post.id}:`, error);
        }
      }

      mediaItems.push({
        id: post.id,
        type: isVideo ? 'video' : 'image',
        url: post.mediaUrl!,
        buffer,
        contentType,
      });
    }
  }

  // Debug logging for collected media items
  console.log(`[Media Analysis] Collected ${mediaItems.length} items for analysis:`);
  for (const item of mediaItems) {
    console.log(`  - ${item.id}: ${item.type}, buffer: ${item.buffer ? `${(item.buffer.length/1024).toFixed(0)}KB` : 'none'}, url: ${item.url.slice(0, 60)}...`);
  }

  if (mediaItems.length === 0) {
    console.log('[Media Analysis] No media items to analyze');
    return posts;
  }

  const videoCount = mediaItems.filter((m) => m.type === 'video').length;
  const imageCount = mediaItems.filter((m) => m.type === 'image').length;

  console.log(
    `[Media Analysis] Analyzing ${mediaItems.length} items: ` +
      `${videoCount} videos, ${imageCount} images`
  );

  // Analyze all media with progress tracking
  let completed = 0;
  const results = await analyzeAllMedia(mediaItems, {
    videoConcurrency: 5,
    imageConcurrency: 10,
    retries: 3,
    onProgress: (done, total, failed) => {
      if (done % 5 === 0 || done === total) {
        console.log(`[Media Analysis] Progress: ${done}/${total} (${failed} failed)`);
      }
      completed = done;
    },
  });

  // Merge results back into posts with full Twelve Labs data
  const enrichedPosts = posts.map((post) => {
    const result = results.get(post.id);
    const storedUrl = storedVideoUrls.get(post.id);

    // If no analysis result but we have a stored URL, still add it
    if (!result && !storedUrl) return post;

    // Extend visualAnalysis with full Twelve Labs data
    const extendedVisualAnalysis = result ? {
      ...result.visualAnalysis,
      // Preserve logo detections with timestamps and prominence
      logoDetections: result.logoDetections,
      // Preserve detailed content classification scores
      contentClassification: result.contentClassification,
      // Preserve timestamped transcript segments
      transcriptSegments: result.transcript?.segments,
      // Preserve video duration from index info
      videoDuration: result.indexInfo?.duration,
    } : undefined;

    const enriched: SocialMediaPost & { visualAnalysis?: unknown } = {
      ...post,
      visualAnalysis: extendedVisualAnalysis || (post as SocialMediaPost & { visualAnalysis?: unknown }).visualAnalysis,
      // Add stored video URL for persistent access (fixes seeking issues)
      storedMediaUrl: storedUrl || post.storedMediaUrl,
    };

    // Add transcript for videos
    if (result?.transcript?.text) {
      enriched.transcript = result.transcript.text || post.transcript;
    }

    return enriched as SocialMediaPost;
  });

  const successCount = Array.from(results.values()).filter((r) => r !== null).length;
  console.log(
    `[Media Analysis] Enriched ${successCount}/${mediaItems.length} posts with analysis`
  );

  return enrichedPosts;
}

/**
 * Fetch social media content from all platforms
 *
 * Strategy (in order of preference):
 * 1. Apify scrapers (reliable video URLs for TikTok/Instagram)
 * 2. Platform APIs (fallback - TikTok TCM, Instagram Graph, YouTube API)
 * 3. Twelve Labs enrichment (video analysis and transcription)
 */
export async function fetchAllSocialMedia(
  socialLinks: string[],
  monthsBack: number = 6,
  options: { enableTwelveLabs?: boolean } = {}
): Promise<SocialMediaContent[]> {
  console.log('[DEBUG] fetchAllSocialMedia called with:', { socialLinks, monthsBack });

  const { enableTwelveLabs = true } = options;

  // Extract handles from social links
  const handles = extractSocialHandles(socialLinks);

  if (handles.length === 0) {
    console.log('No social media handles found in links');
    return [];
  }

  console.log(`Found ${handles.length} social handles to fetch`);

  const socialMediaContent: SocialMediaContent[] = [];
  const apifyConfigured = isApifyConfigured();
  const twelveLabsConfigured = isTwelveLabsConfigured();

  // Log available integrations
  console.log(
    `[Config] Apify: ${apifyConfigured ? 'YES' : 'NO'}, ` +
      `Twelve Labs: ${twelveLabsConfigured ? 'YES' : 'NO'}`
  );

  /**
   * Process a single handle - extracted for parallel processing
   */
  async function processSingleHandle(handle: SocialHandle): Promise<SocialMediaContent | null> {
    let content: SocialMediaContent | null = null;
    const platform = handle.platform as 'instagram' | 'tiktok' | 'youtube';

    // Step 1: Try Apify first (reliable video URLs for TikTok/Instagram)
    if (apifyConfigured && (platform === 'tiktok' || platform === 'instagram')) {
      console.log(
        `[Apify] Fetching from ${platform} scraper for @${handle.handle}`
      );

      try {
        if (platform === 'tiktok') {
          content = await fetchTikTokViaApify(handle.handle, monthsBack);
        } else if (platform === 'instagram') {
          content = await fetchInstagramViaApify(handle.handle, monthsBack);
        }

        // Check if Apify returned useful results
        if (content && content.posts.length === 0 && !content.error) {
          console.log(`[Apify] No posts found for @${handle.handle}, falling back to platform API`);
          content = null;
        }
      } catch (error) {
        console.error(`[Apify] Fetch failed for ${handle.handle}:`, error);
        content = null;
      }
    }

    // Step 2: Fall back to platform API if Apify miss or not applicable
    if (!content) {
      console.log(
        `[API] Fetching from ${platform} API for @${handle.handle}`
      );

      try {
        switch (platform) {
          case 'instagram':
            content = await fetchInstagram(handle.handle, monthsBack);
            break;
          case 'tiktok':
            content = await fetchTikTok(handle.handle, monthsBack);
            break;
          case 'youtube':
            content = await fetchYouTube(handle.handle, monthsBack);
            break;
        }
      } catch (error) {
        console.error(`Platform API fetch failed for ${handle.handle}:`, error);
      }
    }

    // Step 3: Enrich media with analysis (videos via Twelve Labs, images via Claude Vision)
    if (content && enableTwelveLabs && (twelveLabsConfigured || isClaudeVisionConfigured())) {
      const mediaWithoutAnalysis = content.posts.filter(
        (p) =>
          p.mediaUrl &&
          (p.mediaType === 'video' || p.mediaType === 'image' || p.mediaType === 'carousel') &&
          !(p as SocialMediaPost & { visualAnalysis?: unknown }).visualAnalysis
      );

      if (mediaWithoutAnalysis.length > 0) {
        console.log(
          `[Media Analysis] ${mediaWithoutAnalysis.length} media items need analysis for @${handle.handle}`
        );
        content = {
          ...content,
          posts: await enrichWithMediaAnalysis(content.posts),
        };
      }
    }

    return content;
  }

  // Process ALL handles truly in parallel for maximum throughput
  // With upgraded API limits, we can handle higher concurrency
  console.log(`[Parallel] Processing ${handles.length} handles concurrently (max ${APIFY_CONCURRENCY})`);

  // Use Promise.allSettled to process all handles in parallel
  const results = await Promise.allSettled(
    handles.map(handle => processSingleHandle(handle))
  );

  // Collect successful results
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      socialMediaContent.push(result.value);
    } else if (result.status === 'rejected') {
      console.error('[Parallel] Handle processing failed:', result.reason);
    }
  }

  // Log summary
  const totalPosts = socialMediaContent.reduce(
    (sum, content) => sum + content.posts.length,
    0
  );
  const totalTranscripts = socialMediaContent.reduce(
    (sum, content) => sum + content.posts.filter((p) => p.transcript).length,
    0
  );
  const totalVisualAnalysis = socialMediaContent.reduce(
    (sum, content) =>
      sum +
      content.posts.filter(
        (p) => (p as SocialMediaPost & { visualAnalysis?: unknown }).visualAnalysis
      ).length,
    0
  );

  console.log(
    `Fetched ${totalPosts} total posts from ${socialMediaContent.length} social media sources ` +
      `(${totalTranscripts} with transcripts, ${totalVisualAnalysis} with visual analysis)`
  );

  return socialMediaContent;
}

/**
 * Get a summary of what platforms were fetched
 */
export function getSocialMediaSummary(
  content: SocialMediaContent[]
): {
  platforms: string[];
  totalPosts: number;
  errors: string[];
} {
  const platforms = content
    .filter((c) => c.posts.length > 0)
    .map((c) => `${c.platform}/@${c.handle}`);

  const totalPosts = content.reduce((sum, c) => sum + c.posts.length, 0);

  const errors = content
    .filter((c) => c.error)
    .map((c) => `${c.platform}/@${c.handle}: ${c.error}`);

  return { platforms, totalPosts, errors };
}
