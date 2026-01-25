/**
 * Twelve Labs Video Understanding Integration
 *
 * Provides video analysis capabilities beyond transcription:
 * - Speech-to-text transcription
 * - Visual content analysis
 * - Logo/brand detection
 * - Action recognition
 * - On-screen text reading (OCR)
 * - Scene context understanding
 *
 * API Docs: https://docs.twelvelabs.io/
 *
 * Cost: ~$0.033/minute for indexing + analyze calls
 * Free tier: 600 minutes/month
 */

import {
  VisualAnalysis,
  VideoAnalysisResult,
  TwelveLabsIndexResult,
  TwelveLabsTranscript,
  BrandDetection,
  ActionDetection,
  TextDetection,
  LogoDetection,
  ContentClassification,
  SafetyRationale,
  FlagEvidence,
  CategoryScore,
  CategoryScores,
  FlagCategory,
  FlagSeverity,
  FlagSource,
} from '@/types/video-analysis';

// Twelve Labs API configuration
const TWELVE_LABS_API_BASE = 'https://api.twelvelabs.io/v1.3';

// Index configuration
const INDEX_NAME = 'orca-brand-safety';

// Configuration - optimized for faster polling with adaptive backoff
const CONFIG = {
  INDEXING_TIMEOUT_MS: 600000, // 10 minutes (for longer videos)
  INITIAL_POLL_INTERVAL_MS: 2000, // Start with 2 seconds (was 5s)
  MIN_POLL_INTERVAL_MS: 1000, // Minimum 1 second
  MAX_POLL_INTERVAL_MS: 10000, // Maximum 10 seconds
  BACKOFF_MULTIPLIER: 1.5, // Exponential backoff factor
  MAX_VIDEO_DURATION_SEC: 600, // 10 minutes max
};

// Module-level cache for index ID to avoid redundant API calls
let cachedIndexId: string | null = null;

/**
 * Check if Twelve Labs is configured
 */
export function isTwelveLabsConfigured(): boolean {
  return !!process.env.TWELVE_LABS_API_KEY;
}

/**
 * Get API headers
 */
function getHeaders(): HeadersInit {
  return {
    'x-api-key': process.env.TWELVE_LABS_API_KEY || '',
    'Content-Type': 'application/json',
  };
}

/**
 * Get or create the Orca brand safety index
 * Uses module-level cache to avoid redundant API calls
 */
async function getOrCreateIndex(): Promise<string> {
  // Return cached index ID if available
  if (cachedIndexId) {
    return cachedIndexId;
  }

  // First, try to find existing index
  const listResponse = await fetch(`${TWELVE_LABS_API_BASE}/indexes`, {
    headers: getHeaders(),
  });

  if (!listResponse.ok) {
    throw new Error(`Failed to list indexes: ${listResponse.status}`);
  }

  const listData = await listResponse.json();
  const existingIndex = listData.data?.find(
    (index: { index_name: string }) => index.index_name === INDEX_NAME
  );

  if (existingIndex) {
    console.log(`[Twelve Labs] Using existing index: ${existingIndex._id}`);
    cachedIndexId = existingIndex._id;
    return existingIndex._id;
  }

  // Create new index with required engines
  console.log(`[Twelve Labs] Creating new index: ${INDEX_NAME}`);

  const createResponse = await fetch(`${TWELVE_LABS_API_BASE}/indexes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      index_name: INDEX_NAME,
      models: [
        {
          // Note: marengo3.0 only supports 'visual' and 'audio' options
          // Logo detection works via the summarize API with prompts
          model_name: 'marengo3.0',
          model_options: ['visual', 'audio'],
        },
        {
          model_name: 'pegasus1.2',
          model_options: ['visual', 'audio'],
        },
      ],
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create index: ${createResponse.status} - ${errorText}`);
  }

  const createData = await createResponse.json();
  console.log(`[Twelve Labs] Created index: ${createData._id}`);
  cachedIndexId = createData._id;
  return createData._id;
}

/**
 * Upload video from URL to Twelve Labs for indexing
 */
