import Exa from 'exa-js';
import { extractUsername } from './utils';

const exa = new Exa(process.env.EXA_API_KEY);

export interface ExaResult {
  title: string;
  url: string;
  text?: string;
  publishedDate?: string;
  author?: string;
}

export const DEFAULT_SEARCH_TERMS = [
  'lawsuit',
  'controversy',
  'scandal',
  'court case',
  'allegations',
  'accused',
  'fired',
  'cancelled',
  'problematic',
  'apology',
];

export async function searchCreator(
  creatorName: string,
  socialLinks: string[],
  customTerms: string[] = []
): Promise<{ results: ExaResult[]; queries: string[] }> {
  const searchTerms = [...DEFAULT_SEARCH_TERMS.slice(0, 5), ...customTerms.slice(0, 5)];
  const allResults: ExaResult[] = [];
  const executedQueries: string[] = [];

  // Extract usernames from social links
  const usernames = socialLinks
    .map((url) => extractUsername(url))
    .filter((u): u is string => Boolean(u));

  // Generate search queries
  const queries: string[] = [];

  // Name-based queries with controversy terms
  for (const term of searchTerms.slice(0, 4)) {
    queries.push(`"${creatorName}" ${term}`);
  }

  // Username-based queries
  for (const username of usernames.slice(0, 2)) {
    queries.push(`"${username}" OR "@${username}" controversy OR scandal`);
  }

  // Execute searches with rate limiting
  for (const query of queries) {
    try {
      executedQueries.push(query);

      const response = await exa.searchAndContents(query, {
        type: 'auto',
        numResults: 5,
        text: { maxCharacters: 1500 },
      });

      if (response.results) {
        allResults.push(
          ...response.results.map((r) => ({
            title: r.title || '',
            url: r.url,
            text: r.text || undefined,
            publishedDate: r.publishedDate || undefined,
            author: r.author || undefined,
          }))
        );
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Search failed for query: ${query}`, error);
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduplicated = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return { results: deduplicated, queries: executedQueries };
}
