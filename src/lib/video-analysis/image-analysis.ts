/**
 * Image Analysis with Claude Vision
 *
 * Provides image analysis capabilities matching video analysis output:
 * - Brand/logo detection
 * - Text extraction (OCR)
 * - Scene context understanding
 * - Brand safety rating
 *
 * Uses Anthropic Claude's vision capabilities for fast, accurate analysis.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  VisualAnalysis,
  BrandDetection,
  ActionDetection,
  TextDetection,
  ImageAnalysisOptions,
  ProgressCallback,
  SafetyRationale,
  FlagEvidence,
  CategoryScores,
  CategoryScore,
  FlagCategory,
  FlagSeverity,
  FlagSource,
} from '@/types/video-analysis';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use Haiku for fast, cost-effective image analysis
const VISION_MODEL = 'claude-sonnet-4-20250514';

// Configuration
const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  MAX_IMAGE_SIZE_MB: 20,
};

/**
 * Check if Claude Vision is configured
 */
export function isClaudeVisionConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = CONFIG.MAX_RETRIES,
  baseDelayMs: number = CONFIG.RETRY_DELAY_MS
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
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[Claude Vision] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (!isRetryable) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Convert image URL to base64 data URI
 */
async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  // Map content type to supported media types
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
  if (contentType.includes('png')) mediaType = 'image/png';
  else if (contentType.includes('gif')) mediaType = 'image/gif';
  else if (contentType.includes('webp')) mediaType = 'image/webp';

  return { data: base64, mediaType };
}

/**
 * Convert buffer to base64 with media type detection
 */
function bufferToBase64(
  buffer: Buffer
): { data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' } {
  const data = buffer.toString('base64');

  // Detect media type from magic bytes
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) mediaType = 'image/png';
  else if (buffer[0] === 0x47 && buffer[1] === 0x49) mediaType = 'image/gif';
  else if (buffer[0] === 0x52 && buffer[1] === 0x49) mediaType = 'image/webp';

  return { data, mediaType };
}

/**
 * Analyze a single image for brand safety
 */
export async function analyzeImage(
  imageUrl: string,
  imageBuffer?: Buffer
): Promise<VisualAnalysis> {
  if (!isClaudeVisionConfigured()) {
    console.log('[Claude Vision] API key not configured, returning default analysis');
    return getDefaultVisualAnalysis();
  }

  console.log(`[Claude Vision] Analyzing image...`);

  try {
    // Get image data
    let imageData: { data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' };

    if (imageBuffer) {
      imageData = bufferToBase64(imageBuffer);
    } else {
      imageData = await fetchImageAsBase64(imageUrl);
    }

    const prompt = `You are a professional brand safety consultant analyzing this image for a brand partnership evaluation.

Analyze the image thoroughly and return a JSON object with this EXACT structure:

{
  "visual": {
    "description": "Detailed 2-3 sentence description of image content",
    "setting": "Where the image takes place",
    "mood": "Overall tone (e.g., energetic, calm, glamorous)",
    "contentType": "e.g., selfie, product shot, lifestyle, event"
  },

  "safetyAnalysis": {
    "rating": "safe|caution|unsafe",
    "summary": "Professional 2-3 sentence summary explaining the safety assessment.",

    "evidence": [
      {
        "category": "profanity|violence|adult|substances|controversial|dangerous|political",
        "severity": "low|medium|high",
        "source": "visual|text",
        "description": "what was detected",
        "context": "surrounding context explaining why this was flagged"
      }
    ],

    "categoryScores": {
      "profanity": {"score": 0, "reason": "explanation of what was found or looked for"},
      "violence": {"score": 0, "reason": "explanation"},
      "adult": {"score": 0, "reason": "explanation"},
      "substances": {"score": 0, "reason": "explanation"},
      "controversial": {"score": 0, "reason": "explanation"},
      "dangerous": {"score": 0, "reason": "explanation"},
      "political": {"score": 0, "reason": "explanation"}
    }
  },

  "brands": [
    {
      "name": "Brand Name",
      "prominence": "primary|secondary|background",
      "isSponsor": true,
      "confidence": 0.9,
      "sponsorEvidence": "why this appears to be sponsored (if applicable)"
    }
  ],

  "textInImage": ["any", "visible", "text"]
}

IMPORTANT INSTRUCTIONS:
1. Score 0-100 for each category (0 = none detected)
2. Always explain what you looked for even if score is 0
3. Evidence array should be empty for completely safe images
4. For sponsor detection, look for: prominent product placement, tagged brands, promotional context, discount codes
5. Write the summary as a professional consultant delivering findings to a client
6. Be thorough - missing something is worse than over-flagging`;

    const response = await withRetry(async () => {
      return anthropic.messages.create({
        model: VISION_MODEL,
        max_tokens: 1024,
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
    });

    const rawAnalysis =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const analysis = parseComprehensiveImageAnalysis(rawAnalysis);

    console.log(
      `[Claude Vision] Analysis complete: ${analysis.brands.length} brands, ` +
        `safety: ${analysis.brandSafetyRating}`
    );

    return analysis;
  } catch (error) {
    console.error('[Claude Vision] Image analysis error:', error);
    return getDefaultVisualAnalysis();
  }
}

/**
 * Analyze multiple images with concurrency control
 */
export async function analyzeImages(
  images: Array<{ id: string; url: string; buffer?: Buffer }>,
  options?: ImageAnalysisOptions
): Promise<Map<string, VisualAnalysis | null>> {
  const { concurrency = 10, onProgress } = options || {};
  const results = new Map<string, VisualAnalysis | null>();

  let completed = 0;
  let failed = 0;
  const total = images.length;

  console.log(`[Claude Vision] Analyzing ${total} images with concurrency ${concurrency}...`);

  // Process in batches
  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (image) => {
        try {
          const result = await analyzeImage(image.url, image.buffer);
          completed++;
          return { id: image.id, result };
        } catch (error) {
          console.error(`[Claude Vision] Failed to analyze image ${image.id}:`, error);
          completed++;
          failed++;
          return { id: image.id, result: null };
        } finally {
          if (onProgress) {
            onProgress(completed, total, failed);
          }
        }
      })
    );

    for (const { id, result } of batchResults) {
      results.set(id, result);
    }
  }

  console.log(
    `[Claude Vision] Batch complete: ${completed - failed}/${total} succeeded, ${failed} failed`
  );

  return results;
}