async function indexVideoFromUrl(
  indexId: string,
  videoUrl: string
): Promise<{ taskId: string }> {
  const formData = new FormData();
  formData.append('index_id', indexId);
  formData.append('video_url', videoUrl);

  const response = await fetch(`${TWELVE_LABS_API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.TWELVE_LABS_API_KEY || '',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create indexing task: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return { taskId: data._id };
}

/**
 * Validate video buffer before upload
 * Checks for minimum size and MP4 magic bytes
 */
function validateVideoBuffer(buffer: Buffer): { valid: boolean; error?: string } {
  if (buffer.length < 12) {
    return { valid: false, error: 'Buffer too small to be a valid video' };
  }
  // Check for MP4 magic bytes (ftyp at offset 4)
  if (buffer.slice(4, 8).toString('ascii') === 'ftyp') {
    return { valid: true };
  }
  // Check for WebM magic bytes (1A 45 DF A3 at offset 0)
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { valid: true };
  }
  // Allow other formats but log a warning
  console.warn('[Twelve Labs] Unrecognized video format, proceeding anyway');
  return { valid: true };
}

/**
 * Upload video buffer to Twelve Labs for indexing
 */
async function indexVideoFromBuffer(
  indexId: string,
  buffer: Buffer,
  filename: string = 'video.mp4',
  contentType: string = 'video/mp4'
): Promise<{ taskId: string }> {
  // Validate buffer before upload
  const validation = validateVideoBuffer(buffer);
  if (!validation.valid) {
    throw new Error(`Invalid video buffer: ${validation.error}`);
  }

  const formData = new FormData();
  formData.append('index_id', indexId);

  // Use Uint8Array for reliable buffer conversion + specify MIME type
  const uint8Array = new Uint8Array(buffer);
  const blob = new Blob([uint8Array], { type: contentType });

  formData.append('video_file', blob, filename);

  const response = await fetch(`${TWELVE_LABS_API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.TWELVE_LABS_API_KEY || '',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create indexing task: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return { taskId: data._id };
}

/**
 * Wait for indexing task to complete with adaptive polling
 * Uses exponential backoff and respects API's estimated_time when available
 */
async function waitForIndexing(taskId: string): Promise<TwelveLabsIndexResult> {
  const startTime = Date.now();
  let currentInterval = CONFIG.INITIAL_POLL_INTERVAL_MS;
  let pollCount = 0;

  while (Date.now() - startTime < CONFIG.INDEXING_TIMEOUT_MS) {
    const response = await fetch(`${TWELVE_LABS_API_BASE}/tasks/${taskId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to check task status: ${response.status}`);
    }

    const data = await response.json();
    const status = data.status;
    pollCount++;

    if (status === 'ready') {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Twelve Labs] Indexing complete in ${elapsed}s (${pollCount} polls)`);
      // v1.3 API: Duration is in system_metadata, not metadata
      const duration = data.system_metadata?.duration || data.metadata?.duration;
      if (!duration) {
        console.warn('[Twelve Labs] Duration not found in response (checked system_metadata and metadata)');
      }
      return {
        indexId: data.index_id,
        videoId: data.video_id,
        status: 'ready',
        duration,
      };
    }

    if (status === 'failed') {
      console.error(`[Twelve Labs] Indexing failed:`, data.error_message);
      return {
        indexId: data.index_id,
        videoId: data.video_id || '',
        status: 'failed',
      };
    }

    // Adaptive polling: use API's estimated_time if available
    let nextInterval = currentInterval;

    if (data.estimated_time && data.estimated_time > 0) {
      // Use 30% of estimated time as poll interval, with bounds
      const estimatedWait = Math.max(
        CONFIG.MIN_POLL_INTERVAL_MS,
        Math.min(CONFIG.MAX_POLL_INTERVAL_MS, data.estimated_time * 300)
      );
      nextInterval = estimatedWait;
      console.log(`[Twelve Labs] Indexing... ETA: ${data.estimated_time}s, next poll in ${(nextInterval / 1000).toFixed(1)}s`);
    } else {
      // Exponential backoff when no estimate available
      nextInterval = Math.min(
        CONFIG.MAX_POLL_INTERVAL_MS,
        currentInterval * CONFIG.BACKOFF_MULTIPLIER
      );
      console.log(`[Twelve Labs] Indexing in progress... next poll in ${(nextInterval / 1000).toFixed(1)}s`);
    }

    await new Promise((resolve) => setTimeout(resolve, nextInterval));
    currentInterval = nextInterval;
  }

  throw new Error('Indexing timed out');
}

/**
 * Get transcript from indexed video
 * Note: v1.3 API uses query param instead of separate endpoint
 */
async function getTranscript(
  indexId: string,
  videoId: string
): Promise<TwelveLabsTranscript> {
  // v1.3 API: Use query param instead of separate /transcription endpoint
  const response = await fetch(
    `${TWELVE_LABS_API_BASE}/indexes/${indexId}/videos/${videoId}?transcription=true`,
    {
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    console.error(`[Twelve Labs] Failed to get transcript: ${response.status}`);
    // Transcription might not be available for some videos
    if (response.status === 404) {
      return { text: '' };
    }
    throw new Error(`Failed to get transcript: ${response.status}`);
  }

  const data = await response.json();

  // v1.3 API: Transcription is in data.transcription array (not data.data)
  const transcription = data.transcription || [];

  if (transcription.length === 0) {
    console.log('[Twelve Labs] No transcription segments found (video may have no speech)');
    return { text: '' };
  }

  const text = transcription.map((seg: { value: string }) => seg.value).join(' ');
  const segments = transcription.map((seg: { value: string; start: number; end: number }) => ({
    text: seg.value,
    start: seg.start,
    end: seg.end,
  }));

  return { text, segments };
}

/**
 * Combined analysis result from batch summarize
 */
interface CombinedAnalysisResult {
  visualAnalysis: VisualAnalysis;
  logoDetections: LogoDetection[];
  contentClassification: ContentClassification;
}

/**
 * Perform comprehensive brand safety analysis in a single API call
 * This combines visual analysis, logo detection, and content classification
 * into one request, reducing API costs by ~60%
 */
async function analyzeComprehensive(
  indexId: string,
  videoId: string
): Promise<CombinedAnalysisResult> {
  console.log('[Twelve Labs] Running comprehensive analysis (combined API call)...');

  const prompt = `You are a professional brand safety consultant analyzing this video for a brand partnership evaluation.

Analyze the ENTIRE video thoroughly and return a JSON object with this EXACT structure:

{
  "visual": {
    "description": "Detailed 2-3 sentence description of video content",
    "setting": "Where the video takes place",
    "mood": "Overall tone (e.g., energetic, calm, humorous)",
    "contentType": "e.g., motivational speech, product review, comedy skit",
    "textInVideo": ["any", "on-screen", "text"],
    "actions": [{"action": "description", "isConcerning": true, "reason": "if concerning"}]
  },

  "safetyAnalysis": {
    "rating": "safe|caution|unsafe",
    "summary": "Professional 2-3 sentence summary explaining the safety assessment. Write as a brand safety consultant would to a client.",

    "evidence": [
      {
        "category": "profanity|violence|adult|substances|controversial|dangerous|political",
        "severity": "low|medium|high",
        "timestamp": 0,
        "source": "audio|visual|text",
        "quote": "exact words if applicable",
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
      "appearances": [{"startTime": 0, "endTime": 5, "prominence": "primary|secondary|background"}],
      "isSponsor": true,
      "confidence": 0.9,
      "sponsorEvidence": "why this appears to be sponsored (if applicable)"
    }
  ]
}

IMPORTANT INSTRUCTIONS:
1. For EVERY concern, provide the exact timestamp (in seconds) and quote/description
2. If audio contains profanity, quote the exact words
3. If something visual is concerning, describe exactly what and when
4. Write the summary as a professional consultant delivering findings to a client
5. A score of 0 means "none detected" - always explain what you looked for
6. Be thorough - missing something is worse than over-flagging
7. The evidence array should be empty for completely "safe" videos`;

  const response = await fetch(`${TWELVE_LABS_API_BASE}/summarize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      video_id: videoId,
      type: 'summary',
      prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Twelve Labs] Comprehensive analysis failed: ${response.status} - ${errorText}`);
    return {
      visualAnalysis: getDefaultVisualAnalysis(),
      logoDetections: [],
      contentClassification: { labels: [], overallSafetyScore: 0.5 },
    };
  }

  const data = await response.json();
  const rawResponse = data.summary || '';

  return parseCombinedAnalysis(rawResponse);
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
 * Parse combined analysis JSON response
 */
function parseCombinedAnalysis(rawText: string): CombinedAnalysisResult {
  try {
    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Parse visual analysis
    const visual = parsed.visual || {};
    const safetyAnalysis = parsed.safetyAnalysis || {};

    // Parse evidence array
    const evidence: FlagEvidence[] = (safetyAnalysis.evidence || []).map((e: {
      category?: string;
      severity?: string;
      timestamp?: number;
      endTimestamp?: number;
      source?: string;
      quote?: string;
      description?: string;
      context?: string;
    }) => ({
      category: normalizeCategory(e.category || 'controversial'),
      severity: normalizeSeverity(e.severity || 'medium'),
      timestamp: e.timestamp || 0,
      endTimestamp: e.endTimestamp,
      source: normalizeSource(e.source || 'visual'),
      quote: e.quote,
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
        videoDuration: 0,  // filled in later from indexInfo
        transcriptWords: 0,
        framesAnalyzed: 0,
      },
    };

    // Determine safety rating from safetyAnalysis or fall back to legacy visual field
    const safetyRating = safetyAnalysis.rating || visual.safetyRating || 'safe';

    // Extract concerns from evidence for backwards compatibility
    const concerns = evidence
      .filter(e => e.severity === 'medium' || e.severity === 'high')
      .map(e => e.description || e.quote || `${e.category} detected`)
      .slice(0, 5);

    const visualAnalysis: VisualAnalysis = {
      description: visual.description || '',
      brands: (parsed.brands || []).map((b: { name: string; confidence?: number }) => ({
        brand: b.name,
        confidence: b.confidence && b.confidence >= 0.7 ? 'high' : b.confidence && b.confidence >= 0.4 ? 'medium' : 'low',
        context: 'Detected via comprehensive analysis',
        detectionMethod: 'visual' as const,
      })),
      actions: (visual.actions || []).map((a: { action: string; isConcerning?: boolean; reason?: string }) => ({
        action: a.action,
        isConcerning: a.isConcerning || false,
        reason: a.reason,
      })),
      textInVideo: (visual.textInVideo || []).map((t: string) => ({
        text: t,
        context: 'Detected via comprehensive analysis',
      })),
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

    // Parse logo detections
    const logoDetections: LogoDetection[] = (parsed.brands || []).map((b: {
      name: string;
      appearances?: Array<{ startTime?: number; endTime?: number; prominence?: string }>;
      isSponsor?: boolean;
      confidence?: number;
    }) => ({
      brand: b.name,
      appearances: (b.appearances || [{ startTime: 0, endTime: 5 }]).map((a) => ({
        startTime: a.startTime || 0,
        endTime: a.endTime || 5,
        confidence: b.confidence || 0.7,
        prominence: (a.prominence as 'primary' | 'secondary' | 'background') || 'secondary',
      })),
      totalDuration: (b.appearances || []).reduce((sum, a) => sum + ((a.endTime || 5) - (a.startTime || 0)), 0) || 5,
      likelySponsor: b.isSponsor || false,
    }));

    // Build content classification from category scores
    const labels: ContentClassification['labels'] = [];
    const categoryToLabel: Record<keyof CategoryScores, string> = {
      profanity: 'profanity',
      violence: 'violence',
      adult: 'adult_content',
      substances: 'substance_use',
      controversial: 'controversial',
      dangerous: 'dangerous_activities',
      political: 'political',
    };

    for (const [category, label] of Object.entries(categoryToLabel)) {
      const score = categoryScores[category as keyof CategoryScores];
      if (score) {
        labels.push({
          label,
          duration: 1.0,
          confidence: score.score / 100,
        });
      }
    }

    // Calculate overall safety score (inverse of average risk)
    const riskScores = Object.values(categoryScores).map(c => c.score);
    const avgRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
    const overallSafetyScore = Math.max(0, Math.min(1, 1 - (avgRisk / 100)));

    return {
      visualAnalysis,
      logoDetections,
      contentClassification: { labels, overallSafetyScore },
    };
  } catch (error) {
    console.error('[Twelve Labs] Failed to parse combined analysis:', error);
    return {
      visualAnalysis: getDefaultVisualAnalysis(),
      logoDetections: [],
      contentClassification: { labels: [], overallSafetyScore: 0.5 },
    };
  }
}

/**
 * Analyze video for brand safety using Twelve Labs generate endpoint
 * (Legacy function - use analyzeComprehensive for cost savings)
 */
async function analyzeForBrandSafety(
  indexId: string,
  videoId: string
): Promise<VisualAnalysis> {
  const prompt = `Analyze this social media video for brand safety. Provide a structured analysis:

1. VISUAL DESCRIPTION: Describe the visual content, setting, and what's happening
2. BRANDS/LOGOS: List any brands, logos, or products visible (with confidence level)
3. ACTIONS: Note any potentially controversial actions or gestures
4. ON-SCREEN TEXT: List any text visible in the video
5. SCENE CONTEXT: Describe the setting, mood, and type of content
6. BRAND SAFETY: Rate as safe/caution/unsafe and explain why

Format your response as:
DESCRIPTION: [description]
BRANDS: [brand1 (high/medium/low confidence), brand2, ...]
ACTIONS: [action1 - concerning/not concerning, action2, ...]
TEXT: [text1, text2, ...]
SETTING: [setting description]
MOOD: [mood description]
CONTENT_TYPE: [e.g., vlog, tutorial, comedy skit, etc.]
CONCERNS: [concern1, concern2, ...]
SAFETY_RATING: [safe/caution/unsafe]
SAFETY_REASON: [explanation]`;

  const response = await fetch(`${TWELVE_LABS_API_BASE}/summarize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      video_id: videoId,
      type: 'summary',
      prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Twelve Labs] Analysis failed: ${response.status} - ${errorText}`);
    return getDefaultVisualAnalysis();
  }

  const data = await response.json();
  const rawAnalysis = data.summary || '';

  // Parse the structured response
  return parseVisualAnalysis(rawAnalysis);
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
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    switch (key.trim().toUpperCase()) {
      case 'DESCRIPTION':
        result.description = value;
        break;

      case 'BRANDS':
        result.brands = parseBrands(value);
        break;

      case 'ACTIONS':
        result.actions = parseActions(value);
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
          .filter(Boolean);
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
          confidence: (match[2].toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
          context: 'Detected in video',
        };
      }
      return {
        brand: item.trim(),
        confidence: 'medium' as const,
        context: 'Detected in video',
      };
    })
    .filter((b) => b.brand);
}

/**
 * Parse action detections from text
 */
function parseActions(text: string): ActionDetection[] {
  if (!text || text.toLowerCase() === 'none') return [];

  return text
    .split(',')
    .map((item) => {
      const concerning = item.toLowerCase().includes('concerning');
      const action = item.replace(/\s*-\s*(concerning|not concerning)/i, '').trim();
      return {
        action,
        isConcerning: concerning,
        reason: concerning ? 'Flagged as potentially concerning' : undefined,
      };
    })
    .filter((a) => a.action);
}

/**
 * Parse text detections from text
 */
function parseTextDetections(text: string): TextDetection[] {
  if (!text || text.toLowerCase() === 'none') return [];

  return text
    .split(',')
    .map((item) => ({
      text: item.trim(),
      context: 'Detected in video',
    }))
    .filter((t) => t.text);
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

/**
 * Detect all logos/brands in video using summarize endpoint
 * Returns all detected brands with timestamps and prominence
 */
export async function detectAllLogos(
  indexId: string,
  videoId: string
): Promise<LogoDetection[]> {
  console.log('[Twelve Labs] Detecting logos...');

  // Use the summarize endpoint with a specific prompt for logo detection
  const response = await fetch(`${TWELVE_LABS_API_BASE}/summarize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      video_id: videoId,
      type: 'summary',
      prompt: `Identify ALL brand logos, company names, product brands, and sponsored content visible in this video.

For EACH brand/logo found, provide:
BRAND: [exact brand name]
TIME: [approximate start time in seconds]-[end time in seconds]
PROMINENCE: [primary if featured prominently, secondary if clearly visible, background if subtle]
CONTEXT: [how it appears - worn, held, displayed, mentioned, etc.]

If the video mentions or shows a brand partnership (like "@Prada" in caption or prominent brand display), mark it as:
SPONSOR: [yes/no]

List each brand on separate lines. If no brands are visible, respond with: NO_BRANDS_DETECTED`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Twelve Labs] Logo detection failed: ${response.status} - ${errorText}`);
    return [];
  }

  const data = await response.json();
  const summaryText = data.summary || '';

  // Log raw response for debugging
  if (summaryText) {
    console.log(`[Twelve Labs] Logo detection response: ${summaryText.slice(0, 200)}${summaryText.length > 200 ? '...' : ''}`);
  }

  // Parse the summary to extract logo information
  const logos = parseLogoDetectionResponse(summaryText);

  console.log(`[Twelve Labs] Detected ${logos.length} unique logos/brands`);
  return logos;
}

/**
 * Parse logo detection response from summarize endpoint
 */
function parseLogoDetectionResponse(text: string): LogoDetection[] {
  const logoMap = new Map<string, LogoDetection>();

  // Check for "no brands detected" response
  if (text.toLowerCase().includes('no_brands_detected') ||
      text.toLowerCase().includes('no brands') ||
      text.toLowerCase().includes('no logos') ||
      text.toLowerCase().includes('none visible')) {
    console.log('[Twelve Labs] Logo detection: No brands found in video');
    return [];
  }

  // Try to parse structured format: BRAND: [name]
  const brandPattern = /BRAND:\s*([^\n,]+)/gi;
  const timePattern = /TIME:\s*(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?/i;
  const prominencePattern = /PROMINENCE:\s*(primary|secondary|background)/i;
  const sponsorPattern = /SPONSOR:\s*(yes|no)/i;

  // Split by BRAND: to process each entry
  const entries = text.split(/(?=BRAND:)/i).filter(e => e.trim());

  for (const entry of entries) {
    const brandMatch = entry.match(/BRAND:\s*([^\n,]+)/i);
    if (!brandMatch) continue;

    const brandName = brandMatch[1].trim();
    if (!brandName || brandName.toLowerCase() === 'none' || brandName.length < 2) {
      continue;
    }

    const timeMatch = entry.match(timePattern);
    const prominenceMatch = entry.match(prominencePattern);
    const sponsorMatch = entry.match(sponsorPattern);

    const startTime = timeMatch ? parseFloat(timeMatch[1]) : 0;
    const endTime = timeMatch && timeMatch[2] ? parseFloat(timeMatch[2]) : startTime + 3;
    const prominence = (prominenceMatch?.[1]?.toLowerCase() as 'primary' | 'secondary' | 'background') || 'secondary';
    const isSponsor = sponsorMatch?.[1]?.toLowerCase() === 'yes';

    const normalizedBrand = brandName.toLowerCase();
    const existing = logoMap.get(normalizedBrand);

    const appearance = {
      startTime,
      endTime,
      confidence: prominence === 'primary' ? 0.9 : prominence === 'secondary' ? 0.7 : 0.5,
      prominence,
    };

    if (existing) {
      existing.appearances.push(appearance);
      existing.totalDuration += endTime - startTime;
      existing.likelySponsor = existing.likelySponsor || isSponsor;
    } else {
      logoMap.set(normalizedBrand, {
        brand: brandName,
        appearances: [appearance],
        totalDuration: endTime - startTime,
        likelySponsor: isSponsor,
      });
    }
  }

  // If no structured matches, try to extract brand names from free-form text
  if (logoMap.size === 0 && text.length > 10) {
    // Extended list of common brands
    const commonBrands = [
      // Fashion
      'Nike', 'Adidas', 'Puma', 'Gucci', 'Louis Vuitton', 'Prada', 'Chanel',
      'Supreme', 'Balenciaga', 'Dior', 'Versace', 'Fendi', 'Burberry', 'Hermes',
      'Zara', 'H&M', 'Uniqlo', 'Levi\'s', 'Calvin Klein', 'Tommy Hilfiger',
      'Ralph Lauren', 'Under Armour', 'New Balance', 'Reebok', 'Vans', 'Converse',
      // Tech
      'Apple', 'Samsung', 'Google', 'Microsoft', 'Sony', 'LG', 'Dell', 'HP',
      'Lenovo', 'Huawei', 'OnePlus', 'Xiaomi', 'Beats', 'Bose', 'JBL',
      // Food/Beverage
      'Coca-Cola', 'Pepsi', 'McDonald\'s', 'Starbucks', 'Dunkin', 'Red Bull',
      'Monster', 'Gatorade', 'Budweiser', 'Corona', 'Heineken',
      // Other
      'Amazon', 'Netflix', 'Disney', 'Spotify', 'TikTok', 'Instagram', 'YouTube',
      'Honda', 'Toyota', 'BMW', 'Mercedes', 'Tesla', 'Ford', 'Audi', 'Porsche',
    ];

    for (const brand of commonBrands) {
      const regex = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        // Check context for sponsorship indicators
        const isSponsor = text.toLowerCase().includes('sponsor') ||
                         text.toLowerCase().includes('partner') ||
                         text.toLowerCase().includes('prominently');

        logoMap.set(brand.toLowerCase(), {
          brand,
          appearances: [{
            startTime: 0,
            endTime: 5,
            confidence: 0.6,
            prominence: 'secondary',
          }],
          totalDuration: 5,
          likelySponsor: isSponsor,
        });
      }
    }
  }

  // Determine sponsor status based on prominence
  const logos = Array.from(logoMap.values()).map((logo) => {
    logo.appearances.sort((a, b) => a.startTime - b.startTime);

    if (!logo.likelySponsor) {
      const hasPrimaryAppearance = logo.appearances.some(
        (a) => a.prominence === 'primary' && a.confidence > 0.7
      );
      const significantDuration = logo.totalDuration > 5;
      logo.likelySponsor = hasPrimaryAppearance || significantDuration;
    }

    return logo;
  });

  return logos;
}

/**
 * Classify video content for brand safety
 * Uses summarize endpoint to analyze content categories
 */
export async function classifyContent(
  indexId: string,
  videoId: string
): Promise<ContentClassification> {
  console.log('[Twelve Labs] Classifying content for brand safety...');

  const response = await fetch(`${TWELVE_LABS_API_BASE}/summarize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      video_id: videoId,
      type: 'summary',
      prompt: `Analyze this video for brand safety. Rate each category from 0-100:

BRAND_SAFE: [score] (100 = completely appropriate for brand advertising)
CONTROVERSIAL: [score] (0 = none, 100 = highly controversial)
ADULT_CONTENT: [score] (0 = none, 100 = explicit content)
VIOLENCE: [score] (0 = none, 100 = graphic violence)
POLITICAL: [score] (0 = none, 100 = heavily political)
SUBSTANCE_USE: [score] (0 = none, 100 = prominent drug/alcohol use)
DANGEROUS_ACTIVITIES: [score] (0 = none, 100 = very dangerous stunts)

OVERALL_SAFETY: [score] (0-100, where 100 is safest for brands)

Provide scores based on visual and audio content analysis.`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Twelve Labs] Classification failed: ${response.status} - ${errorText}`);
    return { labels: [], overallSafetyScore: 0.7 };
  }

  const data = await response.json();
  const summaryText = data.summary || '';

  // Log raw response for debugging
  if (summaryText) {
    console.log(`[Twelve Labs] Classification response: ${summaryText.slice(0, 200)}${summaryText.length > 200 ? '...' : ''}`);
  }

  // Parse the classification response
  return parseClassificationResponse(summaryText);
}

/**
 * Parse classification response from generate endpoint
 */
function parseClassificationResponse(text: string): ContentClassification {
  const labels: ContentClassification['labels'] = [];
  let overallSafetyScore = 0.7;  // Default to moderately safe

  const categories = [
    'BRAND_SAFE',
    'CONTROVERSIAL',
    'ADULT_CONTENT',
    'VIOLENCE',
    'POLITICAL',
    'SUBSTANCE_USE',
    'DANGEROUS_ACTIVITIES',
  ];

  for (const category of categories) {
    const pattern = new RegExp(`${category}:\\s*(\\d+)`, 'i');
    const match = text.match(pattern);

    if (match) {
      const score = parseInt(match[1], 10) / 100;
      labels.push({
        label: category.toLowerCase(),
        duration: 1.0,  // Represents whole video
        confidence: score,
      });
    }
  }

  // Extract overall safety score
  const overallMatch = text.match(/OVERALL_SAFETY:\s*(\d+)/i);
  if (overallMatch) {
    overallSafetyScore = parseInt(overallMatch[1], 10) / 100;
  } else if (labels.length > 0) {
    // Calculate from individual scores
    const brandSafe = labels.find(l => l.label === 'brand_safe')?.confidence || 0.7;
    const negativeScores = labels
      .filter(l => l.label !== 'brand_safe')
      .map(l => l.confidence);
    const avgNegative = negativeScores.length > 0
      ? negativeScores.reduce((a, b) => a + b, 0) / negativeScores.length
      : 0;
    overallSafetyScore = Math.max(0, Math.min(1, brandSafe * (1 - avgNegative * 0.5)));
  }

  console.log(`[Twelve Labs] Classification complete: safety score ${(overallSafetyScore * 100).toFixed(0)}%`);

  return {
    labels,
    overallSafetyScore,
  };
}

/**
 * Convert logo detections to brand detections for integration with existing system
 */
function convertLogosToBrands(logos: LogoDetection[]): BrandDetection[] {
  return logos.flatMap((logo) =>
    logo.appearances.map((appearance) => ({
      brand: logo.brand,
      confidence: appearance.confidence >= 0.7 ? 'high' as const :
                  appearance.confidence >= 0.4 ? 'medium' as const : 'low' as const,
      confidenceScore: appearance.confidence,
      startTime: appearance.startTime,
      endTime: appearance.endTime,
      context: `Detected via logo recognition (${appearance.prominence} placement)`,
      detectionMethod: 'visual' as const,
      appearsSponsor: logo.likelySponsor,
    }))
  );
}

/**
 * Merge brand detections from visual analysis and logo detection
 * Prioritizes logo detection results (more accurate timestamps/confidence)
 */
function mergeBrandDetections(
  visualBrands: BrandDetection[],
  logoBrands: BrandDetection[]
): BrandDetection[] {
  const brandMap = new Map<string, BrandDetection[]>();

  // Add logo brands first (higher priority)
  for (const brand of logoBrands) {
    const key = brand.brand.toLowerCase();
    if (!brandMap.has(key)) {
      brandMap.set(key, []);
    }
    brandMap.get(key)!.push(brand);
  }

  // Add visual brands only if not already detected via logo detection
  for (const brand of visualBrands) {
    const key = brand.brand.toLowerCase();
    if (!brandMap.has(key)) {
      // No logo detection for this brand, add the visual detection
      brandMap.set(key, [{
        ...brand,
        detectionMethod: brand.detectionMethod || 'visual',
      }]);
    }
  }

  // Flatten and return all brand detections
  return Array.from(brandMap.values()).flat();
}

/**
 * Main function: Analyze a video for brand safety
 *
 * @param videoUrl - Direct URL to the video file (must be downloadable)
 * @param videoBuffer - Optional: Pre-downloaded video buffer (use if URL doesn't work)
 * @param contentType - Optional: MIME type of the video (defaults to 'video/mp4')
 * @returns Transcript + visual analysis results
 */
export async function analyzeVideo(
  videoUrl: string,
  videoBuffer?: Buffer,
  contentType: string = 'video/mp4'
): Promise<VideoAnalysisResult | null> {
  if (!isTwelveLabsConfigured()) {
    console.log('[Twelve Labs] API key not configured, skipping video analysis');
    return null;
  }

  console.log(`[Twelve Labs] Starting video analysis...`);

  try {
    // Step 1: Get or create index
    const indexId = await getOrCreateIndex();

    // Step 2: Index the video
    let taskResult: { taskId: string };

    if (videoBuffer) {
      console.log(`[Twelve Labs] Uploading video buffer for indexing (${contentType})...`);
      taskResult = await indexVideoFromBuffer(indexId, videoBuffer, 'video.mp4', contentType);
    } else {
      console.log('[Twelve Labs] Indexing video from URL...');
      taskResult = await indexVideoFromUrl(indexId, videoUrl);
    }

    console.log(`[Twelve Labs] Indexing task created: ${taskResult.taskId}`);

    // Step 3: Wait for indexing to complete
    const indexResult = await waitForIndexing(taskResult.taskId);

    if (indexResult.status === 'failed') {
      console.error('[Twelve Labs] Video indexing failed');
      return null;
    }

    console.log(
      `[Twelve Labs] Video indexed: ${indexResult.videoId} ` +
        `(duration: ${indexResult.duration?.toFixed(1)}s)`
    );

    // Step 4: Run parallel analysis
    console.log('[Twelve Labs] Running parallel analysis...');
    const [transcript, visualAnalysis, logoDetections, contentClassification] = await Promise.all([
      // Transcription
      (async () => {
        console.log('[Twelve Labs] Extracting transcript...');
        const result = await getTranscript(indexId, indexResult.videoId);
        console.log(
          `[Twelve Labs] Transcript: ${result.text.length} chars, ` +
            `${result.segments?.length || 0} segments`
        );
        return result;
      })(),

      // Visual analysis via summarize
      (async () => {
        console.log('[Twelve Labs] Analyzing visual content...');
        const result = await analyzeForBrandSafety(indexId, indexResult.videoId);
        console.log(
          `[Twelve Labs] Visual analysis complete: ${result.brands.length} brands, ` +
            `${result.actions.length} actions, safety: ${result.brandSafetyRating}`
        );
        return result;
      })(),

      // Logo detection via Search API
      (async () => {
        try {
          const result = await detectAllLogos(indexId, indexResult.videoId);
          return result;
        } catch (error) {
          console.error('[Twelve Labs] Logo detection failed:', error);
          return [] as LogoDetection[];
        }
      })(),

      // Content classification via Classify API
      (async () => {
        try {
          const result = await classifyContent(indexId, indexResult.videoId);
          return result;
        } catch (error) {
          console.error('[Twelve Labs] Content classification failed:', error);
          return { labels: [], overallSafetyScore: 0.5 } as ContentClassification;
        }
      })(),
    ]);

    // Merge logo detections with visual analysis brands
    const logoBrands = convertLogosToBrands(logoDetections);
    const mergedBrands = mergeBrandDetections(visualAnalysis.brands, logoBrands);

    // Create enhanced visual analysis with merged brands
    const enhancedVisualAnalysis: VisualAnalysis = {
      ...visualAnalysis,
      brands: mergedBrands,
    };

    console.log(
      `[Twelve Labs] Analysis complete: ${mergedBrands.length} total brands, ` +
        `${logoDetections.length} logo detections, ` +
        `safety score: ${contentClassification.overallSafetyScore.toFixed(2)}`
    );

    return {
      transcript,
      visualAnalysis: enhancedVisualAnalysis,
      indexInfo: indexResult,
      logoDetections,
      contentClassification,
    };
  } catch (error) {
    console.error('[Twelve Labs] Video analysis error:', error);
    return null;
  }
}

/**
 * Analysis tier determines how much analysis to perform
 * - light: Transcript + visual only (2 API calls) - for pre-screened safe content
 * - standard: + logo detection (3 API calls) - default
 * - full: + content classification (4 API calls) - for flagged/concerning content
 */
export type AnalysisTier = 'light' | 'standard' | 'full';

/**
 * Options for video analysis
 */
export interface VideoAnalysisOptionsInternal {
  skipLogoDetection?: boolean;
  skipClassification?: boolean;
  /** Analysis tier - overrides skip options if provided */
  tier?: AnalysisTier;
}

/**
 * Analyze a video with options for skipping certain analyses
 * Used by the media queue for batch processing with configurable analysis
 *
 * Tiers:
 * - light: transcript + visual (2 API calls) - ~$0.05
 * - standard: + logo detection (3 API calls) - ~$0.10
 * - full: + classification (4 API calls) - ~$0.15
 */
export async function analyzeVideoWithOptions(
  videoUrl: string,
  videoBuffer?: Buffer,
  options?: VideoAnalysisOptionsInternal,
  contentType: string = 'video/mp4'
): Promise<VideoAnalysisResult | null> {
  if (!isTwelveLabsConfigured()) {
    console.log('[Twelve Labs] API key not configured, skipping video analysis');
    return null;
  }

  // Determine analysis scope based on tier or explicit options
  const tier = options?.tier;
  let skipLogoDetection = options?.skipLogoDetection ?? false;
  let skipClassification = options?.skipClassification ?? false;

  if (tier) {
    switch (tier) {
      case 'light':
        skipLogoDetection = true;
        skipClassification = true;
        break;
      case 'standard':
        skipLogoDetection = false;
        skipClassification = true;
        break;
      case 'full':
        skipLogoDetection = false;
        skipClassification = false;
        break;
    }
  }

  const tierLabel = tier || (skipLogoDetection && skipClassification ? 'light' : skipClassification ? 'standard' : 'full');
  console.log(`[Twelve Labs] Starting ${tierLabel} tier analysis...`);
  console.log(`[Twelve Labs] Video URL: ${videoUrl.slice(0, 80)}...`);
  console.log(`[Twelve Labs] Buffer provided: ${videoBuffer ? `${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB` : 'none'}`);

  try {
    // Step 1: Get or create index (uses cache)
    const indexId = await getOrCreateIndex();

    // Step 2: Index the video
    let taskResult: { taskId: string };

    if (videoBuffer) {
      console.log(`[Twelve Labs] Uploading video buffer for indexing (${contentType})...`);
      taskResult = await indexVideoFromBuffer(indexId, videoBuffer, 'video.mp4', contentType);
    } else {
      console.log('[Twelve Labs] Indexing video from URL...');
      taskResult = await indexVideoFromUrl(indexId, videoUrl);
    }

    console.log(`[Twelve Labs] Indexing task created: ${taskResult.taskId}`);

    // Step 3: Wait for indexing to complete
    const indexResult = await waitForIndexing(taskResult.taskId);

    if (indexResult.status === 'failed') {
      console.error('[Twelve Labs] Video indexing failed');
      return null;
    }

    console.log(
      `[Twelve Labs] Video indexed: ${indexResult.videoId} ` +
        `(duration: ${indexResult.duration?.toFixed(1)}s)`
    );

    // Step 4: Run analysis based on tier
    // For full/standard tiers, use comprehensive analysis (single API call) for cost savings
    // For light tier, use basic visual analysis only

    console.log('[Twelve Labs] Running analysis...');

    // Get transcript (always needed)
    const transcriptPromise = (async () => {
      console.log('[Twelve Labs] Extracting transcript...');
      const result = await getTranscript(indexId, indexResult.videoId);
      console.log(
        `[Twelve Labs] Transcript: ${result.text.length} chars, ` +
          `${result.segments?.length || 0} segments`
      );
      return result;
    })();

    let visualAnalysis: VisualAnalysis;
    let logoDetections: LogoDetection[];
    let contentClassification: ContentClassification;

    // Use comprehensive analysis for full tier (combines 3 calls into 1)
    if (tierLabel === 'full') {
      console.log('[Twelve Labs] Using comprehensive analysis (combined API call)...');
      const [transcript, comprehensive] = await Promise.all([
        transcriptPromise,
        analyzeComprehensive(indexId, indexResult.videoId),
      ]);

      visualAnalysis = comprehensive.visualAnalysis;
      logoDetections = comprehensive.logoDetections;
      contentClassification = comprehensive.contentClassification;

      console.log(
        `[Twelve Labs] Comprehensive analysis complete: ${visualAnalysis.brands.length} brands, ` +
          `${logoDetections.length} logo detections, safety: ${visualAnalysis.brandSafetyRating}`
      );

      // Merge logo detections with visual analysis brands
      const logoBrands = convertLogosToBrands(logoDetections);
      const mergedBrands = mergeBrandDetections(visualAnalysis.brands, logoBrands);

      // Populate coverage stats from transcript and index info
      const transcriptWordCount = transcript.text.split(/\s+/).filter(w => w.length > 0).length;
      if (visualAnalysis.safetyRationale) {
        visualAnalysis.safetyRationale.coverageStats = {
          videoDuration: indexResult.duration || 0,
          transcriptWords: transcriptWordCount,
          framesAnalyzed: Math.floor((indexResult.duration || 0) * 1), // ~1 fps for analysis
        };
      }

      const enhancedVisualAnalysis: VisualAnalysis = {
        ...visualAnalysis,
        brands: mergedBrands,
      };

      return {
        transcript,
        visualAnalysis: enhancedVisualAnalysis,
        indexInfo: indexResult,
        logoDetections,
        contentClassification,
      };
    }

    // For light/standard tiers, use separate calls as needed
    const analysisPromises: Promise<unknown>[] = [
      transcriptPromise,

      // Visual analysis (always run)
      (async () => {
        console.log('[Twelve Labs] Analyzing visual content...');
        const result = await analyzeForBrandSafety(indexId, indexResult.videoId);
        console.log(
          `[Twelve Labs] Visual analysis complete: ${result.brands.length} brands, ` +
            `${result.actions.length} actions, safety: ${result.brandSafetyRating}`
        );
        return result;
      })(),

      // Logo detection (optional - for standard tier)
      skipLogoDetection
        ? Promise.resolve([] as LogoDetection[])
        : (async () => {
            try {
              return await detectAllLogos(indexId, indexResult.videoId);
            } catch (error) {
              console.error('[Twelve Labs] Logo detection failed:', error);
              return [] as LogoDetection[];
            }
          })(),

      // Content classification (skipped for light/standard)
      Promise.resolve({ labels: [], overallSafetyScore: 0.5 } as ContentClassification),
    ];

    const [transcriptResult, visualAnalysisResult, logoDetectionsResult, contentClassificationResult] =
      (await Promise.all(analysisPromises)) as [
        TwelveLabsTranscript,
        VisualAnalysis,
        LogoDetection[],
        ContentClassification
      ];

    // Merge logo detections with visual analysis brands
    const logoBrands = convertLogosToBrands(logoDetectionsResult);
    const mergedBrands = mergeBrandDetections(visualAnalysisResult.brands, logoBrands);

    // Create enhanced visual analysis with merged brands
    const enhancedVisualAnalysis: VisualAnalysis = {
      ...visualAnalysisResult,
      brands: mergedBrands,
    };

    console.log(
      `[Twelve Labs] Analysis complete: ${mergedBrands.length} total brands, ` +
        `${logoDetectionsResult.length} logo detections, ` +
        `safety score: ${contentClassificationResult.overallSafetyScore.toFixed(2)}`
    );

    return {
      transcript: transcriptResult,
      visualAnalysis: enhancedVisualAnalysis,
      indexInfo: indexResult,
      logoDetections: logoDetectionsResult,
      contentClassification: contentClassificationResult,
    };
  } catch (error) {
    console.error('[Twelve Labs] Video analysis error:', error);
    return null;
  }
}

/**
 * Analyze multiple videos in parallel (with concurrency limit)
 */
export async function analyzeVideos(
  videos: Array<{ id: string; url: string; buffer?: Buffer }>,
  concurrency: number = 2
): Promise<Map<string, VideoAnalysisResult | null>> {
  const results = new Map<string, VideoAnalysisResult | null>();

  for (let i = 0; i < videos.length; i += concurrency) {
    const batch = videos.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (video) => {
        const result = await analyzeVideo(video.url, video.buffer);
        return { id: video.id, result };
      })
    );

    for (const { id, result } of batchResults) {
      results.set(id, result);
    }
  }

  return results;
}

/**
 * Format visual analysis for Claude prompt
 */
export function formatVisualAnalysisForPrompt(analysis: VisualAnalysis): string {
  const parts: string[] = [];

  parts.push(`Visual Description: ${analysis.description}`);

  if (analysis.brands.length > 0) {
    parts.push(`\nBrands/Logos Detected:`);
    analysis.brands.forEach((b) => {
      let brandLine = `  - ${b.brand} (${b.confidence} confidence)`;

      // Add timestamp info if available
      if (b.startTime !== undefined && b.endTime !== undefined) {
        brandLine += ` [${formatTime(b.startTime)}-${formatTime(b.endTime)}]`;
      }

      // Add detection method
      if (b.detectionMethod) {
        brandLine += ` via ${b.detectionMethod}`;
      }

      // Flag sponsors
      if (b.appearsSponsor) {
        brandLine += ' [LIKELY SPONSOR]';
      }

      // Flag competitors
      if (b.isCompetitor) {
        brandLine += ' [COMPETITOR]';
      }

      parts.push(brandLine);
    });
  }

  if (analysis.actions.length > 0) {
    const concerningActions = analysis.actions.filter((a) => a.isConcerning);
    if (concerningActions.length > 0) {
      parts.push(
        `\nConcerning Actions: ${concerningActions.map((a) => a.action).join(', ')}`
      );
    }
  }

  if (analysis.textInVideo.length > 0) {
    parts.push(`\nOn-Screen Text: ${analysis.textInVideo.map((t) => t.text).join(', ')}`);
  }

  parts.push(
    `\nScene Context: ${analysis.sceneContext.setting} (${analysis.sceneContext.mood})`
  );
  parts.push(`Content Type: ${analysis.sceneContext.contentType}`);

  if (analysis.sceneContext.concerns.length > 0) {
    parts.push(`Visual Concerns: ${analysis.sceneContext.concerns.join(', ')}`);
  }

  parts.push(`\nVisual Safety Rating: ${analysis.brandSafetyRating.toUpperCase()}`);

  return parts.join('\n');
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format logo detections for display
 */
export function formatLogoDetections(logos: LogoDetection[]): string {
  if (logos.length === 0) {
    return 'No logos detected';
  }

  const lines: string[] = ['Logo Detections:'];

  logos.forEach((logo) => {
    const sponsorFlag = logo.likelySponsor ? ' [LIKELY SPONSOR]' : '';
    lines.push(`  ${logo.brand}${sponsorFlag} (${logo.totalDuration.toFixed(1)}s total)`);

    logo.appearances.forEach((app) => {
      const prominence = app.prominence ? ` - ${app.prominence}` : '';
      lines.push(
        `    - ${formatTime(app.startTime)}-${formatTime(app.endTime)} ` +
        `(${(app.confidence * 100).toFixed(0)}% confidence${prominence})`
      );
    });
  });

  return lines.join('\n');
}

/**
 * Format content classification for display
 */
export function formatContentClassification(classification: ContentClassification): string {
  const lines: string[] = [
    `Content Classification (Safety Score: ${(classification.overallSafetyScore * 100).toFixed(0)}%):`,
  ];

  classification.labels.forEach((label) => {
    const percentage = (label.confidence * 100).toFixed(0);
    lines.push(`  - ${label.label}: ${percentage}% confidence`);
  });

  return lines.join('\n');
}
