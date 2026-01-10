/**
 * Vespa client for querying existing transcripts from video-understanding-indexer
 *
 * Vespa stores social media content with transcriptions already processed.
 * This allows us to fetch existing transcripts instead of re-transcribing.
 */

// Read env vars at runtime (not module load time) to support dotenv
function getVespaConfig() {
  return {
    url: process.env.VESPA_URL,
    cert: process.env.VESPA_CERT,
    key: process.env.VESPA_KEY,
  };
}

export interface VespaPost {
  id: string;
  handle: string;
  transcription_text: string[];
  caption: string[];
  platform: 'instagram' | 'tiktok' | 'youtube';
  posted_at_ts: number;
  asset_url?: string;
  preview_url?: string;
  permalink?: string;
}

interface VespaSearchResponse {
  root: {
    id: string;
    relevance: number;
    fields?: {
      totalCount?: number;
    };
    children?: Array<{
      id: string;
      relevance: number;
      source: string;
      fields: {
        id: string;
        handle?: string;
        transcription_text?: string[];
        caption?: string[];
        platform?: string;
        posted_at_ts?: number;
        asset_url?: string;
        preview_url?: string;
        permalink?: string;
      };
    }>;
  };
}

/**
 * Check if Vespa is configured
 */
export function isVespaConfigured(): boolean {
  return !!getVespaConfig().url;
}

/**
 * Execute a YQL query against Vespa
 */
