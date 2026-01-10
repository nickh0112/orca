import Anthropic from '@anthropic-ai/sdk';
import { ScreeningResult } from './haiku-screener';
import { SocialMediaPost } from '@/types/social-media';
import type { Severity } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Opus model for senior decision-making
const OPUS_MODEL = 'claude-opus-4-5-20251101';

// Configuration
const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// Types for vetting decisions
export interface VettingDecision {
  postId: string;
  severity: Severity;
  concerns: string[];
  reason: string;
  isConfirmedRisk: boolean;
  category: 'brand_safety' | 'legal' | 'political' | 'disclosure' | 'content' | 'other';
}

export interface VettingResult {
  decisions: VettingDecision[];
  overallRisk: Severity;
  summary: string;
  recommendation: 'approve' | 'caution' | 'review' | 'reject';
  recommendationRationale: string;
}

export interface CreatorContext {
  name: string;
  platforms: string[];
  handle: string;
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
        console.log(`Opus API retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (!isRetryable) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Format screening results for the vetting prompt
 */
function formatScreeningForVetting(
  screeningResults: ScreeningResult[],
  posts: SocialMediaPost[]
): string {
  const postMap = new Map(posts.map((p) => [p.id, p]));

  // Only include posts that need senior review
  const flaggedResults = screeningResults.filter((r) => r.requiresSeniorReview);

  if (flaggedResults.length === 0) {
    return 'No posts were flagged for senior review. All content appears clean.';
  }

  return flaggedResults
    .map((result, i) => {
      const post = postMap.get(result.postId);
      const date = post ? new Date(post.timestamp).toLocaleDateString() : 'Unknown date';

      let content = `[Flagged Item ${i + 1}]
Post ID: ${result.postId}
Date: ${date}`;

      if (result.potentialIssues.length > 0) {
        content += `\n\nPotential Issues Flagged:`;
        result.potentialIssues.forEach((issue, j) => {
          content += `\n  ${j + 1}. [${issue.type.toUpperCase()}] "${issue.text}"
     Context: ${issue.context}
     Location: ${issue.location}`;
        });
      }

      if (result.brandMentions.length > 0) {
        content += `\n\nBrand Mentions: ${result.brandMentions.join(', ')}`;
      }

      if (result.adIndicators.length > 0) {
        content += `\nAd Indicators: ${result.adIndicators.join(', ')}`;
      }

      if (result.transcriptSummary) {
        content += `\n\nTranscript Summary: ${result.transcriptSummary}`;
      }

      // Include original caption/transcript for full context
      if (post) {
        content += `\n\nOriginal Caption:\n"${post.caption.slice(0, 300)}${post.caption.length > 300 ? '...' : ''}"`;
        if (post.transcript) {
          content += `\n\nOriginal Transcript:\n"${post.transcript.slice(0, 500)}${post.transcript.length > 500 ? '...' : ''}"`;
        }
      }

      return content;
    })
    .join('\n\n---\n\n');
}

/**
 * Make final vetting decisions using Opus
 * This is the "Senior Analyst" role - confirm/reject flags and assign severity
 */
export async function makeVettingDecisions(
  screeningResults: ScreeningResult[],
  posts: SocialMediaPost[],
  creatorContext: CreatorContext,
  platform: 'instagram' | 'tiktok' | 'youtube',
  language: string = 'en'
): Promise<VettingResult> {
  const isGerman = language === 'de';

  // If nothing needs review, return clean result
  const needsReview = screeningResults.filter((r) => r.requiresSeniorReview);
  if (needsReview.length === 0) {
    return {
      decisions: [],
      overallRisk: 'low',
      summary: isGerman
        ? `${posts.length} ${platform}-Beiträge für @${creatorContext.handle} überprüft. Keine Markenrisiken identifiziert.`
        : `Reviewed ${posts.length} ${platform} posts for @${creatorContext.handle}. No brand safety concerns identified.`,
      recommendation: 'approve',
      recommendationRationale: isGerman
        ? 'Die Inhaltsüberprüfung ergab keine signifikanten Markenrisiken.'
        : 'Content review found no significant brand safety risks.',
    };
  }

  const flaggedContent = formatScreeningForVetting(screeningResults, posts);

  const languageInstruction = isGerman
    ? 'WICHTIG: Antworte vollständig auf Deutsch. Alle Textfelder (summary, reason, recommendationRationale, concerns) müssen auf Deutsch sein.\n\n'
    : '';

  const prompt = `${languageInstruction}You are a Senior Brand Safety Analyst at a talent vetting agency. A junior analyst has screened social media content and flagged potential issues for your review.

Your role:
1. REVIEW each flagged item with senior judgment
2. FILTER false positives (junior analysts are conservative - many flags may not be actual problems)
3. CONFIRM real risks and assign final severity
4. SYNTHESIZE related findings into coherent concerns
5. RECOMMEND final action for brand partnerships

CREATOR CONTEXT:
- Name: ${creatorContext.name}
- Platform: ${platform.toUpperCase()}
- Handle: @${creatorContext.handle}
- Total Posts Analyzed: ${posts.length}
- Posts Flagged for Review: ${needsReview.length}

JUNIOR ANALYST FLAGS (review each critically):
${flaggedContent}

SEVERITY LEVELS (use your senior judgment):
- "critical": Only for severe issues - hate speech, illegal activity, active lawsuits, content that would IMMEDIATELY disqualify any partnership
- "high": Significant concerns - undisclosed sponsorships, strong political content, substance promotion, content most brands would avoid
- "medium": Moderate concerns - controversial opinions, mild brand conflicts, content that some brands might flag
- "low": Minor issues - noteworthy but not dealbreakers, context-dependent concerns

IMPORTANT GUIDELINES:
- False positives are common. A brand mention is NOT automatically a problem.
- Context matters. Sarcasm, jokes, and old content may not be genuine risks.
- Consider the creator's audience and content type.
- Only flag what would ACTUALLY concern a brand partnership team.

Respond with ONLY valid JSON in this exact format:
{
  "decisions": [
    {
      "postId": "id",
      "severity": "critical" | "high" | "medium" | "low",
      "concerns": ["specific concern 1", "specific concern 2"],
      "reason": "Why this is a confirmed brand safety issue",
      "isConfirmedRisk": true,
      "category": "brand_safety" | "legal" | "political" | "disclosure" | "content" | "other"
    }
  ],
  "overallRisk": "critical" | "high" | "medium" | "low",
  "summary": "2-3 sentence summary of findings",
  "recommendation": "approve" | "caution" | "review" | "reject",
  "recommendationRationale": "Brief explanation of recommendation"
}

ONLY include posts that are CONFIRMED risks in the decisions array. Exclude false positives.
If all flags are false positives, return an empty decisions array with "approve" recommendation.`;

  try {
    const response = await withRetry(async () => {
      return await anthropic.messages.create({
        model: OPUS_MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Opus');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`No JSON found in Opus vetting response for ${platform}/@${creatorContext.handle}`);
      return getDefaultVettingResult(posts.length, platform, creatorContext.handle);
    }

    const result: VettingResult = JSON.parse(jsonMatch[0]);

    console.log(
      `Opus vetting for ${platform}/@${creatorContext.handle}: ` +
        `${result.decisions.length} confirmed risks, ` +
        `overall: ${result.overallRisk}, ` +
        `recommendation: ${result.recommendation}`
    );

    return result;
  } catch (error) {
    console.error(`Opus vetting failed for ${platform}/@${creatorContext.handle}:`, error);
    return getDefaultVettingResult(posts.length, platform, creatorContext.handle, isGerman);
  }
}

/**
 * Default result when vetting fails
 */
function getDefaultVettingResult(
  postCount: number,
  platform: string,
  handle: string,
  isGerman: boolean = false
): VettingResult {
  return {
    decisions: [],
    overallRisk: 'low',
    summary: isGerman
      ? `${postCount} ${platform}-Beiträge für @${handle} überprüft. Detaillierte Analyse konnte nicht abgeschlossen werden.`
      : `Reviewed ${postCount} ${platform} posts for @${handle}. Unable to complete detailed analysis.`,
    recommendation: 'review',
    recommendationRationale: isGerman
      ? 'Manuelle Überprüfung aufgrund von Analyseeinschränkungen empfohlen.'
      : 'Manual review recommended due to analysis limitations.',
  };
}

/**
 * Calculate overall risk from decisions
 */
export function calculateOverallRisk(decisions: VettingDecision[]): Severity {
  if (decisions.length === 0) return 'low';

  const criticalCount = decisions.filter((d) => d.severity === 'critical').length;
  const highCount = decisions.filter((d) => d.severity === 'high').length;
  const mediumCount = decisions.filter((d) => d.severity === 'medium').length;

  if (criticalCount > 0) return 'critical';
  if (highCount >= 2) return 'high';
  if (highCount >= 1 || mediumCount >= 3) return 'medium';
  return 'low';
}
