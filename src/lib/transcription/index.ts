import OpenAI from 'openai';

// Lazy-initialize OpenAI client to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

/**
 * Maximum file size for Whisper API (25MB)
 */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Transcribe audio/video from a URL using OpenAI Whisper
 *
 * @param mediaUrl - Direct URL to the video/audio file
 * @param filename - Optional filename with extension (helps Whisper identify format)
 * @returns Transcription result or null if failed
 */
export async function transcribeFromUrl(
  mediaUrl: string,
  filename: string = 'media.mp4'
): Promise<TranscriptionResult | null> {
  const openai = getOpenAI();
  if (!openai) {
    console.log('OpenAI API key not configured, skipping transcription');
    return null;
  }

  try {
    // Download the media file
    const response = await fetch(mediaUrl);

    if (!response.ok) {
      console.error(`Failed to download media: ${response.status}`);
      return null;
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      console.log(`Media file too large for transcription: ${contentLength} bytes`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length > MAX_FILE_SIZE) {
      console.log(`Media file too large for transcription: ${buffer.length} bytes`);
      return null;
    }

    // Create File object for OpenAI API
    // Whisper can process video files directly (extracts audio internally)
    const file = new File([buffer], filename, { type: getMimeType(filename) });

    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
    });

    return {
      text: transcription.text,
      language: transcription.language,
      duration: transcription.duration,
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return null;
  }
}

/**
 * Batch transcribe multiple media URLs
 * Processes in parallel with concurrency limit
 */
export async function transcribeMultiple(
  items: Array<{ url: string; id: string }>,
  concurrency: number = 3
): Promise<Map<string, TranscriptionResult | null>> {
  const results = new Map<string, TranscriptionResult | null>();

  // Process in batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const result = await transcribeFromUrl(item.url);
        return { id: item.id, result };
      })
    );

    for (const { id, result } of batchResults) {
      results.set(id, result);
    }
  }

  return results;
}

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'video/webm',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  };
  return mimeTypes[ext || ''] || 'video/mp4';
}
