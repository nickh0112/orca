import natural from 'natural';
import type { KeywordMatch, KeywordDetectionResult } from '@/types/social-media';

const { PorterStemmer, WordTokenizer } = natural;
const tokenizer = new WordTokenizer();

// Default sensitive keywords organized by severity
const DEFAULT_KEYWORDS: Record<'critical' | 'high' | 'medium' | 'low', string[]> = {
  critical: [
    'racist', 'racism', 'slur', 'hate', 'nazi', 'terrorist', 'terrorism',
    'white supremacy', 'supremacist', 'genocide', 'ethnic cleansing',
    'pedophile', 'pedophilia', 'child abuse',
  ],
  high: [
    'drugs', 'cocaine', 'heroin', 'meth', 'methamphetamine', 'fentanyl',
    'violence', 'violent', 'abuse', 'assault', 'murder', 'kill', 'killing',
    'fraud', 'scam', 'trafficking', 'illegal', 'crime', 'criminal',
    'suicide', 'self-harm', 'eating disorder', 'anorexia', 'bulimia',
  ],
  medium: [
    'controversial', 'political', 'explicit', 'gambling', 'casino', 'betting',
    'conspiracy', 'misinformation', 'fake news', 'propaganda',
    'sex', 'sexual', 'nude', 'nudity', 'porn', 'pornography',
    'weapon', 'gun', 'firearm', 'rifle',
  ],
  low: [
    'alcohol', 'beer', 'wine', 'vodka', 'whiskey', 'drunk',
    'tobacco', 'cigarette', 'vape', 'vaping', 'nicotine',
    'mature', 'adult', 'profanity', 'swear', 'curse',
    'cannabis', 'marijuana', 'weed', 'thc', 'cbd',
  ],
};

// Pre-compute stems for default keywords
const STEMMED_KEYWORDS: Map<string, { original: string; severity: KeywordMatch['severity'] }> = new Map();

function initializeStemmedKeywords() {
  if (STEMMED_KEYWORDS.size > 0) return;

  for (const [severity, keywords] of Object.entries(DEFAULT_KEYWORDS)) {
    for (const keyword of keywords) {
      const stem = PorterStemmer.stem(keyword.toLowerCase());
      STEMMED_KEYWORDS.set(stem, {
        original: keyword,
        severity: severity as KeywordMatch['severity'],
      });
    }
  }
}

/**
 * Tokenize and clean content for analysis
 */
function tokenizeContent(content: string): string[] {
  const lowered = content.toLowerCase();
  const tokens = tokenizer.tokenize(lowered) || [];
  return tokens;
}

/**
 * Check for exact keyword matches
 */
function findExactMatches(
  content: string,
  customKeywords?: string[]
): KeywordMatch[] {
  const matches: KeywordMatch[] = [];
  const lowerContent = content.toLowerCase();

  // Check default keywords
  for (const [severity, keywords] of Object.entries(DEFAULT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        matches.push({
          keyword,
          matchType: 'exact',
          matchedText: keyword,
          severity: severity as KeywordMatch['severity'],
        });
      }
    }
  }

  // Check custom keywords (default to high severity)
  if (customKeywords) {
    for (const keyword of customKeywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        matches.push({
          keyword,
          matchType: 'exact',
          matchedText: keyword,
          severity: 'high',
        });
      }
    }
  }

  return matches;
}

/**
 * Check for stem-based matches (morphological variants)
 */
function findStemMatches(
  content: string,
  exactMatches: KeywordMatch[]
): KeywordMatch[] {
  initializeStemmedKeywords();

  const matches: KeywordMatch[] = [];
  const tokens = tokenizeContent(content);
  const exactKeywords = new Set(exactMatches.map((m) => m.keyword.toLowerCase()));

  for (const token of tokens) {
    const stem = PorterStemmer.stem(token);
    const keywordInfo = STEMMED_KEYWORDS.get(stem);

    if (keywordInfo && !exactKeywords.has(keywordInfo.original.toLowerCase())) {
      // Don't duplicate exact matches
      if (token !== keywordInfo.original.toLowerCase()) {
        matches.push({
          keyword: keywordInfo.original,
          matchType: 'stem',
          matchedText: token,
          severity: keywordInfo.severity,
        });
      }
    }
  }

  return matches;
}

/**
 * Calculate overall risk level from matches
 */
