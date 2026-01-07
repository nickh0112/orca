import type { Finding, FindingType, Severity, RiskLevel, FindingValidation } from '@/types';
import type { ExaResult } from './exa';
import type { ValidatedResult } from './result-validator';

// Analyze pre-validated results (preferred)
export function analyzeValidatedResults(results: ValidatedResult[], creatorName: string): Finding[] {
  return results.map((r) => ({
    type: categorizeResult(r),
    title: r.title,
    summary: extractSummary(r.text || '', creatorName),
    severity: determineSeverity(r),
    source: {
      url: r.url,
      title: r.title,
      publishedDate: r.publishedDate,
    },
    validation: {
      isSamePerson: r.validation.isSamePerson,
      confidence: r.validation.confidence,
      reason: r.validation.reason,
    } as FindingValidation,
  }));
}

// Legacy function for backwards compatibility (uses basic filtering)
export function analyzeResults(results: ExaResult[], creatorName: string): Finding[] {
  return results
    .filter((r) => isRelevantResult(r, creatorName))
    .map((r) => ({
      type: categorizeResult(r),
      title: r.title,
      summary: extractSummary(r.text || '', creatorName),
      severity: determineSeverity(r),
      source: {
        url: r.url,
        title: r.title,
        publishedDate: r.publishedDate,
      },
    }));
}

// Check if result is from a social platform (for display purposes)
export function isSocialMediaSource(url: string): boolean {
  return (
    url.includes('instagram.com') ||
    url.includes('tiktok.com') ||
    url.includes('twitter.com') ||
    url.includes('x.com') ||
    url.includes('reddit.com')
  );
}

function isRelevantResult(result: ExaResult, creatorName: string): boolean {
  const text = `${result.title} ${result.text || ''}`.toLowerCase();
  const nameParts = creatorName.toLowerCase().split(' ');

  // Check if any part of the name appears in the result
  const hasName = nameParts.some((part) => part.length > 2 && text.includes(part));

  // Check for controversy-related content (expanded list)
  const relevantTerms = [
    // Legal/Criminal
    'lawsuit', 'sued', 'court', 'legal', 'arrested', 'criminal',
    'convicted', 'investigation', 'restraining order', 'settlement',
    // Platform actions
    'banned', 'suspended', 'demonetized', 'terminated', 'removed',
    // Fraud/Scam
    'scam', 'fraud', 'ftc', 'undisclosed',
    // Brand issues
    'dropped', 'partnership ended', 'sponsorship',
    // Harassment/Abuse
    'harassment', 'bullying', 'abuse', 'toxic', 'hostile',
    // Offensive content
    'racist', 'offensive', 'slur', 'antisemitic', 'homophobic', 'sexist',
    // General controversy
    'controversy', 'scandal', 'allegations', 'accused', 'fired',
    'cancelled', 'apology', 'backlash', 'outrage', 'problematic',
    'boycott', 'called out',
  ];

  const hasRelevantContent = relevantTerms.some((term) => text.includes(term));

  return hasName && hasRelevantContent;
}

function categorizeResult(result: ExaResult): FindingType {
  const text = `${result.title} ${result.text || ''}`.toLowerCase();
  const url = result.url.toLowerCase();

  // Check URL for platform-specific categorization
  if (url.includes('reddit.com')) {
    return 'reddit_mention';
  }

  if (
    url.includes('instagram.com') ||
    url.includes('tiktok.com') ||
    url.includes('twitter.com') ||
    url.includes('x.com')
  ) {
    return 'social_post';
  }

  // Content-based categorization
  if (/court|lawsuit|sued|legal|settlement|judge|verdict|arrested|criminal|convicted|restraining order/.test(text)) {
    return 'court_case';
  }

  if (/twitter|tweet|instagram|tiktok|post|video|clip|caption/.test(text)) {
    return 'social_controversy';
  }

  return 'news_article';
}

function determineSeverity(result: ExaResult): Severity {
  const text = `${result.title} ${result.text || ''}`.toLowerCase();

  const criticalTerms = [
    'criminal',
    'arrest',
    'felony',
    'assault',
    'abuse',
    'harassment',
    'fraud',
    'convicted',
    'rape',
    'sexual assault',
    'child',
    'minor',
    'trafficking',
    'murder',
    'manslaughter',
  ];

  const highTerms = [
    'lawsuit',
    'court',
    'sued',
    'fired',
    'terminated',
    'racist',
    'sexist',
    'homophobic',
    'antisemitic',
    'slur',
    'blackface',
    'scam',
    'banned',
    'suspended',
    'restraining order',
    'domestic violence',
    'ftc',
    'investigation',
  ];

  const mediumTerms = [
    'controversy',
    'scandal',
    'backlash',
    'cancelled',
    'outrage',
    'problematic',
    'offensive',
    'allegations',
    'accused',
    'dropped',
    'demonetized',
    'apology',
    'toxic',
    'bullying',
  ];

  if (criticalTerms.some((term) => text.includes(term))) return 'critical';
  if (highTerms.some((term) => text.includes(term))) return 'high';
  if (mediumTerms.some((term) => text.includes(term))) return 'medium';
  return 'low';
}

function extractSummary(text: string, creatorName: string): string {
  if (!text) return '';

  // Find sentences containing the creator name
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
  const nameParts = creatorName.toLowerCase().split(' ');

  const relevantSentences = sentences.filter((s) =>
    nameParts.some((part) => part.length > 2 && s.toLowerCase().includes(part))
  );

  if (relevantSentences.length > 0) {
    return relevantSentences.slice(0, 2).join('. ').trim() + '.';
  }

  // Fallback to first few sentences
  return sentences.slice(0, 2).join('. ').trim() + '.';
}

export function calculateRiskLevel(findings: Finding[]): RiskLevel {
  if (findings.length === 0) return 'LOW';

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;

  if (criticalCount > 0) return 'CRITICAL';
  if (highCount >= 2) return 'HIGH';
  if (highCount >= 1 || mediumCount >= 2) return 'MEDIUM';
  return 'LOW';
}

export function generateSummary(findings: Finding[], riskLevel: RiskLevel): string {
  if (findings.length === 0) {
    return 'No significant brand safety concerns found.';
  }

  const counts = {
    court_case: findings.filter((f) => f.type === 'court_case').length,
    news_article: findings.filter((f) => f.type === 'news_article').length,
    social_controversy: findings.filter((f) => f.type === 'social_controversy').length,
  };

  const parts: string[] = [];

  if (counts.court_case > 0) {
    parts.push(`${counts.court_case} legal issue${counts.court_case > 1 ? 's' : ''}`);
  }
  if (counts.news_article > 0) {
    parts.push(`${counts.news_article} news article${counts.news_article > 1 ? 's' : ''}`);
  }
  if (counts.social_controversy > 0) {
    parts.push(
      `${counts.social_controversy} social media incident${counts.social_controversy > 1 ? 's' : ''}`
    );
  }

  const riskDescriptions: Record<RiskLevel, string> = {
    LOW: 'Minor concerns',
    MEDIUM: 'Moderate concerns',
    HIGH: 'Significant concerns',
    CRITICAL: 'Critical concerns',
    UNKNOWN: 'Unknown risk',
  };

  return `${riskDescriptions[riskLevel]}: Found ${parts.join(', ')}.`;
}
