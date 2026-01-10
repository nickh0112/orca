/**
 * Competitor Detection
 *
 * Uses AI to identify competitor brands when given a client brand.
 * This allows automatic flagging of partnerships with competing brands.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cache for competitor lookups to avoid redundant API calls
const competitorCache = new Map<string, string[]>();

/**
 * Identify competitor brands for a given client brand
 *
 * @param clientBrand - The client's brand name (e.g., "Coca-Cola")
 * @returns Array of competitor brand names
 */
export async function identifyCompetitors(
  clientBrand: string
): Promise<string[]> {
  if (!clientBrand || clientBrand.trim().length === 0) {
    return [];
  }

  const normalizedBrand = clientBrand.trim().toLowerCase();

  // Check cache first
  if (competitorCache.has(normalizedBrand)) {
    console.log(`[Competitor Detection] Using cached competitors for ${clientBrand}`);
    return competitorCache.get(normalizedBrand)!;
  }

  console.log(`[Competitor Detection] Identifying competitors for ${clientBrand}...`);

  const prompt = `You are a brand and market analyst. Given a brand name, identify its main competitors.

BRAND: ${clientBrand}

List 10-15 direct competitor brands that would represent a conflict of interest for a brand partnership. Include:
- Direct product/service competitors (same category)
- Major market alternatives that consumers typically compare
- Brands often seen as substitutes or rivals

Focus on REAL, WELL-KNOWN brands. Do not include generic categories or made-up names.

Return ONLY a JSON array of brand names, nothing else:
["Competitor1", "Competitor2", "Competitor3", ...]`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseContent = response.content[0];
    if (responseContent.type !== 'text') {
      console.warn('[Competitor Detection] Non-text response from Claude');
      return [];
    }

    // Parse JSON array from response
    const jsonMatch = responseContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[Competitor Detection] No JSON array found in response');
      return [];
    }

    const competitors: string[] = JSON.parse(jsonMatch[0]);

    // Validate and clean up
    const validCompetitors = competitors
      .filter((c) => typeof c === 'string' && c.trim().length > 0)
      .map((c) => c.trim());

    // Cache the result
    competitorCache.set(normalizedBrand, validCompetitors);

    console.log(
      `[Competitor Detection] Found ${validCompetitors.length} competitors for ${clientBrand}:`,
      validCompetitors.slice(0, 5).join(', ') + (validCompetitors.length > 5 ? '...' : '')
    );

    return validCompetitors;
  } catch (error) {
    console.error('[Competitor Detection] Failed to identify competitors:', error);
    return [];
  }
}

/**
 * Check if a brand is a competitor
 */
export function isCompetitor(brand: string, competitors: string[]): boolean {
  const normalizedBrand = brand.toLowerCase().trim();
  return competitors.some((c) => c.toLowerCase().trim() === normalizedBrand);
}

/**
 * Clear the competitor cache (useful for testing)
 */
export function clearCompetitorCache(): void {
  competitorCache.clear();
}
