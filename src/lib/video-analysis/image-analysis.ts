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

    const prompt = `Analyze this social media image for brand safety. Provide a structured analysis:

1. VISUAL DESCRIPTION: Describe the visual content, setting, and what's happening
2. BRANDS/LOGOS: List any brands, logos, or products visible (with confidence level: high/medium/low)
3. ON-SCREEN TEXT: List any text visible in the image
4. SCENE CONTEXT: Describe the setting, mood, and type of content
5. BRAND SAFETY: Rate as safe/caution/unsafe and explain why

Format your response EXACTLY as follows (use these exact labels):
DESCRIPTION: [description]
BRANDS: [brand1 (high confidence), brand2 (medium confidence), ...] or "none"
TEXT: [text1, text2, ...] or "none"
SETTING: [setting description]
MOOD: [mood description]
CONTENT_TYPE: [e.g., selfie, product shot, lifestyle, etc.]
CONCERNS: [concern1, concern2, ...] or "none"
SAFETY_RATING: [safe/caution/unsafe]
SAFETY_REASON: [explanation]`;

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

    const analysis = parseVisualAnalysis(rawAnalysis);

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
 * Parse the raw analysis text into structured format
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
