import {
  TikTokAPIResponse,
  SocialMediaContent,
  SocialMediaPost,
} from '@/types/social-media';
import { transcribeFromUrl } from '@/lib/transcription';

const TIKTOK_TCM_ACCESS_TOKEN = process.env.TIKTOK_TCM_ACCESS_TOKEN;
const TIKTOK_TCM_ACCOUNT_ID = process.env.TIKTOK_TCM_ACCOUNT_ID;

const TCM_API_URL = 'https://business-api.tiktok.com/open_api/v1.3/tto/tcm/creator/public/video/list/';
const MAX_ITERATIONS = 100;
const POSTS_PER_REQUEST = 10;

/**
 * Get Unix timestamp for N months ago
 */
function getSinceTimestamp(monthsAgo: number): number {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  return Math.floor(date.getTime() / 1000);
}

/**
 * Query the TikTok TCM API for creator videos
 */
async function queryTikTokAPI(
  handle: string,
  cursor?: string
): Promise<TikTokAPIResponse> {
  if (!TIKTOK_TCM_ACCESS_TOKEN || !TIKTOK_TCM_ACCOUNT_ID) {
    throw new Error('TikTok API credentials not configured');
  }

  const params = new URLSearchParams({
    handle_name: handle,
    tto_tcm_account_id: TIKTOK_TCM_ACCOUNT_ID,
    limit: POSTS_PER_REQUEST.toString(),
  });

  if (cursor) {
    params.append('cursor', cursor);
  }

  const url = `${TCM_API_URL}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Access-Token': TIKTOK_TCM_ACCESS_TOKEN,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`TikTok API error for ${handle}:`, errorText);
    throw new Error(`TikTok API request failed: ${response.status}`);
  }

  return response.json();
}

// Type for TikTok posts array
type TikTokPostArray = NonNullable<TikTokAPIResponse['data']>['posts'];

/**
 * Fetch TikTok posts for a handle with cursor-based pagination
 */
async function fetchTikTokPosts(
  handle: string,
  monthsBack: number = 6
): Promise<TikTokPostArray> {
  const since = getSinceTimestamp(monthsBack);
  const allPosts: TikTokPostArray = [];
  let cursor: string | undefined;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    try {
      const response = await queryTikTokAPI(handle, cursor);

      if (response.code !== 0 || !response.data) {
        console.error(`TikTok API error for ${handle}:`, response.message);
        break;
      }

      const posts = response.data.posts;

      if (!posts || posts.length === 0) {
        console.log(`No more posts found for TikTok @${handle}`);
        break;
      }

      // Check if the last post is older than our since date
      const lastPost = posts[posts.length - 1];
      if (lastPost.create_time < since) {
        // Filter posts within the time range and add them
        const filteredPosts = posts.filter((post) => post.create_time > since);
        allPosts.push(...filteredPosts);
        console.log(`TikTok @${handle}: Reached time limit, total posts: ${allPosts.length}`);
        break;
      }

      allPosts.push(...posts);

      // Check pagination
      if (!response.data.page_info.has_more) {
        console.log(`TikTok @${handle}: No more pages, total posts: ${allPosts.length}`);
        break;
      }

      cursor = response.data.page_info.cursor;

      if (!cursor) {
        break;
      }

      console.log(`TikTok @${handle}: Iteration ${i + 1}, total posts: ${allPosts.length}`);
    } catch (error) {
      console.error(`Error fetching TikTok posts for ${handle}:`, error);
      break;
    }
  }

  return allPosts;
}

/**
 * Convert TikTok posts to unified SocialMediaPost format
 */
function convertToSocialMediaPosts(
  posts: TikTokPostArray
): SocialMediaPost[] {
  return posts.map((post) => ({
    id: post.video_id,
    caption: post.caption || '',
    permalink: post.embed_url,
    timestamp: new Date(post.create_time * 1000).toISOString(),
    engagement: {
      likes: post.likes,
      comments: post.comments,
      views: post.video_views,
      shares: post.shares,
    },
    mediaUrl: post.media_url,
    thumbnailUrl: post.thumbnail_url,
    mediaType: 'video' as const,
  }));
}

/**
 * Transcribe TikTok videos using OpenAI Whisper
 * Returns posts with transcript field populated for videos with media_url
 */
async function transcribeVideoPosts(
  posts: SocialMediaPost[],
  rawPosts: TikTokPostArray
): Promise<SocialMediaPost[]> {
  // Build a map of post ID to raw post for video URL lookup
  const rawPostMap = new Map(rawPosts.map((p) => [p.video_id, p]));

  // Process posts with transcription
  const transcribedPosts = await Promise.all(
    posts.map(async (post) => {
      const rawPost = rawPostMap.get(post.id);

      // Only transcribe if media_url is available
      if (!rawPost?.media_url) {
        return post;
      }

      try {
        console.log(`Transcribing TikTok video: ${post.id}`);
        const result = await transcribeFromUrl(rawPost.media_url, 'video.mp4');

        if (result?.text) {
          return { ...post, transcript: result.text };
        }
      } catch (error) {
        console.error(`Failed to transcribe TikTok video ${post.id}:`, error);
      }

      return post;
    })
  );

  return transcribedPosts;
}

/**
 * Main function to fetch TikTok content for a handle
 */
export async function fetchTikTok(
  handle: string,
  monthsBack: number = 6
): Promise<SocialMediaContent> {
  // Check if credentials are configured
  if (!TIKTOK_TCM_ACCESS_TOKEN || !TIKTOK_TCM_ACCOUNT_ID) {
    console.log('TikTok API credentials not configured, skipping');
    return {
      platform: 'tiktok',
      handle,
      posts: [],
      fetchedAt: new Date().toISOString(),
      error: 'API credentials not configured',
    };
  }

  try {
    const rawPosts = await fetchTikTokPosts(handle, monthsBack);
    const normalizedPosts = convertToSocialMediaPosts(rawPosts);

    console.log(`Fetched ${normalizedPosts.length} TikTok posts for @${handle}`);

    // Transcribe videos if OpenAI API is configured and media_url is available
    const videosWithUrl = rawPosts.filter((p) => p.media_url).length;
    let posts = normalizedPosts;

    if (videosWithUrl > 0 && process.env.OPENAI_API_KEY) {
      console.log(`Transcribing ${videosWithUrl} TikTok videos for @${handle}`);
      posts = await transcribeVideoPosts(normalizedPosts, rawPosts);
      const transcribedCount = posts.filter((p) => p.transcript).length;
      console.log(`Transcribed ${transcribedCount}/${videosWithUrl} videos`);
    } else if (rawPosts.length > 0 && !videosWithUrl) {
      console.log(`TikTok API did not provide direct video URLs for @${handle}, skipping transcription`);
    }

    return {
      platform: 'tiktok',
      handle,
      posts,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch TikTok for ${handle}:`, errorMessage);

    return {
      platform: 'tiktok',
      handle,
      posts: [],
      fetchedAt: new Date().toISOString(),
      error: errorMessage,
    };
  }
}
