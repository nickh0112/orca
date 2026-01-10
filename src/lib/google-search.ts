/**
 * Google Custom Search API client for flagged topics search
 * Replicates creator-vetting-ms functionality for web reputation analysis
 */

const GOOGLE_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

const GOOGLE_SEARCH_API = 'https://www.googleapis.com/customsearch/v1';

// Flagged topics from creator-vetting-ms
export const FLAGGED_TOPICS = [
  'Allegations',
  'Alleged',
  'Arrested',
  'Fraud',
  'Felony',
  'Controversy',
  'Scandal',
  'Binge Drinking',
  'Illegal Drug Use',
  'DUI',
  'DWI',
  'Drunk driving',
  'Violence',
  'Rape',
  'Domestic violence',
  'Murder',
  'Sexual assault',
  'Hate Speech',
  'Racism',
  'Racist',
  'Embezzlement',
  'Theft',
  'Robbery',
  'Burglary',
  'Bullying',
  'Prank Content',
  'Nudity',
  'Politics',
  'Activism',
] as const;

// Domains to exclude from search results (social media self-references)
const EXCLUDED_DOMAINS = [
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'threads.net',
  'snapchat.com',
  'linkedin.com',
];

export interface GoogleSearchResult {
  topic: string;
  title: string;
  url: string;
  snippet: string;
  displayLink: string;
}

export interface FlaggedTopicsResult {
  results: GoogleSearchResult[];
  queries: string[];
  topicCounts: Record<string, number>;
  hasResults: boolean;
}

// Retry configuration
const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  RESULTS_PER_TOPIC: 5,
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
        lastError.message.includes('503') ||
        lastError.message.toLowerCase().includes('rate limit');

      if (attempt < maxRetries && isRetryable) {
        const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt);
        console.log(`Google Search retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (!isRetryable) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Build search query for a topic and creator
 */
function buildSearchQuery(
  topic: string,
  creatorName: string,
  handles: string[]
): string {
  // Create handle identifiers
  const handleTerms = handles
    .filter((h) => h.trim().length > 0)
    .map((h) => `"${h}"`)
    .join(' OR ');

  // Exclude social media domains
  const exclusions = EXCLUDED_DOMAINS.map((d) => `-site:${d}`).join(' ');

  // Build query: "topic" "creator name" (handles) -excluded_sites
  let query = `"${topic}" "${creatorName}"`;

  if (handleTerms) {
    query += ` (${handleTerms})`;
  }

  query += ` ${exclusions}`;

  return query;
}

/**
 * Execute a single Google Custom Search query
 */
async function executeSearch(
  query: string,
  language: string = 'en',
  numResults: number = CONFIG.RESULTS_PER_TOPIC
): Promise<GoogleSearchResult[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.log('Google Custom Search not configured');
    return [];
  }

  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    cx: GOOGLE_CX,
    q: query,
    num: Math.min(numResults, 10).toString(),
    lr: `lang_${language}`,
  });

  const url = `${GOOGLE_SEARCH_API}?${params.toString()}`;

  try {
    const response = await withRetry(async () => {
      const res = await fetch(url);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Google Search API error: ${res.status} - ${errorText}`);
      }
      return res.json();
    });

    if (!response.items || response.items.length === 0) {
      return [];
    }

    return response.items.map((item: { title?: string; link?: string; snippet?: string; displayLink?: string }) => ({
      topic: '', // Will be set by caller
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || '',
      displayLink: item.displayLink || '',
    }));
  } catch (error) {
    console.error(`Google Search failed for query: ${query.slice(0, 50)}...`, error);
    return [];
  }
}

/**
 * Search for flagged topics related to a creator
 *
 * @param creatorName - Full name of the creator
 * @param handles - Social media handles (without @)
 * @param language - Language code for results
 * @param topics - Specific topics to search (defaults to all FLAGGED_TOPICS)
 */
export async function searchFlaggedTopics(
  creatorName: string,
  handles: string[] = [],
  language: string = 'en',
  topics: string[] = [...FLAGGED_TOPICS]
): Promise<FlaggedTopicsResult> {
  // Check if Google Search is configured
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.log('Google Custom Search not configured, skipping flagged topics search');
    return {
      results: [],
      queries: [],
      topicCounts: {},
      hasResults: false,
    };
  }

  const allResults: GoogleSearchResult[] = [];
  const queries: string[] = [];
  const topicCounts: Record<string, number> = {};

  // Clean handles (remove @ if present)
  const cleanHandles = handles.map((h) => h.replace(/^@/, '').trim()).filter(Boolean);

  console.log(`Searching ${topics.length} flagged topics for "${creatorName}"...`);

  // Process topics sequentially to avoid rate limiting
  for (const topic of topics) {
    const query = buildSearchQuery(topic, creatorName, cleanHandles);
    queries.push(query);

    const results = await executeSearch(query, language);

    if (results.length > 0) {
      // Add topic to each result
      const taggedResults = results.map((r) => ({ ...r, topic }));
      allResults.push(...taggedResults);
      topicCounts[topic] = results.length;

      console.log(`  ${topic}: ${results.length} result(s)`);
    }

    // Small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`Flagged topics search complete: ${allResults.length} total results`);

  return {
    results: allResults,
    queries,
    topicCounts,
    hasResults: allResults.length > 0,
  };
}

/**
 * Search a subset of high-priority flagged topics
 * Use this for faster searches when not all topics are needed
 */
export async function searchPriorityTopics(
  creatorName: string,
  handles: string[] = [],
  language: string = 'en'
): Promise<FlaggedTopicsResult> {
  const priorityTopics = [
    'Controversy',
    'Scandal',
    'Arrested',
    'Fraud',
    'Allegations',
    'Violence',
    'Racism',
    'Hate Speech',
  ];

  return searchFlaggedTopics(creatorName, handles, language, priorityTopics);
}

/**
 * Check if Google Custom Search is configured
 */
export function isGoogleSearchConfigured(): boolean {
  return Boolean(GOOGLE_API_KEY && GOOGLE_CX);
}

/**
 * Get all flagged topics
 */
export function getFlaggedTopics(): readonly string[] {
  return FLAGGED_TOPICS;
}
