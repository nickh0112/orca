import {
  SocialMediaContent,
  SocialMediaPost,
  SocialMediaAnalysis,
  FlaggedPost,
  KeywordDetectionResult,
} from '@/types/social-media';
import type { Finding, Severity } from '@/types';
import { detectSensitiveKeywords, aggregateKeywordResults } from './keyword-detector';
import { screenPostsWithHaiku, getScreeningSummary, ScreeningResult } from './haiku-screener';
import { makeVettingDecisions, VettingResult, CreatorContext } from './vetting-agent';
import { formatVisualAnalysisForPrompt } from '@/lib/video-analysis';

// Configuration
const CONFIG = {
  MAX_POSTS_PER_BATCH: 50, // Analyze posts in batches to avoid token limits
};

/**
 * Get combined content (caption + transcript + visual analysis) for a post
 */
function getPostFullContent(post: SocialMediaPost): string {
  let content = post.caption || '';
  if (post.transcript && post.transcript.trim().length > 0) {
    content += '\n\n[TRANSCRIPT]\n' + post.transcript;
  }
  if (post.visualAnalysis) {
    content += '\n\n[VISUAL ANALYSIS]\n' + formatVisualAnalysisForPrompt(post.visualAnalysis);
  }
  return content;
}

// Two-tier analysis result
interface TwoTierAnalysisResult {
  flaggedPosts: FlaggedPost[];
  screeningResults: ScreeningResult[];
  vettingResult: VettingResult;
  keywordResults: Map<string, KeywordDetectionResult>;
}

/**
 * Run local keyword detection (no API, fast)
 */
function runKeywordDetection(
  posts: SocialMediaPost[]
): Map<string, KeywordDetectionResult> {
  const keywordResults = new Map<string, KeywordDetectionResult>();

  for (const post of posts) {
    const content = getPostFullContent(post);
    const keywordResult = detectSensitiveKeywords(content);
    keywordResults.set(post.id, keywordResult);
  }

  return keywordResults;
}

/**
 * Two-tier analysis: Haiku screens, Opus decides
 *
 * Flow:
 * 1. Local keyword detection (no API)
 * 2. Haiku screening (extract potential issues)
 * 3. Opus vetting (final decisions on flagged items)
 */
