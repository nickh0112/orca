import Anthropic from '@anthropic-ai/sdk';
import type { ExaResult } from './exa';
import type { Finding } from '@/types';
import type { BrandPartnershipReport, SocialMediaAnalysis } from '@/types/social-media';
import { extractUsername } from './utils';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Retry configuration
const ANTHROPIC_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 20, // Reduced from 50ms for higher throughput
  RETRY_DELAY: 1000, // Base delay for exponential backoff
};

/**
 * Retry wrapper with exponential backoff for Anthropic API
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = ANTHROPIC_CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check for rate limit (429) or overloaded (529) errors
      const isRetryable = lastError.message.includes('429') ||
                          lastError.message.includes('529') ||
                          lastError.message.toLowerCase().includes('rate limit') ||
                          lastError.message.toLowerCase().includes('overloaded');

      if (attempt < maxRetries && isRetryable) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = ANTHROPIC_CONFIG.RETRY_DELAY * Math.pow(2, attempt);
        console.log(`Anthropic API retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (!isRetryable) {
        // Non-retryable error, throw immediately
        throw lastError;
      }
    }
  }

  throw lastError;
}

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
    const response = await withRetry(async () => {
      return await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      });
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
    console.error('AI review failed after retries:', error);
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

      // Reduced delay to avoid rate limiting (was 100ms)
      await new Promise(resolve => setTimeout(resolve, ANTHROPIC_CONFIG.BASE_DELAY));
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
  socialLinks: string[],
  language: string = 'en'
): Promise<string> {
  const isGerman = language === 'de';

  if (findings.length === 0) {
    return isGerman
      ? 'Für diesen Creator wurden keine signifikanten Markenrisiken identifiziert. Die Suche ergab keine relevanten Ergebnisse zu Kontroversen, rechtlichen Problemen oder anderen Risikofaktoren.'
      : 'No significant brand safety concerns were identified for this creator. The search returned no relevant findings related to controversies, legal issues, or other risk factors.';
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

  const languageInstruction = isGerman
    ? 'WICHTIG: Antworte vollständig auf Deutsch.\n\n'
    : '';

  const headings = isGerman
    ? { summary: 'Zusammenfassung', concerns: 'Hauptbedenken', notes: 'Vertrauenshinweise', recommendation: 'Empfehlung' }
    : { summary: 'Summary', concerns: 'Key Concerns', notes: 'Confidence Notes', recommendation: 'Recommendation' };

  const prompt = `${languageInstruction}You are a brand safety analyst helping evaluate a content creator for potential partnership.

CREATOR INFO:
- Name: ${creatorName}
- Social handles: ${handlesStr || 'Not provided'}

FINDINGS (${findings.length} total):
${findingsSummary}

Please provide a concise analysis in this exact format:

## ${headings.summary}
[2-3 sentences summarizing the overall risk profile]

## ${headings.concerns}
[Bullet points of the most significant issues, if any. Focus on high/critical severity items]

## ${headings.notes}
[Flag any findings that may be about a different person with a similar name, or seem irrelevant to brand safety. Be specific about which findings are questionable]

## ${headings.recommendation}
[One sentence recommendation: proceed with caution, recommend further review, or safe to proceed]`;

  try {
    const response = await withRetry(async () => {
      return await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return content.text;
  } catch (error) {
    console.error('Rationale generation failed after retries:', error);
    // Return a basic fallback summary
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const uncertainCount = findings.filter(f => f.validation?.isSamePerson === 'uncertain').length;

    if (isGerman) {
      return `## ${headings.summary}
${findings.length} potenzielle Bedenken für ${creatorName} gefunden. ${criticalCount > 0 ? `${criticalCount} kritische(s) Problem(e) erfordern sofortige Aufmerksamkeit. ` : ''}${highCount > 0 ? `${highCount} Ergebnis(se) mit hohem Schweregrad erkannt. ` : ''}Manuelle Überprüfung empfohlen.

## ${headings.concerns}
${criticalCount > 0 || highCount > 0 ? '- Kritische und schwerwiegende Ergebnisse sorgfältig prüfen' : '- Keine kritischen Probleme identifiziert'}

## ${headings.notes}
${uncertainCount > 0 ? `- ${uncertainCount} Ergebnis(se) mit unsicherer Personenzuordnung - manuell überprüfen` : '- Alle Ergebnisse scheinen dem Creator zuzuordnen zu sein'}

## ${headings.recommendation}
${criticalCount > 0 ? 'Mit erheblicher Vorsicht vorgehen - kritische Probleme vorhanden.' : highCount > 0 ? 'Weitere Überprüfung vor dem Fortfahren empfohlen.' : 'Niedrigeres Risikoprofil - Standardüberprüfung empfohlen.'}`;
    }

    return `## ${headings.summary}
Found ${findings.length} potential concerns for ${creatorName}. ${criticalCount > 0 ? `${criticalCount} critical issue(s) require immediate attention. ` : ''}${highCount > 0 ? `${highCount} high-severity finding(s) detected. ` : ''}Manual review recommended.

## ${headings.concerns}
${criticalCount > 0 || highCount > 0 ? '- Review critical and high severity findings carefully' : '- No critical issues identified'}

## ${headings.notes}
${uncertainCount > 0 ? `- ${uncertainCount} finding(s) have uncertain person matching - verify these manually` : '- All findings appear to match the creator'}

## ${headings.recommendation}
${criticalCount > 0 ? 'Proceed with significant caution - critical issues present.' : highCount > 0 ? 'Recommend further review before proceeding.' : 'Lower risk profile - standard review recommended.'}`;
  }
}

/**
 * Input for comprehensive rationale generation
 */
