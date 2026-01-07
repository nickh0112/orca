import Anthropic from '@anthropic-ai/sdk';
import type { ExaResult } from './exa';
import type { Finding } from '@/types';
import { extractUsername } from './utils';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ValidationResult {
  isRelevant: boolean;
  isSamePerson: 'yes' | 'no' | 'uncertain';
  isRisk: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

export interface ValidatedResult extends ExaResult {
  validation: ValidationResult;
}

/**
 * Heuristic pre-filter to quickly eliminate obviously irrelevant results
 */
export function heuristicFilter(
  result: ExaResult,
  creatorName: string,
  socialHandles: string[]
): { pass: boolean; confidence: 'high' | 'medium' | 'low'; reason?: string } {
  const text = `${result.title} ${result.text || ''}`.toLowerCase();
  const url = result.url.toLowerCase();
  const nameLower = creatorName.toLowerCase();
  const nameParts = nameLower.split(' ').filter(p => p.length > 2);

  // Extract handles without @ symbol
  const handles = socialHandles.map(h => {
    const username = extractUsername(h);
    return username?.toLowerCase() || '';
  }).filter(Boolean);

  // HIGH CONFIDENCE: Social handle appears in content
  const handleInContent = handles.some(handle =>
    text.includes(handle) || text.includes(`@${handle}`)
  );

  const handleInUrl = handles.some(handle =>
    url.includes(handle)
  );

  if (handleInContent || handleInUrl) {
    return { pass: true, confidence: 'high', reason: 'Social handle found in content' };
  }

  // HIGH CONFIDENCE: Full name appears
  if (text.includes(nameLower)) {
    return { pass: true, confidence: 'high', reason: 'Full name match' };
  }

  // Check for platform context clues
  const platformTerms = [
    'influencer', 'youtuber', 'tiktoker', 'creator', 'streamer',
    'instagram', 'tiktok', 'youtube', 'twitter', 'twitch',
    'followers', 'subscribers', 'content creator', 'social media'
  ];
  const hasPlatformContext = platformTerms.some(term => text.includes(term));

  // MEDIUM CONFIDENCE: Multiple name parts + platform context
  const namePartsFound = nameParts.filter(part => text.includes(part)).length;
  if (namePartsFound >= 2 && hasPlatformContext) {
    return { pass: true, confidence: 'medium', reason: 'Name parts + platform context' };
  }

  // LOW CONFIDENCE: Just name parts, could be different person
  if (namePartsFound >= 2) {
    return { pass: true, confidence: 'low', reason: 'Name match only - needs AI review' };
  }

  // Check for common false positive patterns
  const falsePositivePatterns = [
    /\b(company|corporation|inc|llc|ltd)\b/i,
    /\b(city|county|state|government)\b/i,
    /\b(school|university|college)\b/i,
  ];

  const looksLikeFalsePositive = falsePositivePatterns.some(pattern =>
    pattern.test(result.title)
  );

  if (looksLikeFalsePositive && !hasPlatformContext) {
    return { pass: false, confidence: 'high', reason: 'Likely different entity (company/org)' };
  }

  // Single name part with no context - probably not relevant
  if (namePartsFound < 2) {
    return { pass: false, confidence: 'medium', reason: 'Insufficient name match' };
  }

  return { pass: true, confidence: 'low', reason: 'Weak match - needs verification' };
}

/**
 * AI review layer using Claude to validate results
 */
export async function aiReviewResult(
  result: ExaResult,
  creatorName: string,
  socialHandles: string[],
  platforms: string[]
): Promise<ValidationResult> {
  const handlesStr = socialHandles
    .map(h => extractUsername(h))
    .filter(Boolean)
    .join(', ');

  const prompt = `You are a research assistant helping to verify if a search result is relevant for creator vetting.

CREATOR INFO:
- Name: ${creatorName}
- Social handles: ${handlesStr || 'Not provided'}
- Platforms: ${platforms.join(', ') || 'Not specified'}

SEARCH RESULT:
- Title: ${result.title}
- URL: ${result.url}
- Content snippet: ${(result.text || '').slice(0, 1000)}
${result.publishedDate ? `- Published: ${result.publishedDate}` : ''}

QUESTIONS:
1. Is this search result about the same person (the creator/influencer named above)? Consider that common names may refer to different people.
2. Does this result describe something that could be a brand safety risk (controversy, legal issues, offensive behavior, etc.)?
3. How confident are you in this assessment?

Respond with ONLY a JSON object in this exact format:
{
  "isSamePerson": "yes" | "no" | "uncertain",
  "isRisk": true | false,
  "confidence": "high" | "medium" | "low",
  "reason": "Brief explanation"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      isRelevant: parsed.isSamePerson === 'yes' && parsed.isRisk === true,
      isSamePerson: parsed.isSamePerson,
      isRisk: parsed.isRisk,
      confidence: parsed.confidence,
      reason: parsed.reason,
    };
  } catch (error) {
    console.error('AI review failed:', error);
    // Fallback to uncertain if AI review fails
    return {
      isRelevant: true, // Include it to be safe
      isSamePerson: 'uncertain',
      isRisk: true,
      confidence: 'low',
      reason: 'AI review failed - included for manual review',
    };
  }
}

/**
 * Main validation function that combines heuristics + AI review
 */
export async function validateResults(
  results: ExaResult[],
  creatorName: string,
  socialLinks: string[]
): Promise<ValidatedResult[]> {
  const validatedResults: ValidatedResult[] = [];

  // Extract platform info from URLs
  const platforms = socialLinks.map(url => {
    if (url.includes('instagram')) return 'Instagram';
    if (url.includes('tiktok')) return 'TikTok';
    if (url.includes('youtube')) return 'YouTube';
    if (url.includes('twitter') || url.includes('x.com')) return 'Twitter/X';
    if (url.includes('twitch')) return 'Twitch';
    return '';
  }).filter(Boolean);

  for (const result of results) {
    // Step 1: Heuristic pre-filter
    const heuristic = heuristicFilter(result, creatorName, socialLinks);

    // If heuristics say definitely not relevant, skip AI review
    if (!heuristic.pass && heuristic.confidence === 'high') {
      continue; // Skip this result entirely
    }

    // Step 2: For high-confidence heuristic matches, skip AI review
    if (heuristic.pass && heuristic.confidence === 'high') {
      validatedResults.push({
        ...result,
        validation: {
          isRelevant: true,
          isSamePerson: 'yes',
          isRisk: true,
          confidence: 'high',
          reason: heuristic.reason,
        },
      });
      continue;
    }

    // Step 3: For medium/low confidence, use AI review
    try {
      const aiValidation = await aiReviewResult(
        result,
        creatorName,
        socialLinks,
        platforms
      );

      // Only include if AI says it's the same person and a risk
      if (aiValidation.isSamePerson !== 'no') {
        validatedResults.push({
          ...result,
          validation: aiValidation,
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Validation error for result:', result.url, error);
      // Include with low confidence if validation fails
      validatedResults.push({
        ...result,
        validation: {
          isRelevant: true,
          isSamePerson: 'uncertain',
          isRisk: true,
          confidence: 'low',
          reason: 'Validation error - needs manual review',
        },
      });
    }
  }

  return validatedResults;
}

/**
 * Generate AI rationale summary for findings
 */
export async function generateRationale(
  findings: Finding[],
  creatorName: string,
  socialLinks: string[]
): Promise<string> {
  if (findings.length === 0) {
    return 'No significant brand safety concerns were identified for this creator. The search returned no relevant findings related to controversies, legal issues, or other risk factors.';
  }

  const handlesStr = socialLinks
    .map(h => extractUsername(h))
    .filter(Boolean)
    .join(', ');

  // Summarize findings for the prompt
  const findingsSummary = findings.map((f, i) => {
    const confidence = f.validation?.confidence || 'unknown';
    const match = f.validation?.isSamePerson || 'unknown';
    return `${i + 1}. [${f.severity.toUpperCase()}] ${f.title}
   - Type: ${f.type}
   - Summary: ${f.summary.slice(0, 200)}
   - Source: ${f.source.url}
   - Confidence: ${confidence}, Person Match: ${match}
   ${f.validation?.reason ? `- Note: ${f.validation.reason}` : ''}`;
  }).join('\n\n');

  const prompt = `You are a brand safety analyst helping evaluate a content creator for potential partnership.

CREATOR INFO:
- Name: ${creatorName}
- Social handles: ${handlesStr || 'Not provided'}

FINDINGS (${findings.length} total):
${findingsSummary}

Please provide a concise analysis in this exact format:

## Summary
[2-3 sentences summarizing the overall risk profile]

## Key Concerns
[Bullet points of the most significant issues, if any. Focus on high/critical severity items]

## Confidence Notes
[Flag any findings that may be about a different person with a similar name, or seem irrelevant to brand safety. Be specific about which findings are questionable]

## Recommendation
[One sentence recommendation: proceed with caution, recommend further review, or safe to proceed]`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return content.text;
  } catch (error) {
    console.error('Rationale generation failed:', error);
    // Return a basic fallback summary
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const uncertainCount = findings.filter(f => f.validation?.isSamePerson === 'uncertain').length;

    return `## Summary
Found ${findings.length} potential concerns for ${creatorName}. ${criticalCount > 0 ? `${criticalCount} critical issue(s) require immediate attention. ` : ''}${highCount > 0 ? `${highCount} high-severity finding(s) detected. ` : ''}Manual review recommended.

## Key Concerns
${criticalCount > 0 || highCount > 0 ? '- Review critical and high severity findings carefully' : '- No critical issues identified'}

## Confidence Notes
${uncertainCount > 0 ? `- ${uncertainCount} finding(s) have uncertain person matching - verify these manually` : '- All findings appear to match the creator'}

## Recommendation
${criticalCount > 0 ? 'Proceed with significant caution - critical issues present.' : highCount > 0 ? 'Recommend further review before proceeding.' : 'Lower risk profile - standard review recommended.'}`;
  }
}