/**
 * Helper to parse a category score from the API response
 */
function parseCategoryScore(data: { score?: number; reason?: string } | undefined): CategoryScore {
  return {
    score: data?.score ?? 0,
    reason: data?.reason || 'No analysis available',
    evidenceCount: 0,
  };
}

/**
 * Helper to validate and normalize flag category
 */
function normalizeCategory(category: string): FlagCategory {
  const validCategories: FlagCategory[] = [
    'profanity', 'violence', 'adult', 'substances',
    'controversial', 'dangerous', 'political', 'competitor', 'sponsor'
  ];
  const normalized = category.toLowerCase() as FlagCategory;
  return validCategories.includes(normalized) ? normalized : 'controversial';
}

/**
 * Helper to validate and normalize flag severity
 */
function normalizeSeverity(severity: string): FlagSeverity {
  const validSeverities: FlagSeverity[] = ['low', 'medium', 'high'];
  const normalized = severity.toLowerCase() as FlagSeverity;
  return validSeverities.includes(normalized) ? normalized : 'medium';
}

/**
 * Helper to validate and normalize flag source
 */
function normalizeSource(source: string): FlagSource {
  const validSources: FlagSource[] = ['audio', 'visual', 'text', 'transcript'];
  const normalized = source.toLowerCase() as FlagSource;
  return validSources.includes(normalized) ? normalized : 'visual';
}

/**
 * Parse comprehensive JSON image analysis response
 * Returns structured VisualAnalysis with SafetyRationale matching video analysis format
 */
function parseComprehensiveImageAnalysis(rawText: string): VisualAnalysis {
  try {
    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Claude Vision] No JSON found in response, falling back to legacy parsing');
      return parseVisualAnalysis(rawText);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Parse visual section
    const visual = parsed.visual || {};
    const safetyAnalysis = parsed.safetyAnalysis || {};

    // Parse evidence array
    const evidence: FlagEvidence[] = (safetyAnalysis.evidence || []).map((e: {
      category?: string;
      severity?: string;
      source?: string;
      description?: string;
      context?: string;
    }) => ({
      category: normalizeCategory(e.category || 'controversial'),
      severity: normalizeSeverity(e.severity || 'medium'),
      timestamp: 0, // Images don't have timestamps
      source: normalizeSource(e.source || 'visual'),
      description: e.description || '',
      context: e.context,
    }));

    // Count evidence per category
    const evidenceCounts: Record<string, number> = {};
    for (const e of evidence) {
      evidenceCounts[e.category] = (evidenceCounts[e.category] || 0) + 1;
    }

    // Parse category scores
    const rawCategoryScores = safetyAnalysis.categoryScores || {};
    const categoryScores: CategoryScores = {
      profanity: { ...parseCategoryScore(rawCategoryScores.profanity), evidenceCount: evidenceCounts['profanity'] || 0 },
      violence: { ...parseCategoryScore(rawCategoryScores.violence), evidenceCount: evidenceCounts['violence'] || 0 },
      adult: { ...parseCategoryScore(rawCategoryScores.adult), evidenceCount: evidenceCounts['adult'] || 0 },
      substances: { ...parseCategoryScore(rawCategoryScores.substances), evidenceCount: evidenceCounts['substances'] || 0 },
      controversial: { ...parseCategoryScore(rawCategoryScores.controversial), evidenceCount: evidenceCounts['controversial'] || 0 },
      dangerous: { ...parseCategoryScore(rawCategoryScores.dangerous), evidenceCount: evidenceCounts['dangerous'] || 0 },
      political: { ...parseCategoryScore(rawCategoryScores.political), evidenceCount: evidenceCounts['political'] || 0 },
    };

    // Build SafetyRationale
    const safetyRationale: SafetyRationale = {
      summary: safetyAnalysis.summary || '',
      evidence,
      categoryScores,
      coverageStats: {
        videoDuration: 0, // Not applicable for images
        transcriptWords: 0,
        framesAnalyzed: 1, // Single image
      },
    };

    // Determine safety rating
    const safetyRating = safetyAnalysis.rating?.toLowerCase() || 'safe';

    // Extract concerns from evidence for backwards compatibility
    const concerns = evidence
      .filter(e => e.severity === 'medium' || e.severity === 'high')
      .map(e => e.description || `${e.category} detected`)
      .slice(0, 5);

    // Parse brands with sponsor detection
    const brands: BrandDetection[] = (parsed.brands || []).map((b: {
      name: string;
      prominence?: string;
      isSponsor?: boolean;
      confidence?: number;
      sponsorEvidence?: string;
    }) => ({
      brand: b.name,
      confidence: b.confidence && b.confidence >= 0.7 ? 'high' as const :
                  b.confidence && b.confidence >= 0.4 ? 'medium' as const : 'low' as const,
      confidenceScore: b.confidence,
      context: b.sponsorEvidence || `Detected in image (${b.prominence || 'unknown'} placement)`,
      detectionMethod: 'visual' as const,
      appearsSponsor: b.isSponsor || false,
    }));

    // Parse text in image
    const textInImage: TextDetection[] = (parsed.textInImage || [])
      .filter((t: string) => t && t.toLowerCase() !== 'none')
      .map((t: string) => ({
        text: t,
        context: 'Detected in image via Claude Vision',
      }));

    const result: VisualAnalysis = {
      description: visual.description || '',
      brands,
      actions: [], // Images don't have actions
      textInVideo: textInImage,
      sceneContext: {
        setting: visual.setting || '',
        mood: visual.mood || '',
        contentType: visual.contentType || '',
        concerns,
      },
      brandSafetyRating: safetyRating as 'safe' | 'caution' | 'unsafe',
      rawAnalysis: rawText,
      safetyRationale,
    };

    return result;
  } catch (error) {
    console.error('[Claude Vision] Failed to parse comprehensive analysis:', error);
    // Fall back to legacy parsing
    return parseVisualAnalysis(rawText);
  }
}