async function analyzePlatformContent(
  posts: SocialMediaPost[],
  platform: 'instagram' | 'tiktok' | 'youtube',
  handle: string,
  creatorName: string,
  language: string = 'en'
): Promise<TwoTierAnalysisResult> {
  const isGerman = language === 'de';

  if (posts.length === 0) {
    return {
      flaggedPosts: [],
      screeningResults: [],
      vettingResult: {
        decisions: [],
        overallRisk: 'low',
        summary: isGerman ? 'Keine Beiträge zur Analyse vorhanden.' : 'No posts to analyze.',
        recommendation: 'approve',
        recommendationRationale: isGerman ? 'Keine Inhalte für die Analyse verfügbar.' : 'No content available for analysis.',
      },
      keywordResults: new Map(),
    };
  }

  // Step 1: Local keyword detection (no API cost)
  console.log(`[Tier 0] Running local keyword detection for ${posts.length} ${platform} posts...`);
  const keywordResults = runKeywordDetection(posts);
  const keywordAggregated = aggregateKeywordResults(keywordResults);
  console.log(`  → ${keywordAggregated.allFlaggedTerms.length} keyword flags found`);

  // Step 2: Haiku screening (cheap, fast, conservative)
  console.log(`[Tier 1] Haiku screening ${posts.length} ${platform} posts...`);
  const screeningResults = await screenPostsWithHaiku(posts, platform, handle);
  console.log(`  → ${getScreeningSummary(screeningResults)}`);

  // Step 3: Opus vetting (expensive, final decisions)
  const creatorContext: CreatorContext = {
    name: creatorName,
    platforms: [platform],
    handle,
  };

  console.log(`[Tier 2] Opus vetting agent making final decisions...`);
  const vettingResult = await makeVettingDecisions(
    screeningResults,
    posts,
    creatorContext,
    platform,
    language
  );
  console.log(`  → ${vettingResult.decisions.length} confirmed risks, recommendation: ${vettingResult.recommendation}`);

  // Convert vetting decisions to flagged posts format
  const flaggedPosts: FlaggedPost[] = vettingResult.decisions
    .filter((d) => d.isConfirmedRisk)
    .map((decision) => {
      const originalPost = posts.find((p) => p.id === decision.postId);
      return {
        postId: decision.postId,
        caption: originalPost?.caption || '',
        permalink: originalPost?.permalink || '',
        timestamp: originalPost?.timestamp || '',
        concerns: decision.concerns,
        severity: decision.severity,
        reason: decision.reason,
        mediaUrl: originalPost?.mediaUrl,
        thumbnailUrl: originalPost?.thumbnailUrl,
        mediaType: originalPost?.mediaType,
        visualAnalysis: originalPost?.visualAnalysis,
      };
    });

  return {
    flaggedPosts,
    screeningResults,
    vettingResult,
    keywordResults,
  };
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
 * Generate summary of social media analysis (simplified for two-tier flow)
 */
function generateSummary(
  platform: string,
  handle: string,
  totalPosts: number,
  flaggedPosts: FlaggedPost[],
  keywordResults?: Map<string, KeywordDetectionResult>,
  vettingRecommendation?: string
): string {
  const parts: string[] = [];

  // Basic analysis summary
  parts.push(`Analyzed ${totalPosts} ${platform} posts for @${handle}.`);

  // Keyword detection summary
  if (keywordResults && keywordResults.size > 0) {
    const keywordAggregated = aggregateKeywordResults(keywordResults);
    if (keywordAggregated.allFlaggedTerms.length > 0) {
      parts.push(`${keywordAggregated.allFlaggedTerms.length} keyword flag(s) found.`);
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

  // Add vetting recommendation if available
  if (vettingRecommendation) {
    parts.push(`Recommendation: ${vettingRecommendation}.`);
  }

  return parts.join(' ');
}

/**
 * Main function to analyze all social media content
 * Uses two-tier flow: Haiku screening + Opus vetting
 */
export async function analyzeSocialMediaContent(
  content: SocialMediaContent[],
  creatorName: string,
  language: string = 'en'
): Promise<SocialMediaAnalysis[]> {
  const analyses: SocialMediaAnalysis[] = [];

  for (const source of content) {
    if (source.posts.length === 0) {
      console.log(`No posts to analyze for ${source.platform}/@${source.handle}`);
      continue;
    }

    console.log(
      `\n========================================\n` +
      `Analyzing ${source.posts.length} ${source.platform} posts for @${source.handle}\n` +
      `========================================`
    );

    // Run two-tier analysis (handles batching internally)
    const result = await analyzePlatformContent(
      source.posts,
      source.platform,
      source.handle,
      creatorName,
      language
    );

    // Calculate transcript and visual analysis coverage for logging
    const postsWithTranscripts = source.posts.filter(
      (p) => p.transcript && p.transcript.trim().length > 0
    ).length;
    const postsWithVisualAnalysis = source.posts.filter(
      (p) => p.visualAnalysis
    ).length;

    // Use vetting result's overall risk and recommendation
    const analysis: SocialMediaAnalysis = {
      platform: source.platform,
      handle: source.handle,
      flaggedPosts: result.flaggedPosts,
      overallRisk: result.vettingResult.overallRisk,
      summary: result.vettingResult.summary || generateSummary(
        source.platform,
        source.handle,
        source.posts.length,
        result.flaggedPosts,
        result.keywordResults,
        result.vettingResult.recommendation
      ),
    };

    analyses.push(analysis);

    // Enhanced logging
    const keywordAggregated = aggregateKeywordResults(result.keywordResults);
    const screenedCount = result.screeningResults.filter(r => r.requiresSeniorReview).length;

    console.log(
      `\n[Summary] ${source.platform}/@${source.handle}:\n` +
        `  → ${source.posts.length} posts analyzed (${postsWithTranscripts} with transcripts, ${postsWithVisualAnalysis} with visual analysis)\n` +
        `  → ${keywordAggregated.allFlaggedTerms.length} keyword flags (local detection)\n` +
        `  → ${screenedCount} posts sent to senior review (Haiku screening)\n` +
        `  → ${result.flaggedPosts.length} confirmed risks (Opus vetting)\n` +
        `  → Overall risk: ${analysis.overallRisk}\n` +
        `  → Recommendation: ${result.vettingResult.recommendation}`
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
          mediaUrl: flagged.mediaUrl,
          thumbnailUrl: flagged.thumbnailUrl,
          mediaType: flagged.mediaType,
          visualAnalysis: flagged.visualAnalysis,
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