function calculateOverallRisk(matches: KeywordMatch[]): KeywordDetectionResult['overallRisk'] {
  if (matches.length === 0) return 'low';

  const severityOrder: KeywordMatch['severity'][] = ['critical', 'high', 'medium', 'low'];

  for (const severity of severityOrder) {
    if (matches.some((m) => m.severity === severity)) {
      return severity;
    }
  }

  return 'low';
}

/**
 * Deduplicate matches, keeping highest severity for each keyword
 */
function deduplicateMatches(matches: KeywordMatch[]): KeywordMatch[] {
  const keywordMap = new Map<string, KeywordMatch>();
  const severityOrder: KeywordMatch['severity'][] = ['critical', 'high', 'medium', 'low'];

  for (const match of matches) {
    const key = match.keyword.toLowerCase();
    const existing = keywordMap.get(key);

    if (!existing) {
      keywordMap.set(key, match);
    } else {
      // Keep the higher severity match
      const existingIndex = severityOrder.indexOf(existing.severity);
      const newIndex = severityOrder.indexOf(match.severity);
      if (newIndex < existingIndex) {
        keywordMap.set(key, match);
      }
    }
  }

  return Array.from(keywordMap.values());
}

/**
 * Main function to detect sensitive keywords in content
 */
export function detectSensitiveKeywords(
  content: string,
  customKeywords?: string[]
): KeywordDetectionResult {
  if (!content || content.trim().length === 0) {
    return {
      matches: [],
      flaggedTerms: [],
      overallRisk: 'low',
    };
  }

  // Find exact matches first
  const exactMatches = findExactMatches(content, customKeywords);

  // Find stem-based matches (morphological variants)
  const stemMatches = findStemMatches(content, exactMatches);

  // Combine and deduplicate
  const allMatches = deduplicateMatches([...exactMatches, ...stemMatches]);

  // Extract unique flagged terms
  const flaggedTerms = [...new Set(allMatches.map((m) => m.keyword))];

  // Calculate overall risk
  const overallRisk = calculateOverallRisk(allMatches);

  return {
    matches: allMatches,
    flaggedTerms,
    overallRisk,
  };
}

/**
 * Batch detect keywords for multiple posts
 */
export function detectKeywordsBatch(
  posts: Array<{ id: string; content: string }>,
  customKeywords?: string[]
): Map<string, KeywordDetectionResult> {
  const results = new Map<string, KeywordDetectionResult>();

  for (const post of posts) {
    const result = detectSensitiveKeywords(post.content, customKeywords);
    results.set(post.id, result);
  }

  return results;
}

/**
 * Aggregate keyword results across multiple posts
 */
export function aggregateKeywordResults(
  results: Map<string, KeywordDetectionResult>
): {
  allFlaggedTerms: string[];
  overallRisk: KeywordDetectionResult['overallRisk'];
  matchCounts: Map<string, number>;
  severityCounts: Record<KeywordMatch['severity'], number>;
} {
  const matchCounts = new Map<string, number>();
  const severityCounts: Record<KeywordMatch['severity'], number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  let highestRisk: KeywordDetectionResult['overallRisk'] = 'low';
  const severityOrder: KeywordMatch['severity'][] = ['critical', 'high', 'medium', 'low'];

  for (const result of results.values()) {
    // Track overall risk
    const currentIndex = severityOrder.indexOf(highestRisk);
    const resultIndex = severityOrder.indexOf(result.overallRisk);
    if (resultIndex < currentIndex) {
      highestRisk = result.overallRisk;
    }

    // Count matches
    for (const match of result.matches) {
      const term = match.keyword.toLowerCase();
      matchCounts.set(term, (matchCounts.get(term) || 0) + 1);
      severityCounts[match.severity]++;
    }
  }

  return {
    allFlaggedTerms: Array.from(matchCounts.keys()),
    overallRisk: highestRisk,
    matchCounts,
    severityCounts,
  };
}

/**
 * Get severity color for UI display
 */
export function getSeverityColor(severity: KeywordMatch['severity']): string {
  switch (severity) {
    case 'critical':
      return '#dc2626'; // red-600
    case 'high':
      return '#ea580c'; // orange-600
    case 'medium':
      return '#ca8a04'; // yellow-600
    case 'low':
      return '#65a30d'; // lime-600
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get all default keywords (for UI configuration)
 */
export function getDefaultKeywords(): typeof DEFAULT_KEYWORDS {
  return { ...DEFAULT_KEYWORDS };
}