/**
 * Parse the raw analysis text into structured format (legacy format)
 */
function parseVisualAnalysis(rawText: string): VisualAnalysis {
  const lines = rawText.split('\n');
  const result: VisualAnalysis = {
    description: '',
    brands: [],
    actions: [],
    textInVideo: [],
    sceneContext: {
      setting: '',
      mood: '',
      contentType: '',
      concerns: [],
    },
    brandSafetyRating: 'safe',
    rawAnalysis: rawText,
  };

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim().toUpperCase();
    const value = line.slice(colonIndex + 1).trim();

    switch (key) {
      case 'DESCRIPTION':
        result.description = value;
        break;

      case 'BRANDS':
        result.brands = parseBrands(value);
        break;

      case 'TEXT':
        result.textInVideo = parseTextDetections(value);
        break;

      case 'SETTING':
        result.sceneContext.setting = value;
        break;

      case 'MOOD':
        result.sceneContext.mood = value;
        break;

      case 'CONTENT_TYPE':
        result.sceneContext.contentType = value;
        break;

      case 'CONCERNS':
        result.sceneContext.concerns = value
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c && c.toLowerCase() !== 'none');
        break;

      case 'SAFETY_RATING':
        const rating = value.toLowerCase();
        if (rating === 'caution' || rating === 'unsafe') {
          result.brandSafetyRating = rating;
        }
        break;
    }
  }

  return result;
}

/**
 * Parse brand detections from text
 */
function parseBrands(text: string): BrandDetection[] {
  if (!text || text.toLowerCase() === 'none') return [];

  return text
    .split(',')
    .map((item) => {
      const match = item.match(/(.+?)\s*\((\w+)\s*confidence\)/i);
      if (match) {
        return {
          brand: match[1].trim(),
          confidence:
            (match[2].toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
          context: 'Detected in image via Claude Vision',
          detectionMethod: 'visual' as const,
        };
      }
      return {
        brand: item.trim(),
        confidence: 'medium' as const,
        context: 'Detected in image via Claude Vision',
        detectionMethod: 'visual' as const,
      };
    })
    .filter((b) => b.brand && b.brand.toLowerCase() !== 'none');
}

/**
 * Parse text detections from analysis
 */
function parseTextDetections(text: string): TextDetection[] {
  if (!text || text.toLowerCase() === 'none') return [];

  return text
    .split(',')
    .map((item) => ({
      text: item.trim(),
      context: 'Detected in image via Claude Vision',
    }))
    .filter((t) => t.text && t.text.toLowerCase() !== 'none');
}

/**
 * Get default visual analysis when analysis fails
 */
function getDefaultVisualAnalysis(): VisualAnalysis {
  return {
    description: 'Unable to analyze visual content',
    brands: [],
    actions: [],
    textInVideo: [],
    sceneContext: {
      setting: 'Unknown',
      mood: 'Unknown',
      contentType: 'Unknown',
      concerns: [],
    },
    brandSafetyRating: 'caution',
    rawAnalysis: '',
  };
}
