import { SocialMediaContent, SocialMediaPost } from '@/types/social-media';
import { extractSocialHandles, SocialHandle } from '@/lib/utils';
import { fetchInstagram } from './instagram';
import { fetchTikTok } from './tiktok';
import { fetchYouTube } from './youtube';
import {
  isVespaConfigured,
  queryTranscriptsByHandle,
  convertVespaPostsToSocialMediaContent,
  VespaPost,
} from '@/lib/vespa';

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

/**
 * Fetch content from Vespa for a handle
 * Returns SocialMediaContent if found, null otherwise
 */
const MAX_POSTS_PER_PLATFORM = 10; // Limit posts to analyze per platform

async function fetchFromVespa(
  handle: string,
  platform: 'instagram' | 'tiktok' | 'youtube',
  monthsBack: number
): Promise<SocialMediaContent | null> {
  try {
    // Pass monthsBack to Vespa query for server-side time filtering
    const vespaPosts = await queryTranscriptsByHandle(handle, MAX_POSTS_PER_PLATFORM, monthsBack);

    if (vespaPosts.length === 0) {
      return null;
    }

    // Filter by platform (Vespa already filters by time)
    const filteredPosts = vespaPosts.filter((p) => p.platform === platform);

    if (filteredPosts.length === 0) {
      return null;
    }

    // Convert to SocialMediaContent format
    const content = convertVespaPostsToSocialMediaContent(filteredPosts, handle);
    if (!content) {
      return null;
    }

    // Convert to standard SocialMediaContent (without source field for type compatibility)
    const result: SocialMediaContent = {
      platform: content.platform,
      handle: content.handle,
      posts: content.posts as SocialMediaPost[],
      fetchedAt: content.fetchedAt,
    };

    console.log(
      `[Vespa] Found ${result.posts.length} posts for ${platform}/@${handle} ` +
        `(${result.posts.filter((p) => p.transcript).length} with transcripts)`
    );

    return result;
  } catch (error) {
    console.error(`Vespa fetch failed for ${handle}:`, error);
    return null;
  }
}

/**
 * Fetch social media content from all platforms
 * Strategy: Check Vespa first, fall back to platform APIs
 */
export async function fetchAllSocialMedia(
  socialLinks: string[],
  monthsBack: number = 6
): Promise<SocialMediaContent[]> {
  // Extract handles from social links
  const handles = extractSocialHandles(socialLinks);

  if (handles.length === 0) {
    console.log('No social media handles found in links');
    return [];
  }

  console.log(`Found ${handles.length} social handles to fetch`);

  const socialMediaContent: SocialMediaContent[] = [];
  const vespaConfigured = isVespaConfigured();

  if (vespaConfigured) {
    console.log('[Vespa] Checking for existing transcripts...');
  }

  // Process each handle
  for (const handle of handles) {
    let content: SocialMediaContent | null = null;

    // Step 1: Try Vespa first if configured
    if (vespaConfigured) {
      content = await fetchFromVespa(
        handle.handle,
        handle.platform as 'instagram' | 'tiktok' | 'youtube',
        monthsBack
      );
    }

    // Step 2: Fall back to platform API if not in Vespa
    if (!content) {
      console.log(
        `[API] Fetching from ${handle.platform} API for @${handle.handle}`
      );

      try {
        switch (handle.platform) {
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

    if (content) {
      socialMediaContent.push(content);
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

  console.log(
    `Fetched ${totalPosts} total posts from ${socialMediaContent.length} social media sources ` +
      `(${totalTranscripts} with transcripts)`
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
