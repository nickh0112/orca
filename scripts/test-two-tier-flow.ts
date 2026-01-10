/**
 * Test script for two-tier AI analysis flow
 * Run with: npx tsx scripts/test-two-tier-flow.ts
 */

import 'dotenv/config';
import type { SocialMediaPost, SocialMediaContent } from '../src/types/social-media';

// Mock posts with various content types
const mockPosts: SocialMediaPost[] = [
  {
    id: 'test-1',
    caption: 'Just had an amazing day at the beach! 🏖️ #blessed #summer',
    timestamp: new Date().toISOString(),
    permalink: 'https://instagram.com/p/test1',
    mediaType: 'image',
  },
  {
    id: 'test-2',
    caption: 'OMG thank you @Nike for sending me these new sneakers! Use code CREATOR20 for 20% off! #ad #sponsored #gifted',
    timestamp: new Date().toISOString(),
    permalink: 'https://instagram.com/p/test2',
    mediaType: 'image',
  },
  {
    id: 'test-3',
    caption: 'This political situation is insane. I can\'t believe what they\'re doing. Everyone needs to vote!',
    timestamp: new Date().toISOString(),
    permalink: 'https://instagram.com/p/test3',
    mediaType: 'image',
    transcript: 'So today I want to talk about the election. I think it\'s really important that everyone gets out and votes. The current administration has done some controversial things...',
  },
  {
    id: 'test-4',
    caption: 'Had a few drinks last night 🍺 Party was lit! #nightlife',
    timestamp: new Date().toISOString(),
    permalink: 'https://instagram.com/p/test4',
    mediaType: 'video',
    transcript: 'Last night was crazy, we were drinking all night. Let me show you how to mix this cocktail...',
  },
  {
    id: 'test-5',
    caption: 'Morning workout complete! 💪 Feeling strong and healthy',
    timestamp: new Date().toISOString(),
    permalink: 'https://instagram.com/p/test5',
    mediaType: 'image',
  },
];

async function main() {
  console.log('🧪 Testing Two-Tier AI Analysis Flow\n');
  console.log('Environment check:');
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing'}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('\n❌ ANTHROPIC_API_KEY required for this test');
    process.exit(1);
  }

  const { analyzeSocialMediaContent, convertAnalysisToFindings } = await import('../src/lib/social-media/analyzer');

  const mockContent: SocialMediaContent = {
    platform: 'instagram',
    handle: 'test_creator',
    posts: mockPosts,
  };

  console.log(`\n📊 Testing with ${mockPosts.length} mock posts...`);
  console.log('='.repeat(50));

  try {
    const startTime = Date.now();
    const analyses = await analyzeSocialMediaContent([mockContent], 'Test Creator');
    const duration = Date.now() - startTime;

    console.log(`\n⏱️  Analysis completed in ${(duration / 1000).toFixed(1)}s`);
    console.log('='.repeat(50));

    if (analyses.length > 0) {
      const analysis = analyses[0];

      console.log(`\n📋 Results for @${analysis.handle}:`);
      console.log(`   Platform: ${analysis.platform}`);
      console.log(`   Overall Risk: ${analysis.overallRisk}`);
      console.log(`   Summary: ${analysis.summary}`);

      if (analysis.flaggedPosts.length > 0) {
        console.log(`\n🚩 Flagged Posts (${analysis.flaggedPosts.length}):`);
        for (const post of analysis.flaggedPosts) {
          console.log(`\n   Post ID: ${post.postId}`);
          console.log(`   Severity: ${post.severity}`);
          console.log(`   Concerns: ${post.concerns.join(', ')}`);
          console.log(`   Reason: ${post.reason}`);
          console.log(`   Caption: "${post.caption.slice(0, 80)}..."`);
        }
      } else {
        console.log('\n✅ No posts flagged');
      }

      // Test conversion to findings
      const findings = convertAnalysisToFindings(analyses);
      console.log(`\n📝 Converted to ${findings.length} finding(s)`);
    }

    console.log('\n✨ Two-tier flow test complete!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