async function executeQuery(yql: string): Promise<VespaSearchResponse> {
  const config = getVespaConfig();

  if (!config.url) {
    throw new Error('VESPA_URL not configured');
  }

  const searchUrl = `${config.url}/search/`;

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      yql,
      timeout: '10s',
    }),
  };

  // For cloud Vespa with mTLS, we'd need to configure certificates
  // Node.js fetch doesn't directly support client certificates
  // For production, consider using a library like 'https' with cert options
  // or a Vespa-specific client library

  const response = await fetch(searchUrl, requestOptions);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Vespa query error:', errorText);
    throw new Error(`Vespa query failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Query Vespa for posts by creator handle
 *
 * @param handle - Creator handle (with or without @)
 * @param limit - Maximum number of posts to return
 * @param monthsBack - Number of months to look back (default: 6)
 * @returns Array of posts with transcripts
 */
export async function queryTranscriptsByHandle(
  handle: string,
  limit: number = 100,
  monthsBack: number = 6
): Promise<VespaPost[]> {
  // Normalize handle (remove @ if present)
  const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

  // Calculate cutoff timestamp (Unix seconds)
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
  const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

  // YQL query to fetch posts by handle with time filtering
  // Note: Vespa may store handles with or without @, so we try both
  const yql = `
    select id, handle, transcription_text, caption, platform, posted_at_ts, asset_url, preview_url, permalink
    from sources post
    where (handle contains "${normalizedHandle}" or handle contains "@${normalizedHandle}")
      and posted_at_ts > ${cutoffTimestamp}
    order by posted_at_ts desc
    limit ${limit}
  `.trim().replace(/\s+/g, ' ');

  try {
    const response = await executeQuery(yql);

    if (!response.root.children || response.root.children.length === 0) {
      console.log(`No Vespa results for handle: ${handle}`);
      return [];
    }

    const posts: VespaPost[] = response.root.children.map((child) => ({
      id: child.fields.id,
      handle: child.fields.handle || normalizedHandle,
      transcription_text: child.fields.transcription_text || [],
      caption: child.fields.caption || [],
      platform: (child.fields.platform || 'instagram') as VespaPost['platform'],
      posted_at_ts: child.fields.posted_at_ts || 0,
      asset_url: child.fields.asset_url,
      preview_url: child.fields.preview_url,
      permalink: child.fields.permalink,
    }));

    console.log(`Found ${posts.length} posts in Vespa for handle: ${handle}`);

    // Count posts with transcripts
    const withTranscripts = posts.filter(
      (p) => p.transcription_text && p.transcription_text.length > 0
    ).length;
    console.log(`${withTranscripts}/${posts.length} posts have transcripts`);

    return posts;
  } catch (error) {
    console.error(`Vespa query failed for handle ${handle}:`, error);
    return [];
  }
}

/**
 * Query Vespa for multiple handles at once
 *
 * @param handles - Array of handles (with or without @)
 * @returns Map of handle -> posts
 */
export async function queryTranscriptsForHandles(
  handles: Array<{ platform: string; handle: string }>,
  limit: number = 50
): Promise<Map<string, VespaPost[]>> {
  const results = new Map<string, VespaPost[]>();

  // Query each handle (could be parallelized, but keeping serial to avoid overwhelming Vespa)
  for (const { platform, handle } of handles) {
    const posts = await queryTranscriptsByHandle(handle, limit);

    // Filter by platform if specified
    const platformPosts = platform
      ? posts.filter((p) => p.platform === platform)
      : posts;

    results.set(handle, platformPosts);
  }

  return results;
}

/**
 * Get a single post by ID from Vespa
 */
export async function getPostById(id: string): Promise<VespaPost | null> {
  const yql = `
    select id, handle, transcription_text, caption, platform, posted_at_ts, asset_url, preview_url, permalink
    from sources post
    where id = "${id}"
  `.trim().replace(/\s+/g, ' ');

  try {
    const response = await executeQuery(yql);

    if (!response.root.children || response.root.children.length === 0) {
      return null;
    }

    const child = response.root.children[0];
    return {
      id: child.fields.id,
      handle: child.fields.handle || '',
      transcription_text: child.fields.transcription_text || [],
      caption: child.fields.caption || [],
      platform: (child.fields.platform || 'instagram') as VespaPost['platform'],
      posted_at_ts: child.fields.posted_at_ts || 0,
      asset_url: child.fields.asset_url,
      preview_url: child.fields.preview_url,
      permalink: child.fields.permalink,
    };
  } catch (error) {
    console.error(`Vespa query failed for post ${id}:`, error);
    return null;
  }
}

/**
 * Infer media type from Vespa post
 * Most Vespa content is video (since we transcribe videos), but images may be included
 */
function inferMediaType(post: VespaPost): 'image' | 'video' | 'carousel' {
  // If there's a transcription, it's definitely a video
  if (post.transcription_text && post.transcription_text.length > 0) {
    return 'video';
  }

  // Check URL patterns for clues
  const url = post.asset_url || post.preview_url || '';
  if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp')) {
    return 'image';
  }

  // Default to video for social media content (Instagram Reels, TikToks, YouTube)
  return 'video';
}

/**
 * Convert Vespa posts to SocialMediaContent format for use in Orca's analysis
 */
export function convertVespaPostsToSocialMediaContent(
  posts: VespaPost[],
  handle: string
): {
  platform: 'instagram' | 'tiktok' | 'youtube';
  handle: string;
  posts: Array<{
    id: string;
    caption: string;
    transcript?: string;
    permalink: string;
    timestamp: string;
    engagement: Record<string, never>;
    mediaUrl?: string;
    thumbnailUrl?: string;
    mediaType?: 'image' | 'video' | 'carousel';
  }>;
  fetchedAt: string;
  source: 'vespa';
} | null {
  if (posts.length === 0) {
    return null;
  }

  // Determine platform from posts (all should be same platform for a handle)
  const platform = posts[0].platform;

  return {
    platform,
    handle,
    posts: posts.map((post) => ({
      id: post.id,
      caption: post.caption.join(' '),
      transcript:
        post.transcription_text.length > 0
          ? post.transcription_text.join(' ')
          : undefined,
      permalink: post.permalink || '',
      timestamp: new Date(post.posted_at_ts * 1000).toISOString(),
      engagement: {}, // Vespa doesn't store engagement metrics
      mediaUrl: post.asset_url,
      thumbnailUrl: post.preview_url || post.asset_url, // Fallback to asset_url if no preview
      mediaType: inferMediaType(post),
    })),
    fetchedAt: new Date().toISOString(),
    source: 'vespa',
  };
}
