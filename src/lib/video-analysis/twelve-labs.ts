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
} from '@/types/video-analysis';

// Twelve Labs API configuration
const TWELVE_LABS_API_BASE = 'https://api.twelvelabs.io/v1.2';

// Index configuration
const INDEX_NAME = 'orca-brand-safety';

// Configuration
const CONFIG = {
  INDEXING_TIMEOUT_MS: 600000, // 10 minutes (for longer videos)
  POLL_INTERVAL_MS: 5000, // 5 seconds
  MAX_VIDEO_DURATION_SEC: 600, // 10 minutes max
};

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
 */
async function getOrCreateIndex(): Promise<string> {
  // First, try to find existing index
  const listResponse = await fetch(`${TWELVE_LABS_API_BASE}/indexes`, {
    headers: getHeaders(),
  });

  if (!listResponse.ok) {
    throw new Error(`Failed to list indexes: ${listResponse.status}`);
  }

  const listData = await listResponse.json();
  const existingIndex = listData.data?.find(
    (index: { name: string }) => index.name === INDEX_NAME
  );

  if (existingIndex) {
    console.log(`[Twelve Labs] Using existing index: ${existingIndex._id}`);
    return existingIndex._id;
  }

  // Create new index with required engines
  console.log(`[Twelve Labs] Creating new index: ${INDEX_NAME}`);

  const createResponse = await fetch(`${TWELVE_LABS_API_BASE}/indexes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      name: INDEX_NAME,
      engines: [
        {
          name: 'marengo2.7',
          options: ['visual', 'conversation', 'text_in_video', 'logo'],
        },
        {
          name: 'pegasus1.2',
          options: ['visual', 'conversation'],
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
  return createData._id;
}

/**
 * Upload video from URL to Twelve Labs for indexing
 */
async function indexVideoFromUrl(
  indexId: string,
  videoUrl: string
): Promise<{ taskId: string }> {
  const response = await fetch(`${TWELVE_LABS_API_BASE}/tasks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      index_id: indexId,
      url: videoUrl,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create indexing task: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return { taskId: data._id };
}

/**
 * Upload video buffer to Twelve Labs for indexing
 */
async function indexVideoFromBuffer(
  indexId: string,
  buffer: Buffer,
  filename: string = 'video.mp4'
): Promise<{ taskId: string }> {
  const formData = new FormData();
  formData.append('index_id', indexId);
  // Convert Buffer to ArrayBuffer for Blob compatibility
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  formData.append('video_file', new Blob([arrayBuffer]), filename);

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
 * Wait for indexing task to complete
 */
async function waitForIndexing(taskId: string): Promise<TwelveLabsIndexResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < CONFIG.INDEXING_TIMEOUT_MS) {
    const response = await fetch(`${TWELVE_LABS_API_BASE}/tasks/${taskId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to check task status: ${response.status}`);
    }

    const data = await response.json();
    const status = data.status;

    if (status === 'ready') {
      return {
        indexId: data.index_id,
        videoId: data.video_id,
        status: 'ready',
        duration: data.metadata?.duration,
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

    // Progress logging
    if (data.estimated_time) {
      console.log(`[Twelve Labs] Indexing... ETA: ${data.estimated_time}s`);
    }

    await new Promise((resolve) => setTimeout(resolve, CONFIG.POLL_INTERVAL_MS));
  }

  throw new Error('Indexing timed out');
}

/**
 * Get transcript from indexed video
 */
async function getTranscript(
  indexId: string,
  videoId: string
): Promise<TwelveLabsTranscript> {
  const response = await fetch(
    `${TWELVE_LABS_API_BASE}/indexes/${indexId}/videos/${videoId}/transcription`,
    {
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    // Transcription might not be available
    if (response.status === 404) {
      return { text: '' };
    }
    throw new Error(`Failed to get transcript: ${response.status}`);
  }

  const data = await response.json();

  return {
    text: data.data?.map((seg: { value: string }) => seg.value).join(' ') || '',
    segments: data.data?.map((seg: { value: string; start: number; end: number }) => ({
      text: seg.value,
      start: seg.start,
      end: seg.end,
    })),
  };
}

/**
 * Analyze video for brand safety using Twelve Labs generate endpoint
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

  const response = await fetch(`${TWELVE_LABS_API_BASE}/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      video_id: videoId,
      prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Twelve Labs] Analysis failed: ${response.status} - ${errorText}`);
    return getDefaultVisualAnalysis();
  }

  const data = await response.json();
  const rawAnalysis = data.data || '';

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
 * Main function: Analyze a video for brand safety
 *
 * @param videoUrl - Direct URL to the video file (must be downloadable)
 * @param videoBuffer - Optional: Pre-downloaded video buffer (use if URL doesn't work)
 * @returns Transcript + visual analysis results
 */
export async function analyzeVideo(
  videoUrl: string,
  videoBuffer?: Buffer
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
      console.log('[Twelve Labs] Uploading video buffer for indexing...');
      taskResult = await indexVideoFromBuffer(indexId, videoBuffer);
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

    // Step 4: Get transcript
    console.log('[Twelve Labs] Extracting transcript...');
    const transcript = await getTranscript(indexId, indexResult.videoId);
    console.log(
      `[Twelve Labs] Transcript: ${transcript.text.length} chars, ` +
        `${transcript.segments?.length || 0} segments`
    );

    // Step 5: Analyze for brand safety
    console.log('[Twelve Labs] Analyzing visual content...');
    const visualAnalysis = await analyzeForBrandSafety(indexId, indexResult.videoId);
    console.log(
      `[Twelve Labs] Analysis complete: ${visualAnalysis.brands.length} brands, ` +
        `${visualAnalysis.actions.length} actions, ` +
        `safety: ${visualAnalysis.brandSafetyRating}`
    );

    return {
      transcript,
      visualAnalysis,
      indexInfo: indexResult,
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
    parts.push(
      `Brands/Logos Detected: ${analysis.brands
        .map((b) => `${b.brand} (${b.confidence} confidence)`)
        .join(', ')}`
    );
  }

  if (analysis.actions.length > 0) {
    const concerningActions = analysis.actions.filter((a) => a.isConcerning);
    if (concerningActions.length > 0) {
      parts.push(
        `Concerning Actions: ${concerningActions.map((a) => a.action).join(', ')}`
      );
    }
  }

  if (analysis.textInVideo.length > 0) {
    parts.push(`On-Screen Text: ${analysis.textInVideo.map((t) => t.text).join(', ')}`);
  }

  parts.push(
    `Scene Context: ${analysis.sceneContext.setting} (${analysis.sceneContext.mood})`
  );
  parts.push(`Content Type: ${analysis.sceneContext.contentType}`);

  if (analysis.sceneContext.concerns.length > 0) {
    parts.push(`Visual Concerns: ${analysis.sceneContext.concerns.join(', ')}`);
  }

  parts.push(`Visual Safety Rating: ${analysis.brandSafetyRating.toUpperCase()}`);

  return parts.join('\n');
}
