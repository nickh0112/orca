#!/usr/bin/env npx tsx
/**
 * Test script for Twelve Labs video analysis integration
 *
 * Usage:
 *   npx tsx scripts/test-twelve-labs.ts <video_url>
 *
 * Example:
 *   npx tsx scripts/test-twelve-labs.ts https://example.com/video.mp4
 */

import 'dotenv/config';
import {
  isTwelveLabsConfigured,
  analyzeVideo,
  formatVisualAnalysisForPrompt,
} from '../src/lib/video-analysis';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/test-twelve-labs.ts <video_url>');
    console.log('\nExample:');
    console.log('  npx tsx scripts/test-twelve-labs.ts https://example.com/video.mp4');
    console.log('\nNote: The URL must be a direct link to a video file (mp4, webm, etc.)');
    process.exit(1);
  }

  // Check configuration
  if (!isTwelveLabsConfigured()) {
    console.error('Error: TWELVE_LABS_API_KEY is not configured in .env');
    console.log('\nTo get an API key:');
    console.log('1. Go to https://playground.twelvelabs.io/dashboard/api-key');
    console.log('2. Create a free account (600 minutes/month free)');
    console.log('3. Copy your API key');
    console.log('4. Add it to .env: TWELVE_LABS_API_KEY=your_key_here');
    process.exit(1);
  }

  const videoUrl = args[0];

  console.log(`\nTesting Twelve Labs video analysis...`);
  console.log(`URL: ${videoUrl}`);
  console.log('='.repeat(60));

  try {
    const startTime = Date.now();

    const result = await analyzeVideo(videoUrl);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\nCompleted in ${elapsed}s`);
    console.log('='.repeat(60));

    if (!result) {
      console.error('\nError: Video analysis returned null');
      console.log('Possible reasons:');
      console.log('  - Invalid video URL');
      console.log('  - Video format not supported');
      console.log('  - Video too long (>10 minutes)');
      console.log('  - API rate limit exceeded');
      process.exit(1);
    }

    // Show index info
    console.log('\n[Index Info]');
    console.log(`  Index ID: ${result.indexInfo.indexId}`);
    console.log(`  Video ID: ${result.indexInfo.videoId}`);
    console.log(`  Status: ${result.indexInfo.status}`);
    if (result.indexInfo.duration) {
      console.log(`  Duration: ${result.indexInfo.duration.toFixed(1)}s`);
    }

    // Show transcript
    console.log('\n[Transcript]');
    if (result.transcript.text) {
      const truncated = result.transcript.text.slice(0, 500);
      console.log(`  Length: ${result.transcript.text.length} chars`);
      console.log(`  Segments: ${result.transcript.segments?.length || 0}`);
      console.log(`\n  Text preview:`);
      console.log(`  "${truncated}${result.transcript.text.length > 500 ? '...' : ''}"`);
    } else {
      console.log('  No speech detected in video');
    }

    // Show visual analysis
    console.log('\n[Visual Analysis]');
    console.log(`  Description: ${result.visualAnalysis.description}`);
    console.log(`  Safety Rating: ${result.visualAnalysis.brandSafetyRating.toUpperCase()}`);

    if (result.visualAnalysis.brands.length > 0) {
      console.log(`\n  Brands Detected:`);
      result.visualAnalysis.brands.forEach((b) => {
        console.log(`    - ${b.brand} (${b.confidence} confidence)`);
      });
    }

    if (result.visualAnalysis.actions.length > 0) {
      console.log(`\n  Actions Detected:`);
      result.visualAnalysis.actions.forEach((a) => {
        const flag = a.isConcerning ? ' ⚠️' : '';
        console.log(`    - ${a.action}${flag}`);
      });
    }

    if (result.visualAnalysis.textInVideo.length > 0) {
      console.log(`\n  On-Screen Text:`);
      result.visualAnalysis.textInVideo.forEach((t) => {
        console.log(`    - "${t.text}"`);
      });
    }

    console.log(`\n  Scene Context:`);
    console.log(`    Setting: ${result.visualAnalysis.sceneContext.setting}`);
    console.log(`    Mood: ${result.visualAnalysis.sceneContext.mood}`);
    console.log(`    Content Type: ${result.visualAnalysis.sceneContext.contentType}`);
    if (result.visualAnalysis.sceneContext.concerns.length > 0) {
      console.log(`    Concerns: ${result.visualAnalysis.sceneContext.concerns.join(', ')}`);
    }

    // Show formatted output for Claude
    console.log('\n[Formatted for Claude Prompt]');
    console.log('-'.repeat(40));
    console.log(formatVisualAnalysisForPrompt(result.visualAnalysis));
    console.log('-'.repeat(40));

    console.log('\n✓ Twelve Labs integration working correctly');
  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  }
}

main();
