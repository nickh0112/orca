import Anthropic from '@anthropic-ai/sdk';
import {
  SocialMediaContent,
  SocialMediaPost,
  SocialMediaAnalysis,
  FlaggedPost,
  BrandDetectionResult,
  KeywordDetectionResult,
} from '@/types/social-media';
import type { Finding, Severity } from '@/types';
import { detectBrands, aggregateBrands } from './brand-detector';
import { detectSensitiveKeywords, aggregateKeywordResults } from './keyword-detector';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Retry configuration
const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  MAX_POSTS_PER_BATCH: 50, // Analyze posts in batches to avoid token limits
};

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
        console.log(`Claude API retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (!isRetryable) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Format posts for the analysis prompt (includes transcripts when available)
 */
function formatPostsForPrompt(posts: SocialMediaPost[]): string {
  return posts
    .map((post, i) => {
      const date = new Date(post.timestamp).toLocaleDateString();
      const engagement = [
        post.engagement.likes && `${post.engagement.likes} likes`,
        post.engagement.comments && `${post.engagement.comments} comments`,
        post.engagement.views && `${post.engagement.views} views`,
        post.engagement.shares && `${post.engagement.shares} shares`,
      ]
        .filter(Boolean)
        .join(', ');

      let content = `[Post ${i + 1}] (${date}${engagement ? ` | ${engagement}` : ''})
ID: ${post.id}
URL: ${post.permalink}
Caption: ${post.caption.slice(0, 500)}${post.caption.length > 500 ? '...' : ''}`;

      // Include transcript if available (truncate for token limits)
      if (post.transcript && post.transcript.trim().length > 0) {
        const truncatedTranscript = post.transcript.slice(0, 1000);
        content += `\nTranscript: ${truncatedTranscript}${post.transcript.length > 1000 ? '...' : ''}`;
      }

      return content;
    })
    .join('\n\n');
}

/**
 * Get combined content (caption + transcript) for a post
 */
function getPostFullContent(post: SocialMediaPost): string {
  let content = post.caption || '';
  if (post.transcript && post.transcript.trim().length > 0) {
    content += '\n\n' + post.transcript;
  }
  return content;
}

// Enhanced batch analysis result
interface EnhancedBatchResult {
  flaggedPosts: FlaggedPost[];
  brandResults: Map<string, BrandDetectionResult>;
  keywordResults: Map<string, KeywordDetectionResult>;
}

/**
 * Run pre-analysis detection (keywords + brands) before Claude analysis
 */
async function runPreAnalysisDetection(
  posts: SocialMediaPost[],
  platform: 'instagram' | 'tiktok' | 'youtube'
): Promise<{
  brandResults: Map<string, BrandDetectionResult>;
  keywordResults: Map<string, KeywordDetectionResult>;
}> {
  const brandResults = new Map<string, BrandDetectionResult>();
  const keywordResults = new Map<string, KeywordDetectionResult>();

  // Run keyword detection (local, fast) for all posts
  for (const post of posts) {
    const content = getPostFullContent(post);
    const keywordResult = detectSensitiveKeywords(content);
    keywordResults.set(post.id, keywordResult);
  }

  // Run brand detection (Claude API) - process sequentially to avoid rate limits
  for (const post of posts) {
    const content = getPostFullContent(post);
    try {
      const brandResult = await detectBrands(content, platform);
      brandResults.set(post.id, brandResult);
    } catch (error) {
      console.error(`Brand detection failed for post ${post.id}:`, error);
      brandResults.set(post.id, {
        isAd: false,
        adIndicators: [],
        brands: [],
        summary: 'Brand detection failed',
      });
    }
    // Small delay between API calls
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { brandResults, keywordResults };
}

/**
 * Format pre-analysis results for the prompt
 */
function formatPreAnalysisForPrompt(
  posts: SocialMediaPost[],
  brandResults: Map<string, BrandDetectionResult>,
  keywordResults: Map<string, KeywordDetectionResult>
): string {
  const parts: string[] = [];

  // Aggregate keyword flags
  const keywordAggregated = aggregateKeywordResults(keywordResults);
  if (keywordAggregated.allFlaggedTerms.length > 0) {
    parts.push(`KEYWORD FLAGS DETECTED: ${keywordAggregated.allFlaggedTerms.join(', ')}`);
    parts.push(`Keyword severity breakdown - Critical: ${keywordAggregated.severityCounts.critical}, High: ${keywordAggregated.severityCounts.high}, Medium: ${keywordAggregated.severityCounts.medium}, Low: ${keywordAggregated.severityCounts.low}`);
  }

  // Aggregate brand mentions
  const brandAggregated = aggregateBrands(brandResults);
  if (brandAggregated.allBrands.length > 0) {
    parts.push(`BRANDS MENTIONED: ${brandAggregated.allBrands.join(', ')}`);
    if (brandAggregated.sponsoredBrands.length > 0) {
      parts.push(`SPONSORED/AD CONTENT DETECTED for brands: ${brandAggregated.sponsoredBrands.join(', ')}`);
    }
  }

  // Per-post details for high-severity flags
  for (const post of posts) {
    const keywords = keywordResults.get(post.id);
    const brands = brandResults.get(post.id);

    const postFlags: string[] = [];

    if (keywords && keywords.overallRisk !== 'low') {
      postFlags.push(`Keywords: ${keywords.flaggedTerms.join(', ')} (${keywords.overallRisk} risk)`);
    }

    if (brands && brands.isAd) {
      postFlags.push(`Ad indicators: ${brands.adIndicators.join(', ')}`);
    }

    if (postFlags.length > 0) {
      parts.push(`Post ${post.id}: ${postFlags.join('; ')}`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : 'No pre-analysis flags detected.';
}

/**
 * Analyze social media posts for brand safety concerns using Claude Opus 4.5
 * Enhanced with transcript, brand detection, and keyword detection
 */
async function analyzePostsBatch(
  posts: SocialMediaPost[],
  platform: 'instagram' | 'tiktok' | 'youtube',
  handle: string,
  creatorName: string
): Promise<EnhancedBatchResult> {
  if (posts.length === 0) {
    return {
      flaggedPosts: [],
      brandResults: new Map(),
      keywordResults: new Map(),
    };
  }

  // Step 1: Run pre-analysis detection (keywords + brands)
  console.log(`Running pre-analysis detection for ${posts.length} ${platform} posts...`);
  const { brandResults, keywordResults } = await runPreAnalysisDetection(posts, platform);

  // Step 2: Format posts and pre-analysis for Claude
  const postsText = formatPostsForPrompt(posts);
  const preAnalysisText = formatPreAnalysisForPrompt(posts, brandResults, keywordResults);

  const prompt = `You are a brand safety analyst reviewing a creator's social media content for potential brand partnership risks.

CREATOR: ${creatorName}
PLATFORM: ${platform.toUpperCase()}
HANDLE: @${handle}

PRE-ANALYSIS DETECTION RESULTS:
${preAnalysisText}

POSTS TO ANALYZE (${posts.length} posts):
${postsText}

Using BOTH the pre-analysis results AND your own analysis, evaluate each post for brand safety concerns including:
- Offensive or controversial language (slurs, hate speech, discriminatory content)
- Strong political statements or partisan content
- Adult content references or suggestive material
- Drug or alcohol references (especially promoting substance use)
- Violence or threatening content
- Potential legal issues (defamation, copyright, illegal activity)
- Brand conflicts or negative brand mentions (consider the detected brands above)
- Undisclosed sponsored content (if brands detected but no disclosure)
- Misinformation or conspiracy theories
- Harassment or bullying behavior

Pay special attention to:
1. Content in TRANSCRIPTS (spoken words in videos) - these often reveal more than captions
2. KEYWORD FLAGS from pre-analysis - investigate these in context
3. BRAND MENTIONS - especially undisclosed sponsorships or brand conflicts

For each post with concerns, assign a severity level:
- "critical": Hate speech, illegal activity, severe controversies that would immediately disqualify partnership
- "high": Strong political content, adult themes, drug promotion, undisclosed sponsorships, significant brand safety risk
- "medium": Moderate concerns that warrant attention (mild profanity, controversial opinions, minor brand conflicts)
- "low": Minor concerns that are noteworthy but not dealbreakers

Respond with ONLY a JSON array of flagged posts. If no concerns are found, return an empty array [].

Format:
[
  {
    "postId": "post_id_from_above",
    "concerns": ["specific concern 1", "specific concern 2"],
    "severity": "low" | "medium" | "high" | "critical",
    "reason": "Brief explanation of why this is a brand safety concern"
  }
]`;

  try {
    const response = await withRetry(async () => {
      return await anthropic.messages.create({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log(`No JSON array found in Claude response for ${platform}/@${handle}`);
      return { flaggedPosts: [], brandResults, keywordResults };
    }

    const flaggedPosts: Array<{
      postId: string;
      concerns: string[];
      severity: 'low' | 'medium' | 'high' | 'critical';
      reason: string;
    }> = JSON.parse(jsonMatch[0]);

    // Enrich flagged posts with full post data
    const enrichedFlaggedPosts = flaggedPosts.map((flagged) => {
      const originalPost = posts.find((p) => p.id === flagged.postId);
      return {
        postId: flagged.postId,
        caption: originalPost?.caption || '',
        permalink: originalPost?.permalink || '',
        timestamp: originalPost?.timestamp || '',
        concerns: flagged.concerns,
        severity: flagged.severity,
        reason: flagged.reason,
      };
    });

    return {
      flaggedPosts: enrichedFlaggedPosts,
      brandResults,
      keywordResults,
    };
  } catch (error) {
    console.error(`Social media analysis failed for ${platform}/@${handle}:`, error);
    return { flaggedPosts: [], brandResults, keywordResults };
  }
}

/**
 * Calculate overall risk level from flagged posts
 */
function calculateOverallRisk(
  flaggedPosts: FlaggedPost[]
): 'low' | 'medium' | 'high' | 'critical' {
  if (flaggedPosts.length === 0) return 'low';

  const criticalCount = flaggedPosts.filter((p) => p.severity === 'critical').length;
  const highCount = flaggedPosts.filter((p) => p.severity === 'high').length;
  const mediumCount = flaggedPosts.filter((p) => p.severity === 'medium').length;

  if (criticalCount > 0) return 'critical';
  if (highCount >= 2) return 'high';
  if (highCount >= 1 || mediumCount >= 3) return 'medium';
  return 'low';
}

/**
 * Generate enhanced summary of social media analysis
 */
function generateSummary(
  platform: string,
  handle: string,
  totalPosts: number,
  flaggedPosts: FlaggedPost[],
  brandResults?: Map<string, BrandDetectionResult>,
  keywordResults?: Map<string, KeywordDetectionResult>
): string {
  const parts: string[] = [];

  // Basic analysis summary
  parts.push(`Analyzed ${totalPosts} ${platform} posts for @${handle}.`);

  // Brand detection summary
  if (brandResults && brandResults.size > 0) {
    const brandAggregated = aggregateBrands(brandResults);
    if (brandAggregated.allBrands.length > 0) {
      parts.push(`Detected ${brandAggregated.allBrands.length} brand(s) mentioned.`);
      if (brandAggregated.hasAds) {
        parts.push(`Sponsored content detected.`);
      }
    }
  }

  // Keyword detection summary
  if (keywordResults && keywordResults.size > 0) {
    const keywordAggregated = aggregateKeywordResults(keywordResults);
    if (keywordAggregated.allFlaggedTerms.length > 0) {
      parts.push(`${keywordAggregated.allFlaggedTerms.length} keyword flag(s) found (${keywordAggregated.overallRisk} risk).`);
    }
  }

  // Flagged posts summary
  if (flaggedPosts.length === 0) {
    parts.push('No brand safety concerns identified.');
  } else {
    const severityCounts = {
      critical: flaggedPosts.filter((p) => p.severity === 'critical').length,
      high: flaggedPosts.filter((p) => p.severity === 'high').length,
      medium: flaggedPosts.filter((p) => p.severity === 'medium').length,
      low: flaggedPosts.filter((p) => p.severity === 'low').length,
    };

    const concernParts = [`Found ${flaggedPosts.length} post(s) with concerns:`];
    if (severityCounts.critical > 0) concernParts.push(`${severityCounts.critical} critical`);
    if (severityCounts.high > 0) concernParts.push(`${severityCounts.high} high`);
    if (severityCounts.medium > 0) concernParts.push(`${severityCounts.medium} medium`);
    if (severityCounts.low > 0) concernParts.push(`${severityCounts.low} low`);

    parts.push(concernParts.join(' '));
  }

  return parts.join(' ');
}

/**
 * Main function to analyze all social media content
 * Enhanced with brand detection and keyword detection
 */
export async function analyzeSocialMediaContent(
  content: SocialMediaContent[],
  creatorName: string
): Promise<SocialMediaAnalysis[]> {
  const analyses: SocialMediaAnalysis[] = [];

  for (const source of content) {
    if (source.posts.length === 0) {
      console.log(`No posts to analyze for ${source.platform}/@${source.handle}`);
      continue;
    }

    console.log(
      `Analyzing ${source.posts.length} ${source.platform} posts for @${source.handle}`
    );

    // Track all results across batches
    const allFlaggedPosts: FlaggedPost[] = [];
    const allBrandResults = new Map<string, BrandDetectionResult>();
    const allKeywordResults = new Map<string, KeywordDetectionResult>();

    // Analyze posts in batches to avoid token limits
    for (let i = 0; i < source.posts.length; i += CONFIG.MAX_POSTS_PER_BATCH) {
      const batch = source.posts.slice(i, i + CONFIG.MAX_POSTS_PER_BATCH);
      const result = await analyzePostsBatch(
        batch,
        source.platform,
        source.handle,
        creatorName
      );

      // Aggregate results from batch
      allFlaggedPosts.push(...result.flaggedPosts);
      for (const [id, brandResult] of result.brandResults) {
        allBrandResults.set(id, brandResult);
      }
      for (const [id, keywordResult] of result.keywordResults) {
        allKeywordResults.set(id, keywordResult);
      }
    }

    // Calculate transcript coverage for logging
    const postsWithTranscripts = source.posts.filter(
      (p) => p.transcript && p.transcript.trim().length > 0
    ).length;

    const analysis: SocialMediaAnalysis = {
      platform: source.platform,
      handle: source.handle,
      flaggedPosts: allFlaggedPosts,
      overallRisk: calculateOverallRisk(allFlaggedPosts),
      summary: generateSummary(
        source.platform,
        source.handle,
        source.posts.length,
        allFlaggedPosts,
        allBrandResults,
        allKeywordResults
      ),
    };

    analyses.push(analysis);

    // Enhanced logging
    const brandAggregated = aggregateBrands(allBrandResults);
    const keywordAggregated = aggregateKeywordResults(allKeywordResults);

    console.log(
      `${source.platform}/@${source.handle}: ` +
        `${allFlaggedPosts.length} flagged posts, ` +
        `risk: ${analysis.overallRisk}, ` +
        `${postsWithTranscripts}/${source.posts.length} with transcripts, ` +
        `${brandAggregated.allBrands.length} brands detected, ` +
        `${keywordAggregated.allFlaggedTerms.length} keyword flags`
    );
  }

  return analyses;
}

/**
 * Convert social media analysis to Orca findings format
 */
export function convertAnalysisToFindings(
  analyses: SocialMediaAnalysis[]
): Finding[] {
  const findings: Finding[] = [];

  for (const analysis of analyses) {
    for (const flagged of analysis.flaggedPosts) {
      const finding: Finding = {
        type: 'social_post',
        title: `${analysis.platform.charAt(0).toUpperCase() + analysis.platform.slice(1)} Post - ${flagged.concerns[0] || 'Content Concern'}`,
        summary: `${flagged.reason}\n\nPost excerpt: "${flagged.caption.slice(0, 200)}${flagged.caption.length > 200 ? '...' : ''}"`,
        severity: flagged.severity as Severity,
        source: {
          url: flagged.permalink,
          title: `@${analysis.handle} on ${analysis.platform}`,
          publishedDate: flagged.timestamp,
        },
        validation: {
          isSamePerson: 'yes',
          confidence: 'high',
          reason: 'Direct content from creator\'s own social media account',
        },
        socialMediaSource: {
          platform: analysis.platform,
          handle: analysis.handle,
          postId: flagged.postId,
        },
      };

      findings.push(finding);
    }
  }

  return findings;
}

/**
 * Get a summary of all social media analyses
 */
export function getSocialMediaAnalysisSummary(
  analyses: SocialMediaAnalysis[]
): string {
  if (analyses.length === 0) {
    return 'No social media content was analyzed.';
  }

  const summaries = analyses.map((a) => a.summary);
  const totalFlagged = analyses.reduce((sum, a) => sum + a.flaggedPosts.length, 0);

  if (totalFlagged === 0) {
    return `Social media analysis complete. ${summaries.join(' ')}`;
  }

  const highestRisk = analyses.reduce((max, a) => {
    const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    return riskOrder[a.overallRisk] > riskOrder[max] ? a.overallRisk : max;
  }, 'low' as 'low' | 'medium' | 'high' | 'critical');

  return `Social media analysis found ${totalFlagged} post(s) with concerns (highest risk: ${highestRisk}). ${summaries.join(' ')}`;
}
