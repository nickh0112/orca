import {
  YouTubeSearchResponse,
  YouTubeVideoResponse,
  SocialMediaContent,
  SocialMediaPost,
} from '@/types/social-media';
import YouTubeTranscriptApi from 'youtube-captions-api';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const MAX_ITERATIONS = 100;
const VIDEOS_PER_REQUEST = 10;

// Initialize transcript API
const transcriptApi = new YouTubeTranscriptApi();

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
 * Step 1: Get the channel ID for a creator handle
 */
async function getChannelId(handle: string): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  const params = new URLSearchParams({
    part: 'snippet',
    q: handle,
    maxResults: '1',
    type: 'channel',
    key: GOOGLE_API_KEY,
  });

  const url = `${YOUTUBE_API_BASE}/search?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`YouTube search API error for ${handle}:`, errorText);
    throw new Error(`YouTube API request failed: ${response.status}`);
  }

  const data: YouTubeSearchResponse = await response.json();

  if (!data.items || data.items.length === 0) {
    console.log(`No YouTube channel found for ${handle}`);
    return null;
  }

  const channelId = data.items[0].id.channelId;
  console.log(`Found YouTube channel ${channelId} for ${handle}`);
  return channelId ?? null;
}

/**
 * Step 2: Get video IDs from a channel with pagination
 */
async function getVideoIds(
  channelId: string,
  since: number
): Promise<string[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  const videoIds: string[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const params = new URLSearchParams({
      part: 'snippet',
      channelId,
      maxResults: VIDEOS_PER_REQUEST.toString(),
      order: 'date',
      type: 'video',
      key: GOOGLE_API_KEY,
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const url = `${YOUTUBE_API_BASE}/search?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`YouTube video search API error:`, errorText);
      break;
    }

    const data: YouTubeSearchResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      break;
    }

    // Check if the last video is older than our since date
    const lastItem = data.items[data.items.length - 1];
    const lastPublished = lastItem.snippet?.publishedAt;

    if (lastPublished && isoToUnix(lastPublished) < since) {
      // Filter videos within the time range
      const filteredItems = data.items.filter(
        (item) =>
          item.snippet?.publishedAt &&
          isoToUnix(item.snippet.publishedAt) > since
      );
      const ids = filteredItems
        .map((item) => item.id.videoId)
        .filter((id): id is string => !!id);
      videoIds.push(...ids);
      console.log(`YouTube channel ${channelId}: Reached time limit`);
      break;
    }

    const ids = data.items
      .map((item) => item.id.videoId)
      .filter((id): id is string => !!id);
    videoIds.push(...ids);

    // Check for more pages
    if (!data.nextPageToken) {
      break;
    }

    pageToken = data.nextPageToken;
    console.log(`YouTube channel ${channelId}: Iteration ${i + 1}, videos: ${videoIds.length}`);
  }

  return videoIds;
}

/**
 * Fetch transcript for a single video
 */
async function fetchVideoTranscript(videoId: string): Promise<string> {
  try {
    const transcript = await transcriptApi.fetch(videoId, {
      languages: ['en', 'en-US', 'en-GB'], // Prefer English, fallback to others
    });
    return transcript.getText();
  } catch (error) {
    // Transcript not available (private video, no captions, etc.)
    console.log(`No transcript available for video ${videoId}`);
    return '';
  }
}

/**
 * Fetch transcripts for multiple videos in parallel (with rate limiting)
 */
async function fetchVideoTranscripts(
  videoIds: string[]
): Promise<Map<string, string>> {
  const transcripts = new Map<string, string>();

  // Process in batches of 5 to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (id) => ({
        id,
        transcript: await fetchVideoTranscript(id),
      }))
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.transcript) {
        transcripts.set(result.value.id, result.value.transcript);
      }
    }

    // Small delay between batches
    if (i + batchSize < videoIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(`Fetched ${transcripts.size} transcripts out of ${videoIds.length} videos`);
  return transcripts;
}

/**
 * Step 3: Get video details (descriptions, tags, etc.)
 */
async function getVideoDetails(
  videoIds: string[]
): Promise<YouTubeVideoResponse['items']> {
  if (!GOOGLE_API_KEY || videoIds.length === 0) {
    return [];
  }

  // YouTube API allows up to 50 video IDs per request
  const allVideos: YouTubeVideoResponse['items'] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);

    const params = new URLSearchParams({
      part: 'snippet',
      id: batch.join(','),
      key: GOOGLE_API_KEY,
    });

    const url = `${YOUTUBE_API_BASE}/videos?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`YouTube videos API error:`, errorText);
      continue;
    }

    const data: YouTubeVideoResponse = await response.json();

    if (data.items) {
      allVideos.push(...data.items);
    }
  }

  return allVideos;
}

/**
 * Convert YouTube videos to unified SocialMediaPost format
 */
function convertToSocialMediaPosts(
  videos: YouTubeVideoResponse['items'],
  transcripts: Map<string, string>
): SocialMediaPost[] {
  if (!videos) return [];

  return videos.map((video) => ({
    id: video.id,
    // Use description as "caption" for YouTube, with title as prefix
    caption: `${video.snippet.title}\n\n${video.snippet.description}`,
    // Add transcript if available
    transcript: transcripts.get(video.id) || undefined,
    permalink: `https://www.youtube.com/watch?v=${video.id}`,
    timestamp: video.snippet.publishedAt,
    engagement: {
      // YouTube API doesn't return engagement stats in snippet
      // Would need statistics part for that
    },
    // YouTube thumbnails can be constructed from video ID
    thumbnailUrl: `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
    mediaType: 'video' as const,
  }));
}

/**
 * Main function to fetch YouTube content for a handle
 */
export async function fetchYouTube(
  handle: string,
  monthsBack: number = 6
): Promise<SocialMediaContent> {
  // Check if credentials are configured
  if (!GOOGLE_API_KEY) {
    console.log('YouTube API key not configured, skipping');
    return {
      platform: 'youtube',
      handle,
      posts: [],
      fetchedAt: new Date().toISOString(),
      error: 'API key not configured',
    };
  }

  try {
    // Step 1: Get channel ID
    const channelId = await getChannelId(handle);

    if (!channelId) {
      return {
        platform: 'youtube',
        handle,
        posts: [],
        fetchedAt: new Date().toISOString(),
        error: 'Channel not found',
      };
    }

    // Step 2: Get video IDs
    const since = getSinceTimestamp(monthsBack);
    const videoIds = await getVideoIds(channelId, since);

    if (videoIds.length === 0) {
      return {
        platform: 'youtube',
        handle,
        posts: [],
        fetchedAt: new Date().toISOString(),
      };
    }

    // Step 3: Get video details and transcripts in parallel
    const [videos, transcripts] = await Promise.all([
      getVideoDetails(videoIds),
      fetchVideoTranscripts(videoIds),
    ]);

    const normalizedPosts = convertToSocialMediaPosts(videos, transcripts);

    console.log(`Fetched ${normalizedPosts.length} YouTube videos for ${handle} (${transcripts.size} with transcripts)`);

    return {
      platform: 'youtube',
      handle,
      posts: normalizedPosts,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch YouTube for ${handle}:`, errorMessage);

    return {
      platform: 'youtube',
      handle,
      posts: [],
      fetchedAt: new Date().toISOString(),
      error: errorMessage,
    };
  }
}
