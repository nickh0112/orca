/**
 * Thumbnail Pre-Screener
 *
 * Uses Claude Vision (Haiku for cost-effectiveness) to quickly screen video thumbnails
 * before committing to full Twelve Labs analysis. This can save ~$0.10-0.30 per video
 * when thumbnails indicate safe, non-branded content.
 *
 * Cost comparison:
 * - Thumbnail pre-screen: ~$0.003 (Haiku vision)
 * - Full Twelve Labs analysis: ~$0.10-0.30
 *
 * Use cases for skipping full analysis:
 * - Obviously safe lifestyle content with no brands
 * - Generic landscape/food photos
 * - Simple selfies without visible products
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use Haiku for fast, cheap pre-screening (~$0.003 per image)
const PRESCREENING_MODEL = 'claude-3-5-haiku-20241022';

// Concurrency for batch pre-screening
const PRESCREEN_CONCURRENCY = 20;

/**
 * Result of thumbnail pre-screening
 */
export interface PreScreenResult {
  /** Whether this video needs full Twelve Labs analysis */
  needsFullAnalysis: boolean;
  /** Reason for the decision */
  reason: 'safe' | 'brands_detected' | 'uncertain' | 'concerning' | 'error';
  /** Brands detected in thumbnail (if any) */
  detectedBrands?: string[];
  /** Confidence in the pre-screen decision (0-1) */
  confidence: number;
  /** Brief description of thumbnail content */
  thumbnailDescription?: string;
}

/**
 * Check if pre-screening is available
 */
export function isPreScreeningConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Fetch image as base64
 */
async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' } | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      console.warn(`[PreScreen] Failed to fetch thumbnail: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
    if (contentType.includes('png')) mediaType = 'image/png';
    else if (contentType.includes('gif')) mediaType = 'image/gif';
    else if (contentType.includes('webp')) mediaType = 'image/webp';

    return { data: base64, mediaType };
  } catch (error) {
    console.warn(`[PreScreen] Error fetching thumbnail:`, error);
    return null;
  }
}

/**
 * Pre-screen a single thumbnail to determine if full video analysis is needed
 *
 * @param thumbnailUrl - URL of the video thumbnail
 * @returns PreScreenResult indicating whether full analysis is needed
 */
export async function preScreenThumbnail(thumbnailUrl: string): Promise<PreScreenResult> {
  if (!isPreScreeningConfigured()) {
    // If not configured, default to full analysis
    return {
      needsFullAnalysis: true,
      reason: 'uncertain',
      confidence: 0,
    };
  }

  try {
    const imageData = await fetchImageAsBase64(thumbnailUrl);
    if (!imageData) {
      return {
        needsFullAnalysis: true,
        reason: 'error',
        confidence: 0,
      };
    }

    const prompt = `Analyze this video thumbnail for brand safety pre-screening.

Your task is to determine if this video needs detailed analysis or can be marked as safe.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "needs_analysis": true/false,
  "reason": "safe" | "brands_detected" | "uncertain" | "concerning",
  "brands": ["brand1", "brand2"] or [],
  "confidence": 0.0-1.0,
  "description": "brief description"
}

Decision criteria:
- "safe" (needs_analysis=false): Generic lifestyle content, nature, food, selfies with NO visible brands/logos/products
- "brands_detected" (needs_analysis=true): Any visible brand logos, product packaging, or sponsored content indicators
- "concerning" (needs_analysis=true): Content that might be controversial, adult-oriented, or unsafe
- "uncertain" (needs_analysis=true): Cannot clearly determine safety from thumbnail alone

Be conservative - if uncertain, mark as needs_analysis=true.
Only mark as safe if you're highly confident there's nothing requiring brand safety review.`;

    const response = await anthropic.messages.create({
      model: PRESCREENING_MODEL,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageData.mediaType,
                data: imageData.data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        needsFullAnalysis: parsed.needs_analysis !== false,
        reason: parsed.reason || 'uncertain',
        detectedBrands: parsed.brands?.length > 0 ? parsed.brands : undefined,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        thumbnailDescription: parsed.description,
      };
    } catch (parseError) {
      console.warn('[PreScreen] Failed to parse response, defaulting to full analysis');
      return {
        needsFullAnalysis: true,
        reason: 'uncertain',
        confidence: 0.3,
      };
    }
  } catch (error) {
    console.error('[PreScreen] Error during pre-screening:', error);
    return {
      needsFullAnalysis: true,
      reason: 'error',
      confidence: 0,
    };
  }
}

