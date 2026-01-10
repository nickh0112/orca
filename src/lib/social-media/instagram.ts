import {
  InstagramPost,
  InstagramGraphResponse,
  SocialMediaContent,
  SocialMediaPost,
} from '@/types/social-media';
import { transcribeFromUrl } from '@/lib/transcription';

const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const FACEBOOK_REQUEST_USER_ID = process.env.FACEBOOK_REQUEST_USER_ID;

const GRAPH_API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const MAX_ITERATIONS = 10;
const POSTS_PER_REQUEST = 100;

/**
 * Get Unix timestamp for N months ago
 */
function getSinceTimestamp(monthsAgo: number): number {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  return Math.floor(date.getTime() / 1000);
}

/**
 * Convert ISO timestamp to Unix timestamp
 */
function isoToUnix(timestamp: string): number {
  return Math.floor(new Date(timestamp).getTime() / 1000);
}

/**
 * Query the Instagram Graph API with Business Discovery
 */
async function queryGraphAPI(
  handle: string,
  since: number,
  until: number
): Promise<InstagramGraphResponse> {
  if (!FACEBOOK_ACCESS_TOKEN || !FACEBOOK_REQUEST_USER_ID) {
    throw new Error('Instagram API credentials not configured');
  }

  const fields = `business_discovery.username(${handle}){name,followers_count,biography,follows_count,media.limit(${POSTS_PER_REQUEST}).since(${since}).until(${until}){caption,comments_count,like_count,media_product_type,media_type,media_url,permalink,timestamp}}`;

  const url = `${BASE_URL}/${FACEBOOK_REQUEST_USER_ID}?fields=${encodeURIComponent(fields)}&access_token=${FACEBOOK_ACCESS_TOKEN}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Instagram API error for ${handle}:`, errorText);
    throw new Error(`Instagram API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if the response has more pages
 */
function hasPaging(response: InstagramGraphResponse): boolean {
  return response.business_discovery?.media?.paging !== undefined;
}

/**
 * Extract posts from the API response
 */
function getPostsFromResponse(response: InstagramGraphResponse): InstagramPost[] {
  return response.business_discovery?.media?.data ?? [];
}

/**
 * Fetch Instagram posts for a handle with pagination
 */
async function fetchInstagramPosts(
  handle: string,
  monthsBack: number = 6
): Promise<InstagramPost[]> {
  const since = getSinceTimestamp(monthsBack);
  let until = Math.floor(Date.now() / 1000);
  const allPosts: InstagramPost[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    try {
      const response = await queryGraphAPI(handle, since, until);

      if (response.error) {
        console.error(`Instagram API error for ${handle}:`, response.error.message);
        break;
      }

      const posts = getPostsFromResponse(response);

      if (posts.length === 0) {
        console.log(`No more posts found for Instagram @${handle}`);
        break;
      }

      allPosts.push(...posts);

      if (!hasPaging(response)) {
        console.log(`No pagination for Instagram @${handle}, iteration ${i + 1}`);
        break;
      }

      // Update 'until' to the timestamp of the last post for pagination
      const lastPost = posts[posts.length - 1];
      if (lastPost?.timestamp) {
        until = isoToUnix(lastPost.timestamp);
      } else {
        break;
      }

      console.log(`Instagram @${handle}: Iteration ${i + 1}, total posts: ${allPosts.length}`);
    } catch (error) {
      console.error(`Error fetching Instagram posts for ${handle}:`, error);
      break;
    }
  }

  return allPosts;
}

/**
 * Convert Instagram posts to unified SocialMediaPost format
 */
function convertToSocialMediaPosts(posts: InstagramPost[]): SocialMediaPost[] {
  return posts.map((post) => ({
    id: post.id,
    caption: post.caption || '',
    permalink: post.permalink,
    timestamp: post.timestamp,
    engagement: {
      likes: post.like_count,
      comments: post.comments_count,
    },
  }));
}

/**
 * Transcribe video posts using OpenAI Whisper
 * Returns posts with transcript field populated for videos
 */
async function transcribeVideoPosts(
  posts: SocialMediaPost[],
  rawPosts: InstagramPost[]
): Promise<SocialMediaPost[]> {
  // Build a map of post ID to raw post for video URL lookup
  const rawPostMap = new Map(rawPosts.map((p) => [p.id, p]));

  // Process posts with transcription for VIDEO type
  const transcribedPosts = await Promise.all(
    posts.map(async (post) => {
      const rawPost = rawPostMap.get(post.id);

      // Only transcribe VIDEO posts with media_url
      if (rawPost?.media_type !== 'VIDEO' || !rawPost.media_url) {
        return post;
      }

      try {
        console.log(`Transcribing Instagram video: ${post.id}`);
        const result = await transcribeFromUrl(rawPost.media_url, 'video.mp4');

        if (result?.text) {
          return { ...post, transcript: result.text };
        }
      } catch (error) {
        console.error(`Failed to transcribe video ${post.id}:`, error);
      }

      return post;
    })
  );

  return transcribedPosts;
}

/**
 * Main function to fetch Instagram content for a handle
 */
export async function fetchInstagram(
  handle: string,
  monthsBack: number = 6
): Promise<SocialMediaContent> {
  // Check if credentials are configured
  if (!FACEBOOK_ACCESS_TOKEN || !FACEBOOK_REQUEST_USER_ID) {
    console.log('Instagram API credentials not configured, skipping');
    return {
      platform: 'instagram',
      handle,
      posts: [],
      fetchedAt: new Date().toISOString(),
      error: 'API credentials not configured',
    };
  }

  try {
    const rawPosts = await fetchInstagramPosts(handle, monthsBack);
    const normalizedPosts = convertToSocialMediaPosts(rawPosts);

    console.log(`Fetched ${normalizedPosts.length} Instagram posts for @${handle}`);

    // Transcribe video posts if OpenAI API is configured
    const videoCount = rawPosts.filter((p) => p.media_type === 'VIDEO').length;
    let posts = normalizedPosts;

    if (videoCount > 0 && process.env.OPENAI_API_KEY) {
      console.log(`Transcribing ${videoCount} Instagram videos for @${handle}`);
      posts = await transcribeVideoPosts(normalizedPosts, rawPosts);
      const transcribedCount = posts.filter((p) => p.transcript).length;
      console.log(`Transcribed ${transcribedCount}/${videoCount} videos`);
    }

    return {
      platform: 'instagram',
      handle,
      posts,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch Instagram for ${handle}:`, errorMessage);

    return {
      platform: 'instagram',
      handle,
      posts: [],
      fetchedAt: new Date().toISOString(),
      error: errorMessage,
    };
  }
}
