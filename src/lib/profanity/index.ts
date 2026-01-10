/**
 * Profanity Detection Module
 * Detects profanity using regex-based matching with word boundaries
 * Supports multiple languages with severity levels
 */

import PROFANITY_LIST_EN from './lists/en';
import PROFANITY_LIST_DE from './lists/de';

export interface ProfanityWord {
  text: string;
  severity: number;
  category: string;
}

export interface ProfanityMatch {
  word: string;
  matched: string;
  severity: number;
  category: string;
  position: number;
}

export interface ProfanityResult {
  hasProfanity: boolean;
  maxSeverity: number;
  severityLevel: 'none' | 'mild' | 'strong' | 'severe';
  matches: ProfanityMatch[];
  categories: string[];
}

// Severity thresholds (matching creator-vetting-ms)
const SEVERITY_THRESHOLDS = {
  MILD: 1.0,
  STRONG: 1.6,
  SEVERE: 2.0,
};

// Minimum severity to flag (matches creator-vetting-ms default of 1.6)
const DEFAULT_MIN_SEVERITY = 1.6;

// Language to profanity list mapping
const PROFANITY_LISTS: Record<string, ProfanityWord[]> = {
  en: PROFANITY_LIST_EN,
  de: PROFANITY_LIST_DE,
};

// Cache for compiled regex patterns
const patternCache = new Map<string, Map<string, RegExp>>();

/**
 * Build a regex pattern for a profanity word
 * Uses word boundaries and handles special characters
 */
function buildRegexPattern(word: string): RegExp {
  // Escape special regex characters
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Replace spaces with flexible whitespace pattern
  const withSpaces = escaped.replace(/\s+/g, '\\s+');

  // Create pattern with word boundaries
  // Use (?:^|\\s|[^a-zA-Z0-9]) for start boundary to handle special chars
  const pattern = `(?:^|\\s|[^a-zA-Z0-9])${withSpaces}(?:\\s|[^a-zA-Z0-9]|$)`;

  return new RegExp(pattern, 'gi');
}

/**
 * Get or create cached regex patterns for a language
 */
function getPatterns(language: string): Map<string, RegExp> {
  if (!patternCache.has(language)) {
    const list = PROFANITY_LISTS[language] || PROFANITY_LISTS['en'];
    const patterns = new Map<string, RegExp>();

    for (const word of list) {
      try {
        patterns.set(word.text, buildRegexPattern(word.text));
      } catch {
        // Skip invalid patterns
        console.warn(`Invalid profanity pattern: ${word.text}`);
      }
    }

    patternCache.set(language, patterns);
  }

  return patternCache.get(language)!;
}

/**
 * Get severity level from numeric severity
 */
function getSeverityLevel(severity: number): ProfanityResult['severityLevel'] {
  if (severity >= SEVERITY_THRESHOLDS.SEVERE) return 'severe';
  if (severity >= SEVERITY_THRESHOLDS.STRONG) return 'strong';
  if (severity >= SEVERITY_THRESHOLDS.MILD) return 'mild';
  return 'none';
}

/**
 * Detect profanity in text
 *
 * @param text - Text to analyze
 * @param language - Language code (en, de)
 * @param minSeverity - Minimum severity to flag (default: 1.6 = Strong+)
 */
export function detectProfanity(
  text: string,
  language: string = 'en',
  minSeverity: number = DEFAULT_MIN_SEVERITY
): ProfanityResult {
  if (!text || text.trim().length === 0) {
    return {
      hasProfanity: false,
      maxSeverity: 0,
      severityLevel: 'none',
      matches: [],
      categories: [],
    };
  }

  const normalizedLanguage = language.toLowerCase().slice(0, 2);
  const list = PROFANITY_LISTS[normalizedLanguage] || PROFANITY_LISTS['en'];
  const patterns = getPatterns(normalizedLanguage);

  const matches: ProfanityMatch[] = [];
  const lowerText = text.toLowerCase();

  for (const word of list) {
    // Skip words below minimum severity
    if (word.severity < minSeverity) continue;

    const pattern = patterns.get(word.text);
    if (!pattern) continue;

    // Reset regex state
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(lowerText)) !== null) {
      matches.push({
        word: word.text,
        matched: match[0].trim(),
        severity: word.severity,
        category: word.category,
        position: match.index,
      });

      // Prevent infinite loops on zero-width matches
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex++;
      }
    }
  }

  // Deduplicate by position (same position can match multiple patterns)
  const uniqueMatches = matches.reduce((acc, match) => {
    const existing = acc.find((m) => m.position === match.position);
    if (!existing || match.severity > existing.severity) {
      if (existing) {
        acc.splice(acc.indexOf(existing), 1);
      }
      acc.push(match);
    }
    return acc;
  }, [] as ProfanityMatch[]);

  // Sort by position
  uniqueMatches.sort((a, b) => a.position - b.position);

  const maxSeverity = uniqueMatches.length > 0
    ? Math.max(...uniqueMatches.map((m) => m.severity))
    : 0;

  const categories = [...new Set(uniqueMatches.map((m) => m.category))];

  return {
    hasProfanity: uniqueMatches.length > 0,
    maxSeverity,
    severityLevel: getSeverityLevel(maxSeverity),
    matches: uniqueMatches,
    categories,
  };
}

/**
 * Detect profanity with all severity levels (including mild)
 */
export function detectAllProfanity(
  text: string,
  language: string = 'en'
): ProfanityResult {
  return detectProfanity(text, language, 0);
}

/**
 * Check if text contains strong+ profanity
 * This matches the default behavior of creator-vetting-ms
 */
export function hasStrongProfanity(text: string, language: string = 'en'): boolean {
  const result = detectProfanity(text, language, SEVERITY_THRESHOLDS.STRONG);
  return result.hasProfanity;
}

/**
 * Get supported languages
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(PROFANITY_LISTS);
}

/**
 * Get profanity statistics for a language
 */
export function getProfanityStats(language: string): {
  total: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
} {
  const list = PROFANITY_LISTS[language] || PROFANITY_LISTS['en'];

  const bySeverity: Record<string, number> = {
    mild: 0,
    strong: 0,
    severe: 0,
  };

  const byCategory: Record<string, number> = {};

  for (const word of list) {
    const level = getSeverityLevel(word.severity);
    if (level !== 'none') {
      bySeverity[level]++;
    }

    byCategory[word.category] = (byCategory[word.category] || 0) + 1;
  }

  return {
    total: list.length,
    bySeverity,
    byCategory,
  };
}
