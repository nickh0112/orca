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

// Organized by category for comprehensive creator vetting
export const SEARCH_QUERIES = {
  // Tier 1: High priority - always run
  legal: [
    'lawsuit',
    'sued',
    'court case',
    'legal action',
    'settlement',
  ],
  criminal: [
    'arrested',
    'criminal charges',
    'convicted',
    'investigation',
    'restraining order',
  ],
  platformActions: [
    'banned',
    'suspended',
    'account terminated',
    'demonetized',
    'removed from platform',
  ],
  fraud: [
    'scam',
    'fraud',
    'FTC violation',
    'undisclosed ad',
    'undisclosed sponsorship',
  ],

  // Tier 2: Important context
  brandIssues: [
    'dropped by sponsor',
    'brand partnership ended',
    'lost sponsorship',
    'brand deal cancelled',
  ],
  harassment: [
    'harassment allegations',
    'bullying',
    'abuse allegations',
    'toxic behavior',
    'hostile workplace',
  ],
  offensiveContent: [
    'racist',
    'offensive comments',
    'slur',
    'blackface',
    'antisemitic',
    'homophobic',
  ],

  // Tier 3: General controversy
  general: [
    'controversy',
    'scandal',
    'allegations',
    'accused',
    'cancelled',
    'problematic',
    'apology',
    'backlash',
    'boycott',
    'called out',
  ],
};

// Flatten for backwards compatibility
export const DEFAULT_SEARCH_TERMS = [
  ...SEARCH_QUERIES.legal.slice(0, 2),
  ...SEARCH_QUERIES.criminal.slice(0, 2),
  ...SEARCH_QUERIES.general.slice(0, 4),
];

export async function searchCreator(
  creatorName: string,
  socialLinks: string[],
  customTerms: string[] = []
): Promise<{ results: ExaResult[]; queries: string[] }> {
  const allResults: ExaResult[] = [];
  const executedQueries: string[] = [];

  // Extract usernames from social links
  const usernames = socialLinks
    .map((url) => extractUsername(url))
    .filter((u): u is string => Boolean(u));

  // Build comprehensive query list
  const queries: string[] = [];

  // Tier 1: Critical searches (always run)
  // Legal
  queries.push(`"${creatorName}" lawsuit OR sued OR "court case" OR "legal action"`);

  // Criminal
  queries.push(`"${creatorName}" arrested OR "criminal charges" OR convicted OR investigation`);

  // Platform actions
  queries.push(`"${creatorName}" banned OR suspended OR "account terminated" OR demonetized`);

  // Fraud/Scam
  queries.push(`"${creatorName}" scam OR fraud OR "FTC" OR "undisclosed"`);

  // Tier 2: Important context
  // Brand issues
  queries.push(`"${creatorName}" "dropped by" OR "partnership ended" OR "lost sponsorship"`);

  // Harassment/Abuse
  queries.push(`"${creatorName}" harassment OR bullying OR "abuse allegations" OR "toxic"`);

  // Offensive content
  queries.push(`"${creatorName}" racist OR offensive OR slur OR antisemitic OR homophobic`);

  // Tier 3: General controversy
  queries.push(`"${creatorName}" controversy OR scandal OR allegations`);
  queries.push(`"${creatorName}" cancelled OR problematic OR backlash OR apology`);

  // Username-based queries (catch content under handles)
  for (const username of usernames.slice(0, 2)) {
    queries.push(`"@${username}" controversy OR scandal OR cancelled OR problematic`);
  }

  // Add custom terms if provided
  if (customTerms.length > 0) {
    const customQuery = customTerms.slice(0, 5).join(' OR ');
    queries.push(`"${creatorName}" ${customQuery}`);
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

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
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
