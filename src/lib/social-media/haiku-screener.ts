import Anthropic from '@anthropic-ai/sdk';
import { SocialMediaPost } from '@/types/social-media';
import { formatVisualAnalysisForPrompt } from '@/lib/video-analysis';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Haiku model for fast, cheap screening
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Configuration
const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  MAX_POSTS_PER_BATCH: 50,
};

// Types for screening results
export interface PotentialIssue {
  type: 'profanity' | 'controversial' | 'political' | 'brand_mention' | 'adult_content' | 'violence' | 'legal' | 'misinformation' | 'visual' | 'other';
  text: string;
  context: string;
  location: 'caption' | 'transcript' | 'visual';
}

export interface ScreeningResult {
  postId: string;
  potentialIssues: PotentialIssue[];
  transcriptSummary?: string;
  brandMentions: string[];
  adIndicators: string[];
  requiresSeniorReview: boolean;
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetryable =
        lastError.message.includes('429') ||
        lastError.message.includes('529') ||
        lastError.message.toLowerCase().includes('rate limit') ||
        lastError.message.toLowerCase().includes('overloaded');

      if (attempt < maxRetries && isRetryable) {
        const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt);
        console.log(`Haiku API retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (!isRetryable) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Format posts for the screening prompt
 */
function formatPostsForScreening(posts: SocialMediaPost[]): string {
  return posts
    .map((post, i) => {
      const date = new Date(post.timestamp).toLocaleDateString();

      let content = `[Post ${i + 1}]
ID: ${post.id}
Date: ${date}
Caption: ${post.caption.slice(0, 500)}${post.caption.length > 500 ? '...' : ''}`;

      if (post.transcript && post.transcript.trim().length > 0) {
        const truncatedTranscript = post.transcript.slice(0, 1000);
        content += `
Transcript: ${truncatedTranscript}${post.transcript.length > 1000 ? '...' : ''}`;
      }

      // Include visual analysis if available (from Twelve Labs)
      if (post.visualAnalysis) {
        content += `
Visual Analysis:
${formatVisualAnalysisForPrompt(post.visualAnalysis)}`;
      }

      return content;
    })
    .join('\n\n---\n\n');
}

/**
 * Screen a batch of posts with Haiku to extract potential issues
 * This is the "Junior Analyst" role - identify what MIGHT be concerning
 */
export async function screenPostsWithHaiku(
  posts: SocialMediaPost[],
  platform: 'instagram' | 'tiktok' | 'youtube',
  handle: string
): Promise<ScreeningResult[]> {
  if (posts.length === 0) {
    return [];
  }

  const allResults: ScreeningResult[] = [];

  // Process in batches
  for (let i = 0; i < posts.length; i += CONFIG.MAX_POSTS_PER_BATCH) {
    const batch = posts.slice(i, i + CONFIG.MAX_POSTS_PER_BATCH);
    const batchResults = await screenBatch(batch, platform, handle);
    allResults.push(...batchResults);
  }

  return allResults;
}

/**
 * Screen a single batch of posts
 */
async function screenBatch(
  posts: SocialMediaPost[],
  platform: string,
  handle: string
): Promise<ScreeningResult[]> {
  const postsText = formatPostsForScreening(posts);

  const prompt = `You are a Junior Brand Safety Analyst. Your job is to SCREEN social media content and FLAG anything that MIGHT be a concern. Be conservative - it's better to flag something for senior review than to miss it.

PLATFORM: ${platform.toUpperCase()}
HANDLE: @${handle}
POSTS TO SCREEN: ${posts.length}

${postsText}

For each post, extract:
1. **Potential Issues** - Anything that MIGHT be concerning:
   - Profanity or offensive language
   - Controversial statements or opinions
   - Political content or endorsements
   - Brand mentions (any brand names)
   - Adult content references
   - Violence or threatening language
   - Legal issues (lawsuits, arrests, disputes)
   - Misinformation claims
   - Inappropriate visual content (if visual analysis provided)
   - Rude gestures or offensive actions (from visual analysis)
   - Competitor logos/products visible (from visual analysis)
   - Other potentially problematic content

2. **Brand Mentions** - List ALL brand names mentioned (from caption, transcript, AND visual analysis)
   - Include brands detected via logo recognition with their timestamps if available
   - Note which brands appear to be sponsors (marked [LIKELY SPONSOR] in visual analysis)
   - Flag any brands that could be competitors (prominent placement of other companies)

3. **Ad Indicators** - Any signs of sponsored content:
   - #ad, #sponsored, #gifted, #partner
   - "Thanks to [brand]", "partnered with", "use code"
   - Brands marked as [LIKELY SPONSOR] in visual analysis (prominent logo placement)
   - Multiple appearances of the same brand logo

4. **Transcript Summary** - If transcript exists, 1-2 sentence summary of what they're saying

5. **Visual Concerns** - If visual analysis is provided, note any concerning:
   - ALL detected brand logos with their time ranges (e.g., "Nike visible at 0:05-0:12")
   - Brands marked as sponsors due to prominent placement
   - Potential competitor brands that should be flagged
   - Inappropriate actions or gestures
   - Concerning scene context or settings
   - On-screen text that's problematic

DO NOT assign severity levels - that's the senior analyst's job. Just flag what MIGHT need review.

Respond with ONLY a JSON array. For posts with no concerns, still include them with empty potentialIssues.

Format:
[
  {
    "postId": "id_from_above",
    "potentialIssues": [
      {
        "type": "profanity" | "controversial" | "political" | "brand_mention" | "adult_content" | "violence" | "legal" | "misinformation" | "visual" | "other",
        "text": "the exact problematic text or visual element",
        "context": "brief context explaining why flagged",
        "location": "caption" | "transcript" | "visual"
      }
    ],
    "transcriptSummary": "brief summary if transcript exists",
    "brandMentions": ["Nike", "Apple", etc],
    "adIndicators": ["#ad", "partnered with X", etc],
    "requiresSeniorReview": true/false
  }
]

Set requiresSeniorReview to true if there are any potentialIssues, brand mentions with ad indicators, visual safety concerns, or anything else that warrants a closer look.`;

  try {
    const response = await withRetry(async () => {
      return await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Haiku');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log(`No JSON array found in Haiku screening response for ${platform}/@${handle}`);
      // Return default results for all posts
      return posts.map((post) => ({
        postId: post.id,
        potentialIssues: [],
        brandMentions: [],
        adIndicators: [],
        requiresSeniorReview: false,
      }));
    }

    const results: ScreeningResult[] = JSON.parse(jsonMatch[0]);

    // Ensure all posts have results
    const resultMap = new Map(results.map((r) => [r.postId, r]));
    return posts.map((post) => {
      const result = resultMap.get(post.id);
      if (result) {
        return result;
      }
      return {
        postId: post.id,
        potentialIssues: [],
        brandMentions: [],
        adIndicators: [],
        requiresSeniorReview: false,
      };
    });
  } catch (error) {
    console.error(`Haiku screening failed for ${platform}/@${handle}:`, error);
    // Return default results on error
    return posts.map((post) => ({
      postId: post.id,
      potentialIssues: [],
      brandMentions: [],
      adIndicators: [],
      requiresSeniorReview: false,
    }));
  }
}

/**
 * Get screening summary for logging
 */
export function getScreeningSummary(results: ScreeningResult[]): string {
  const needsReview = results.filter((r) => r.requiresSeniorReview).length;
  const totalIssues = results.reduce((sum, r) => sum + r.potentialIssues.length, 0);
  const totalBrands = new Set(results.flatMap((r) => r.brandMentions)).size;

  return `Screened ${results.length} posts: ${needsReview} need senior review, ${totalIssues} potential issues, ${totalBrands} unique brands`;
}
