#!/usr/bin/env npx tsx
/**
 * Test script for Apify TikTok/Instagram integration
 *
 * Usage:
 *   npx tsx scripts/test-apify.ts @tiktok_handle
 *   npx tsx scripts/test-apify.ts instagram @instagram_handle
 */

import 'dotenv/config';
import {
  isApifyConfigured,
  fetchTikTokViaApify,
  fetchInstagramViaApify,
} from '../src/lib/social-media/apify';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/test-apify.ts [@tiktok_handle | instagram @instagram_handle]');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/test-apify.ts @charlidamelio');
    console.log('  npx tsx scripts/test-apify.ts instagram @kingjames');
    process.exit(1);
  }

  // Check configuration
  if (!isApifyConfigured()) {
    console.error('Error: APIFY_API_KEY is not configured in .env');
    console.log('\nTo get an API key:');
    console.log('1. Go to https://console.apify.com/account/integrations');
    console.log('2. Copy your API key');
    console.log('3. Add it to .env: APIFY_API_KEY=your_key_here');
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

  console.log(`\nTesting Apify ${platform} scraper for @${handle}...`);
  console.log('='.repeat(50));

  try {
    const startTime = Date.now();

    const content =
      platform === 'tiktok'
        ? await fetchTikTokViaApify(handle, 3) // Last 3 months
        : await fetchInstagramViaApify(handle, 3);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\nCompleted in ${elapsed}s`);
    console.log('='.repeat(50));

    if (content.error) {
      console.error(`\nError: ${content.error}`);
      process.exit(1);
    }

    console.log(`\nFetched ${content.posts.length} posts from ${content.platform}/@${content.handle}`);

    if (content.posts.length === 0) {
      console.log('No posts found. The account may be private or have no recent posts.');
      process.exit(0);
    }

    // Summary statistics
    const videoPosts = content.posts.filter((p) => p.mediaType === 'video');
    const postsWithVideoUrl = videoPosts.filter((p) => p.mediaUrl);

    console.log(`\nSummary:`);
    console.log(`  Total posts: ${content.posts.length}`);
    console.log(`  Videos: ${videoPosts.length}`);
    console.log(`  Videos with URLs: ${postsWithVideoUrl.length}`);

    // Show sample posts
    console.log(`\nSample posts:`);
    content.posts.slice(0, 3).forEach((post, i) => {
      console.log(`\n[Post ${i + 1}]`);
      console.log(`  ID: ${post.id}`);
      console.log(`  Date: ${new Date(post.timestamp).toLocaleDateString()}`);
      console.log(`  Type: ${post.mediaType || 'unknown'}`);
      console.log(`  Caption: ${post.caption.slice(0, 100)}${post.caption.length > 100 ? '...' : ''}`);
      console.log(`  Engagement: ${JSON.stringify(post.engagement)}`);
      console.log(`  Has video URL: ${!!post.mediaUrl}`);
      if (post.mediaUrl) {
        console.log(`  Video URL: ${post.mediaUrl.slice(0, 80)}...`);
      }
    });

    console.log('\n✓ Apify integration working correctly');
  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  }
}

main();
