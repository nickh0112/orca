/**
 * Test script for Vespa integration
 *
 * Usage:
 *   npx tsx scripts/test-vespa.ts @mrbeast          # Query by handle
 *   npx tsx scripts/test-vespa.ts mrbeast           # Handle without @
 *   npx tsx scripts/test-vespa.ts --id content_id   # Query by ID
 */

import { config } from 'dotenv';
config({ path: '.env' });

import {
  isVespaConfigured,
  queryTranscriptsByHandle,
  getPostById,
  convertVespaPostsToSocialMediaContent,
} from '../src/lib/vespa';

async function testQueryByHandle(handle: string) {
  console.log('\n=== Testing Vespa Query by Handle ===');
  console.log(`Handle: ${handle}`);
  console.log(`VESPA_URL: ${process.env.VESPA_URL || 'NOT SET'}`);

  if (!isVespaConfigured()) {
    console.error('\nError: VESPA_URL not configured in .env');
    console.log('Add: VESPA_URL=http://your-vespa-instance:8080');
    return;
  }

  try {
    console.log('\nQuerying Vespa...');
    const posts = await queryTranscriptsByHandle(handle, 50);

    console.log(`\nFound ${posts.length} posts`);

    if (posts.length === 0) {
      console.log('No posts found for this handle in Vespa.');
      console.log('The creator may not be indexed yet.');
      return;
    }

    // Group by platform
    const byPlatform = posts.reduce(
      (acc, post) => {
        const platform = post.platform || 'unknown';
        if (!acc[platform]) acc[platform] = [];
        acc[platform].push(post);
        return acc;
      },
      {} as Record<string, typeof posts>
    );

    console.log('\nPosts by platform:');
    for (const [platform, platformPosts] of Object.entries(byPlatform)) {
      const withTranscripts = platformPosts.filter(
        (p) => p.transcription_text && p.transcription_text.length > 0
      ).length;
      console.log(`  ${platform}: ${platformPosts.length} posts (${withTranscripts} with transcripts)`);
    }

    // Show sample post
    const samplePost = posts[0];
    console.log('\nSample post:');
    console.log(`  ID: ${samplePost.id}`);
    console.log(`  Handle: ${samplePost.handle}`);
    console.log(`  Platform: ${samplePost.platform}`);
    console.log(`  Posted: ${new Date(samplePost.posted_at_ts * 1000).toISOString()}`);
    console.log(
      `  Caption: ${samplePost.caption.join(' ').slice(0, 100)}${
        samplePost.caption.join(' ').length > 100 ? '...' : ''
      }`
    );

    if (samplePost.transcription_text && samplePost.transcription_text.length > 0) {
      const transcript = samplePost.transcription_text.join(' ');
      console.log(
        `  Transcript: ${transcript.slice(0, 200)}${transcript.length > 200 ? '...' : ''}`
      );
    } else {
      console.log('  Transcript: (none)');
    }

    if (samplePost.asset_url) {
      console.log(`  Asset URL: ${samplePost.asset_url}`);
    }

    // Test conversion to SocialMediaContent
    console.log('\n=== Testing Conversion to SocialMediaContent ===');
    const content = convertVespaPostsToSocialMediaContent(posts, handle);
    if (content) {
      console.log(`Platform: ${content.platform}`);
      console.log(`Handle: ${content.handle}`);
      console.log(`Posts: ${content.posts.length}`);
      console.log(`Posts with transcripts: ${content.posts.filter((p) => p.transcript).length}`);
    }
  } catch (error) {
    console.error('\nVespa query failed:', error);
  }
}

async function testQueryById(id: string) {
  console.log('\n=== Testing Vespa Query by ID ===');
  console.log(`ID: ${id}`);

  if (!isVespaConfigured()) {
    console.error('\nError: VESPA_URL not configured in .env');
    return;
  }

  try {
    console.log('\nQuerying Vespa...');
    const post = await getPostById(id);

    if (!post) {
      console.log('Post not found');
      return;
    }

    console.log('\nPost details:');
    console.log(`  ID: ${post.id}`);
    console.log(`  Handle: ${post.handle}`);
    console.log(`  Platform: ${post.platform}`);
    console.log(`  Posted: ${new Date(post.posted_at_ts * 1000).toISOString()}`);
    console.log(`  Caption: ${post.caption.join(' ').slice(0, 200)}`);
    console.log(
      `  Transcript: ${
        post.transcription_text.length > 0
          ? post.transcription_text.join(' ').slice(0, 200)
          : '(none)'
      }`
    );
  } catch (error) {
    console.error('\nVespa query failed:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);

  console.log('Vespa Integration Test');
  console.log('======================');

  if (args.length === 0) {
    console.log('\nUsage:');
    console.log('  npx tsx scripts/test-vespa.ts @handle    # Query by handle');
    console.log('  npx tsx scripts/test-vespa.ts --id ID    # Query by ID');
    return;
  }

  if (args[0] === '--id' && args[1]) {
    await testQueryById(args[1]);
  } else {
    await testQueryByHandle(args[0]);
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
