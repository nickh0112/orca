#!/usr/bin/env npx tsx
/**
 * Test script for full Apify → Twelve Labs integration
 *
 * Fetches video URLs via Apify, downloads the video, and analyzes with Twelve Labs.
 *
 * Usage:
 *   npx tsx scripts/test-apify-twelve-labs.ts @tiktok_handle
 *   npx tsx scripts/test-apify-twelve-labs.ts instagram @instagram_handle
 */

import 'dotenv/config';
import {
  isApifyConfigured,
  fetchTikTokViaApify,
  fetchInstagramViaApify,
} from '../src/lib/social-media/apify';
import {
  isTwelveLabsConfigured,
  analyzeVideo,
  formatVisualAnalysisForPrompt,
  VideoAnalysisResult,
} from '../src/lib/video-analysis';

/**
 * Download video using TikTok's oembed to get embed URL
 * TikTok videos can be accessed via their video ID
 */
async function getTikTokDirectUrl(videoId: string): Promise<string | null> {
  // TikTok videos can sometimes be accessed via aweme API
  // This is a common pattern for video downloaders
  try {
    // Try the TikTok API to get video info
    const response = await fetch(
      `https://www.tiktok.com/oembed?url=https://www.tiktok.com/video/${videoId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    if (!response.ok) {
      console.log(`[Download] oembed request failed: ${response.status}`);
      return null;
    }

    // oembed doesn't give us the direct URL, so this approach won't work
    return null;
  } catch (error) {
    console.error('[Download] Error:', error);
    return null;
  }
}

/**
 * Download video to buffer using a direct URL
 */
async function downloadVideoBuffer(
  url: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Referer: 'https://www.tiktok.com/',
      },
    });

    if (!response.ok) {
      console.log(`[Download] Failed: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const buffer = Buffer.from(await response.arrayBuffer());

    console.log(`[Download] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
    return { buffer, contentType };
  } catch (error) {
    console.error('[Download] Error:', error);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(
      'Usage: npx tsx scripts/test-apify-twelve-labs.ts [@tiktok_handle | instagram @instagram_handle]'
    );
    console.log('\nExamples:');
    console.log('  npx tsx scripts/test-apify-twelve-labs.ts @charlidamelio');
    console.log('  npx tsx scripts/test-apify-twelve-labs.ts instagram @kingjames');
    process.exit(1);
  }

  // Check configurations
  if (!isApifyConfigured()) {
    console.error('Error: APIFY_API_KEY is not configured in .env');
    process.exit(1);
  }

  if (!isTwelveLabsConfigured()) {
    console.error('Error: TWELVE_LABS_API_KEY is not configured in .env');
    process.exit(1);
  }

  // Parse arguments
  let platform: 'tiktok' | 'instagram' = 'tiktok';
  let handle: string;

  if (args[0].toLowerCase() === 'instagram') {
    platform = 'instagram';
    handle = args[1]?.replace('@', '') || '';
  } else {
    handle = args[0].replace('@', '');
  }

  if (!handle) {
    console.error('Error: Please provide a handle');
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Full Integration: Apify → Twelve Labs`);
  console.log(`Platform: ${platform}, Handle: @${handle}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Step 1: Fetch posts via Apify
    console.log('[Step 1] Fetching posts via Apify...');
    const startApify = Date.now();

    const content =
      platform === 'tiktok'
        ? await fetchTikTokViaApify(handle, 3)
        : await fetchInstagramViaApify(handle, 3);

    console.log(`[Step 1] Completed in ${((Date.now() - startApify) / 1000).toFixed(1)}s`);

    if (content.error) {
      console.error(`[Step 1] Error: ${content.error}`);
      process.exit(1);
    }

    const videoPosts = content.posts.filter(
      (p) => p.mediaType === 'video' && p.mediaUrl
    );
    console.log(`[Step 1] Found ${videoPosts.length} videos with URLs\n`);

    if (videoPosts.length === 0) {
      console.error('No videos with URLs found. Cannot test Twelve Labs integration.');
      process.exit(1);
    }

    // Step 2: Try to find a video with a direct URL (not a web page URL)
    console.log('[Step 2] Looking for direct video URLs...');

    const testVideo = videoPosts[0];
    console.log(`[Step 2] Selected video: ${testVideo.id}`);
    console.log(`[Step 2] Caption: ${testVideo.caption.slice(0, 50)}...`);
    console.log(`[Step 2] URL: ${testVideo.mediaUrl?.slice(0, 80)}...`);

    // Check if URL is a web page or direct video
    const isDirectUrl =
      testVideo.mediaUrl &&
      !testVideo.mediaUrl.includes('tiktok.com/@') &&
      !testVideo.mediaUrl.includes('instagram.com/p/');

    if (isDirectUrl && testVideo.mediaUrl) {
      // Step 3a: Direct URL available - test directly with Twelve Labs
      console.log('\n[Step 3] Testing with direct video URL...');
      const startTwelveLabs = Date.now();

      const result = await analyzeVideo(testVideo.mediaUrl);

      console.log(
        `[Step 3] Completed in ${((Date.now() - startTwelveLabs) / 1000).toFixed(1)}s`
      );

      if (result) {
        displayResults(result);
        console.log('\n✓ Full integration test PASSED');
      } else {
        console.error('\n✗ Twelve Labs analysis failed');
        process.exit(1);
      }
    } else {
      // Step 3b: Web URL - inform about the limitation
      console.log('\n[Step 3] Web URL detected (not a direct video file URL)');
      console.log(
        'Note: The Apify scraper returned a web page URL, not a direct video file URL.'
      );
      console.log(
        'Twelve Labs requires a direct URL to a video file (e.g., .mp4, .webm).\n'
      );

      // Try to use a sample direct video URL for testing
      console.log('[Step 3] Testing with sample direct video URL instead...');

      // Use a sample video that's known to work
      const sampleUrl =
        'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

      console.log(`[Step 3] Sample URL: ${sampleUrl}`);

      const startTwelveLabs = Date.now();
      const result = await analyzeVideo(sampleUrl);

      console.log(
        `[Step 3] Completed in ${((Date.now() - startTwelveLabs) / 1000).toFixed(1)}s`
      );

      if (result) {
        displayResults(result);
        console.log('\n✓ Twelve Labs integration verified with sample video');
        console.log('\n⚠️  LIMITATION IDENTIFIED:');
        console.log(
          '   The Apify TikTok scraper returns web page URLs, not direct video URLs.'
        );
        console.log('   To use Apify videos with Twelve Labs, consider:');
        console.log('   1. Using a video download service to get direct URLs');
        console.log('   2. Downloading videos locally first, then uploading as buffer');
        console.log('   3. Using a different Apify actor that provides direct URLs');
      } else {
        console.error('\n✗ Twelve Labs analysis failed');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  }
}

function displayResults(result: VideoAnalysisResult) {
  console.log('\n' + '='.repeat(60));
  console.log('TWELVE LABS ANALYSIS RESULTS');
  console.log('='.repeat(60));

  // Index info
  console.log('\n[Index Info]');
  console.log(`  Index ID: ${result.indexInfo.indexId}`);
  console.log(`  Video ID: ${result.indexInfo.videoId}`);
  console.log(`  Status: ${result.indexInfo.status}`);
  if (result.indexInfo.duration) {
    console.log(`  Duration: ${result.indexInfo.duration.toFixed(1)}s`);
  }

  // Transcript
  console.log('\n[Transcript]');
  if (result.transcript.text) {
    const truncated = result.transcript.text.slice(0, 300);
    console.log(`  Length: ${result.transcript.text.length} chars`);
    console.log(
      `  Preview: "${truncated}${result.transcript.text.length > 300 ? '...' : ''}"`
    );
  } else {
    console.log('  No speech detected');
  }

  // Visual analysis
  console.log('\n[Visual Analysis]');
  console.log(`  Description: ${result.visualAnalysis.description}`);
  console.log(`  Safety Rating: ${result.visualAnalysis.brandSafetyRating.toUpperCase()}`);

  if (result.visualAnalysis.brands.length > 0) {
    console.log(`  Brands: ${result.visualAnalysis.brands.map((b) => b.brand).join(', ')}`);
  }

  console.log(`  Setting: ${result.visualAnalysis.sceneContext.setting}`);
  console.log(`  Mood: ${result.visualAnalysis.sceneContext.mood}`);
  console.log(`  Content Type: ${result.visualAnalysis.sceneContext.contentType}`);

  if (result.visualAnalysis.sceneContext.concerns.length > 0) {
    console.log(`  Concerns: ${result.visualAnalysis.sceneContext.concerns.join(', ')}`);
  }

  // Formatted output
  console.log('\n[Formatted for Claude]');
  console.log('-'.repeat(40));
  console.log(formatVisualAnalysisForPrompt(result.visualAnalysis));
}

main();