export interface ComprehensiveRationaleInput {
  findings: Finding[];
  creatorName: string;
  socialLinks: string[];
  language: string;
  brandPartnerships?: BrandPartnershipReport;
  socialMediaAnalyses?: SocialMediaAnalysis[];
  aggregatedProfanity?: {
    hasProfanity: boolean;
    maxSeverity: number;
    matches: Array<{ word: string; severity: number; category: string }>;
    categories: string[];
  };
}

/**
 * Generate comprehensive AI rationale that incorporates all analysis data
 * Uses Claude Sonnet for better synthesis of multi-modal data
 */
export async function generateComprehensiveRationale(
  input: ComprehensiveRationaleInput
): Promise<string> {
  const {
    findings,
    creatorName,
    socialLinks,
    language,
    brandPartnerships,
    socialMediaAnalyses,
    aggregatedProfanity,
  } = input;

  const isGerman = language === 'de';

  // If no data to analyze, return a simple clean report
  if (
    findings.length === 0 &&
    (!brandPartnerships || brandPartnerships.totalPartnerships === 0) &&
    (!aggregatedProfanity || !aggregatedProfanity.hasProfanity)
  ) {
    return isGerman
      ? 'Für diesen Creator wurden keine signifikanten Markenrisiken identifiziert. Die Analyse von Web-Recherche, Social-Media-Inhalten und visueller Analyse ergab keine relevanten Bedenken.'
      : 'No significant brand safety concerns were identified for this creator. Analysis of web research, social media content, and visual analysis revealed no relevant concerns.';
  }

  const handlesStr = socialLinks
    .map(h => extractUsername(h))
    .filter(Boolean)
    .join(', ');

  // Build findings summary
  const findingsSummary = findings.length > 0
    ? findings.slice(0, 10).map((f, i) => {
        const confidence = f.validation?.confidence || 'unknown';
        const match = f.validation?.isSamePerson || 'unknown';
        return `${i + 1}. [${f.severity.toUpperCase()}] ${f.title}
   - Type: ${f.type}
   - Summary: ${f.summary.slice(0, 200)}
   - Confidence: ${confidence}, Person Match: ${match}`;
      }).join('\n\n')
    : 'No web research findings.';

  // Build brand partnerships section
  let partnershipSection = '';
  if (brandPartnerships && brandPartnerships.totalPartnerships > 0) {
    const competitorCount = brandPartnerships.competitorPartnerships.length;
    const recentPartners = brandPartnerships.timeline.slice(0, 5);

    partnershipSection = `
BRAND PARTNERSHIPS (${brandPartnerships.totalPartnerships} total, ${brandPartnerships.uniqueBrands.length} unique brands):
${competitorCount > 0 ? `⚠️ COMPETITOR PARTNERSHIPS: ${competitorCount} detected!\n${brandPartnerships.competitorPartnerships.slice(0, 3).map(p => `  - ${p.brand} (${p.partnershipType}) on ${p.platform}`).join('\n')}` : ''}
Recent partnerships:
${recentPartners.map(p => `  - ${p.brand} (${p.partnershipType}) - ${new Date(p.postDate).toLocaleDateString()} on ${p.platform}`).join('\n')}`;
  }

  // Build content safety section from social media analyses
  let contentSafetySection = '';
  if (socialMediaAnalyses && socialMediaAnalyses.length > 0) {
    const flaggedPosts = socialMediaAnalyses.flatMap(a => a.flaggedPosts);
    const highSeverityCount = flaggedPosts.filter(p => p.severity === 'high' || p.severity === 'critical').length;
    const platformSummaries = socialMediaAnalyses
      .filter(a => a.flaggedPosts.length > 0)
      .map(a => `  - ${a.platform}: ${a.flaggedPosts.length} flagged posts (${a.overallRisk} risk) - ${a.summary.slice(0, 100)}...`);

    if (platformSummaries.length > 0) {
      contentSafetySection = `
CONTENT SAFETY FLAGS (${flaggedPosts.length} posts flagged, ${highSeverityCount} high/critical):
${platformSummaries.join('\n')}`;
    }
  }

  // Build profanity section
  let profanitySection = '';
  if (aggregatedProfanity && aggregatedProfanity.hasProfanity) {
    const uniqueWords = [...new Set(aggregatedProfanity.matches.map(m => m.word))];
    profanitySection = `
PROFANITY DETECTION:
- Detected: Yes (${aggregatedProfanity.matches.length} instances)
- Max Severity: ${aggregatedProfanity.maxSeverity}/5
- Categories: ${aggregatedProfanity.categories.join(', ')}
- Sample words: ${uniqueWords.slice(0, 5).join(', ')}${uniqueWords.length > 5 ? '...' : ''}`;
  }

  const languageInstruction = isGerman
    ? 'WICHTIG: Antworte vollständig auf Deutsch.\n\n'
    : '';

  const headings = isGerman
    ? {
        summary: 'Zusammenfassung',
        concerns: 'Hauptbedenken',
        partnerships: 'Markenpartnerschaften',
        content: 'Inhaltssicherheit',
        notes: 'Vertrauenshinweise',
        recommendation: 'Empfehlung'
      }
    : {
        summary: 'Summary',
        concerns: 'Key Concerns',
        partnerships: 'Brand Partnerships',
        content: 'Content Safety',
        notes: 'Confidence Notes',
        recommendation: 'Recommendation'
      };

  const prompt = `${languageInstruction}You are a senior brand safety analyst providing a comprehensive evaluation for potential creator partnership.

CREATOR INFO:
- Name: ${creatorName}
- Social handles: ${handlesStr || 'Not provided'}

=== WEB RESEARCH FINDINGS (${findings.length} total) ===
${findingsSummary}
${partnershipSection}
${contentSafetySection}
${profanitySection}

Please provide a comprehensive analysis in this exact format:

## ${headings.summary}
[3-4 sentences providing an executive summary of the creator's brand safety profile. Include key metrics: number of partnerships, any competitor relationships, content safety flags, and overall risk assessment.]

## ${headings.concerns}
[Bullet points of the most significant issues. Prioritize: competitor partnerships, high-severity content flags, profanity concerns, and web research findings. Be specific about evidence.]

## ${headings.partnerships}
[Brief assessment of the creator's brand partnership history. Note any patterns, brand categories they work with, and any competitor relationships that could impact exclusivity.]

## ${headings.content}
[Summary of content safety analysis across platforms. Note any patterns in flagged content, severity levels, and specific concerns from visual/audio analysis.]

## ${headings.notes}
[Flag any findings that may be about a different person, seem low confidence, or need manual verification. Be specific.]

## ${headings.recommendation}
[2-3 sentences with clear recommendation: proceed, proceed with caution, or do not recommend. Justify based on the evidence above.]`;

  try {
    const response = await withRetry(async () => {
      return await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', // Use Sonnet for better synthesis
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return content.text;
  } catch (error) {
    console.error('Comprehensive rationale generation failed after retries:', error);
    // Fall back to basic generateRationale
    return generateRationale(findings, creatorName, socialLinks, language);
  }
}
