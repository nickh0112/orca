import Anthropic from '@anthropic-ai/sdk';
import type { BrandMention, BrandDetectionResult } from '@/types/social-media';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Common ad/sponsorship indicators
const AD_HASHTAGS = [
  'ad', 'sponsored', 'gifted', 'partnership', 'paid', 'ambassador',
  'collab', 'promo', 'advertisement', 'paidpartnership', 'brandpartner',
  // German
  'werbung', 'anzeige', 'gesponsert', 'kooperation',
  // Spanish
  'publicidad', 'patrocinado',
  // French
  'pub', 'partenariat', 'sponsorise',
];

const AD_PHRASES = [
  'thank you to', 'thanks to', 'partnered with', 'in partnership with',
  'sponsored by', 'brought to you by', 'paid promotion', 'gifted by',
  'use my code', 'use code', 'discount code', 'affiliate link',
];

// Retry configuration
const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
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
        lastError.message.includes('529') ||
        lastError.message.toLowerCase().includes('rate limit') ||
        lastError.message.toLowerCase().includes('overloaded');

      if (attempt < maxRetries && isRetryable) {
        const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt);
        console.log(`Brand detection retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (!isRetryable) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Extract hashtags from content
 */
function extractHashtags(content: string): string[] {
  const matches = content.match(/#(\w+)/g);
  return matches ? matches.map((m) => m.slice(1).toLowerCase()) : [];
}

/**
 * Check if content contains ad indicators
 */
function detectAdIndicators(content: string): { isAd: boolean; indicators: string[] } {
  const lowerContent = content.toLowerCase();
  const indicators: string[] = [];

  // Check hashtags
  const hashtags = extractHashtags(content);
  for (const hashtag of hashtags) {
    if (AD_HASHTAGS.includes(hashtag)) {
      indicators.push(`#${hashtag}`);
    }
  }

  // Check phrases
  for (const phrase of AD_PHRASES) {
    if (lowerContent.includes(phrase)) {
      indicators.push(phrase);
    }
  }

  return {
    isAd: indicators.length > 0,
    indicators,
  };
}

/**
 * Use Claude to detect brands mentioned in content
 */
async function detectBrandsWithClaude(
  content: string,
  platform: 'instagram' | 'tiktok' | 'youtube'
): Promise<BrandMention[]> {
  const prompt = `You are a brand detection specialist analyzing social media content.

CONTENT (from ${platform.toUpperCase()}):
${content.slice(0, 3000)}

Analyze this content and extract ALL brand mentions including:
- Product names (Nike, Apple, Dyson, etc.)
- Company names (Amazon, Google, Tesla, etc.)
- Service names (Netflix, Spotify, Uber, etc.)
- Store names (Target, Walmart, Sephora, etc.)
- Food/beverage brands (Starbucks, McDonald's, etc.)

For each brand, determine:
1. The exact brand name
2. The context where it appears (quote the relevant text)
3. Whether it seems like a sponsored/paid mention
4. Your confidence level

Return ONLY a JSON array. If no brands found, return [].

Format:
[
  {
    "brand": "Brand Name",
    "context": "relevant sentence or phrase",
    "isSponsored": true/false,
    "confidence": "high" | "medium" | "low"
  }
]`;

  try {
    const response = await withRetry(async () => {
      return await anthropic.messages.create({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
    });

    const responseContent = response.content[0];
    if (responseContent.type !== 'text') {
      return [];
    }

    // Parse JSON from response
    const jsonMatch = responseContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const brands: BrandMention[] = JSON.parse(jsonMatch[0]);
    return brands;
  } catch (error) {
    console.error('Brand detection with Claude failed:', error);
    return [];
  }
}

/**
 * Main function to detect brands in content
 */
export async function detectBrands(
  content: string,
  platform: 'instagram' | 'tiktok' | 'youtube'
): Promise<BrandDetectionResult> {
  if (!content || content.trim().length === 0) {
    return {
      isAd: false,
      adIndicators: [],
      brands: [],
      summary: 'No content to analyze',
    };
  }

  // Step 1: Check for ad indicators (fast, local)
  const adDetection = detectAdIndicators(content);

  // Step 2: Detect brands with Claude
  const brands = await detectBrandsWithClaude(content, platform);

  // Step 3: Generate summary
  let summary = '';
  if (brands.length === 0) {
    summary = 'No brand mentions detected.';
  } else {
    const sponsoredBrands = brands.filter((b) => b.isSponsored);
    const organicBrands = brands.filter((b) => !b.isSponsored);

    const parts: string[] = [];
    if (sponsoredBrands.length > 0) {
      parts.push(`${sponsoredBrands.length} sponsored brand(s): ${sponsoredBrands.map((b) => b.brand).join(', ')}`);
    }
    if (organicBrands.length > 0) {
      parts.push(`${organicBrands.length} organic mention(s): ${organicBrands.map((b) => b.brand).join(', ')}`);
    }
    summary = parts.join('. ');
  }

  if (adDetection.isAd && !brands.some((b) => b.isSponsored)) {
    summary += ' Ad indicators present but sponsor brand unclear.';
  }

  return {
    isAd: adDetection.isAd || brands.some((b) => b.isSponsored),
    adIndicators: adDetection.indicators,
    brands,
    summary,
  };
}

/**
 * Batch detect brands for multiple posts
 */
export async function detectBrandsBatch(
  posts: Array<{ id: string; content: string }>,
  platform: 'instagram' | 'tiktok' | 'youtube'
): Promise<Map<string, BrandDetectionResult>> {
  const results = new Map<string, BrandDetectionResult>();

  // Process posts sequentially to avoid rate limiting
  for (const post of posts) {
    const result = await detectBrands(post.content, platform);
    results.set(post.id, result);

    // Small delay between API calls
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Get all unique brands mentioned across multiple posts
 */
export function aggregateBrands(
  results: Map<string, BrandDetectionResult>
): {
  allBrands: string[];
  sponsoredBrands: string[];
  hasAds: boolean;
  brandCounts: Map<string, number>;
} {
  const brandCounts = new Map<string, number>();
  const sponsoredBrands = new Set<string>();
  let hasAds = false;

  for (const result of results.values()) {
    if (result.isAd) hasAds = true;

    for (const brand of result.brands) {
      const brandName = brand.brand.toLowerCase();
      brandCounts.set(brandName, (brandCounts.get(brandName) || 0) + 1);

      if (brand.isSponsored) {
        sponsoredBrands.add(brand.brand);
      }
    }
  }

  return {
    allBrands: Array.from(brandCounts.keys()),
    sponsoredBrands: Array.from(sponsoredBrands),
    hasAds,
    brandCounts,
  };
}
