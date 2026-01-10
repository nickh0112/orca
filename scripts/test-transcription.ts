/**
 * Test script for video transcription functionality
 *
 * Usage:
 *   npx tsx scripts/test-transcription.ts          # Test all platforms
 *   npx tsx scripts/test-transcription.ts instagram # Test Instagram only
 *   npx tsx scripts/test-transcription.ts tiktok    # Test TikTok only
 *   npx tsx scripts/test-transcription.ts url <video-url>  # Test direct URL
 */

import { config } from 'dotenv';
config({ path: '.env' });

import { transcribeFromUrl } from '../src/lib/transcription';
import { fetchInstagram } from '../src/lib/social-media/instagram';
import { fetchTikTok } from '../src/lib/social-media/tiktok';

async function testDirectUrl(url: string) {
  console.log('\n=== Testing Direct URL Transcription ===');
  console.log(`URL: ${url}`);

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not configured');
    return;
  }

  const result = await transcribeFromUrl(url);

  if (result) {
    console.log('\nTranscription Result:');
    console.log(`Language: ${result.language || 'unknown'}`);
    console.log(`Duration: ${result.duration || 'unknown'}s`);
    console.log(`Text (first 500 chars): ${result.text.slice(0, 500)}`);
    console.log(`Full length: ${result.text.length} characters`);
  } else {
    console.log('\nTranscription failed or returned null');
  }
}

async function testInstagram() {
  console.log('\n=== Testing Instagram Video Transcription ===');

  if (!process.env.FACEBOOK_ACCESS_TOKEN || !process.env.FACEBOOK_REQUEST_USER_ID) {
    console.log('Instagram API not configured (FACEBOOK_ACCESS_TOKEN, FACEBOOK_REQUEST_USER_ID)');
    console.log('Skipping Instagram test');
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY not configured - videos will not be transcribed');
  }

  // Test with a known Instagram handle that has videos
  const testHandle = 'mrbeast'; // Change to a handle you want to test
  console.log(`Fetching posts from Instagram @${testHandle}...`);

  const result = await fetchInstagram(testHandle, 1); // Last 1 month

  console.log(`\nFetched ${result.posts.length} posts`);

  const postsWithTranscripts = result.posts.filter((p) => p.transcript);
  console.log(`Posts with transcripts: ${postsWithTranscripts.length}`);

  if (postsWithTranscripts.length > 0) {
    console.log('\nSample transcript:');
    const sample = postsWithTranscripts[0];
    console.log(`Post ID: ${sample.id}`);
    console.log(`Permalink: ${sample.permalink}`);
    console.log(`Transcript (first 500 chars): ${sample.transcript?.slice(0, 500)}`);
  }

  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
}

async function testTikTok() {
  console.log('\n=== Testing TikTok Video Transcription ===');

  if (!process.env.TIKTOK_TCM_ACCESS_TOKEN || !process.env.TIKTOK_TCM_ACCOUNT_ID) {
    console.log('TikTok API not configured (TIKTOK_TCM_ACCESS_TOKEN, TIKTOK_TCM_ACCOUNT_ID)');
    console.log('Skipping TikTok test');
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY not configured - videos will not be transcribed');
  }

  // Test with a known TikTok handle
  const testHandle = 'mrbeast'; // Change to a handle you want to test
  console.log(`Fetching posts from TikTok @${testHandle}...`);

  const result = await fetchTikTok(testHandle, 1); // Last 1 month

  console.log(`\nFetched ${result.posts.length} posts`);

  const postsWithTranscripts = result.posts.filter((p) => p.transcript);
  console.log(`Posts with transcripts: ${postsWithTranscripts.length}`);

  if (postsWithTranscripts.length > 0) {
    console.log('\nSample transcript:');
    const sample = postsWithTranscripts[0];
    console.log(`Post ID: ${sample.id}`);
    console.log(`Permalink: ${sample.permalink}`);
    console.log(`Transcript (first 500 chars): ${sample.transcript?.slice(0, 500)}`);
  } else {
    console.log('\nNote: TikTok TCM API may not provide direct video URLs (media_url)');
    console.log('If media_url is not available, transcription will be skipped');
  }

  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  console.log('Video Transcription Test');
  console.log('========================');
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`Instagram API: ${process.env.FACEBOOK_ACCESS_TOKEN ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`TikTok API: ${process.env.TIKTOK_TCM_ACCESS_TOKEN ? 'Configured' : 'NOT CONFIGURED'}`);

  if (command === 'url' && args[1]) {
    await testDirectUrl(args[1]);
  } else if (command === 'instagram') {
    await testInstagram();
  } else if (command === 'tiktok') {
    await testTikTok();
  } else {
    // Test all
    await testInstagram();
    await testTikTok();
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