/**
 * Batch pre-screen multiple thumbnails
 *
 * @param items - Array of items with id and thumbnailUrl
 * @returns Map of item ID to PreScreenResult
 */
export async function preScreenBatch(
  items: Array<{ id: string; thumbnailUrl: string }>
): Promise<Map<string, PreScreenResult>> {
  const results = new Map<string, PreScreenResult>();

  if (items.length === 0) {
    return results;
  }

  console.log(`[PreScreen] Pre-screening ${items.length} thumbnails...`);
  const startTime = Date.now();

  // Process in batches for concurrency control
  for (let i = 0; i < items.length; i += PRESCREEN_CONCURRENCY) {
    const batch = items.slice(i, i + PRESCREEN_CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const result = await preScreenThumbnail(item.thumbnailUrl);
        return { id: item.id, result };
      })
    );

    for (const { id, result } of batchResults) {
      results.set(id, result);
    }
  }

  // Calculate stats
  const safeCount = Array.from(results.values()).filter((r) => !r.needsFullAnalysis).length;
  const brandsCount = Array.from(results.values()).filter((r) => r.reason === 'brands_detected').length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(
    `[PreScreen] Complete in ${elapsed}s: ${safeCount}/${items.length} safe (skip full analysis), ` +
      `${brandsCount} with brands detected`
  );

  return results;
}

/**
 * Filter items that need full analysis based on pre-screening
 *
 * @param items - Array of items with id and thumbnailUrl
 * @returns Object with items needing full analysis and pre-screen results
 */
export async function filterForFullAnalysis<T extends { id: string; thumbnailUrl?: string }>(
  items: T[]
): Promise<{
  needsAnalysis: T[];
  safeItems: T[];
  preScreenResults: Map<string, PreScreenResult>;
}> {
  // Items without thumbnails always need full analysis
  const itemsWithThumbnails = items.filter((item) => item.thumbnailUrl);
  const itemsWithoutThumbnails = items.filter((item) => !item.thumbnailUrl);

  // Pre-screen items with thumbnails
  const preScreenResults = await preScreenBatch(
    itemsWithThumbnails.map((item) => ({
      id: item.id,
      thumbnailUrl: item.thumbnailUrl!,
    }))
  );

  // Separate items based on pre-screening
  const needsAnalysis: T[] = [...itemsWithoutThumbnails];
  const safeItems: T[] = [];

  for (const item of itemsWithThumbnails) {
    const result = preScreenResults.get(item.id);
    if (result && !result.needsFullAnalysis) {
      safeItems.push(item);
    } else {
      needsAnalysis.push(item);
    }
  }

  const savingsPercent = items.length > 0 ? ((safeItems.length / items.length) * 100).toFixed(1) : '0';
  console.log(
    `[PreScreen] Filtering result: ${needsAnalysis.length} need full analysis, ` +
      `${safeItems.length} can skip (${savingsPercent}% API cost savings)`
  );

  return { needsAnalysis, safeItems, preScreenResults };
}

/**
 * Get analysis tier recommendation based on pre-screen results
 */
export type AnalysisTier = 'light' | 'standard' | 'full';

export function getRecommendedTier(preScreenResult: PreScreenResult): AnalysisTier {
  if (preScreenResult.reason === 'concerning') {
    return 'full';
  }

  if (preScreenResult.reason === 'brands_detected') {
    return 'full';
  }

  if (preScreenResult.reason === 'uncertain' && preScreenResult.confidence < 0.7) {
    return 'standard';
  }

  return 'light';
}
