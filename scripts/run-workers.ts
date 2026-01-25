/**
 * Worker Runner Script
 *
 * Starts all BullMQ workers for processing queued jobs.
 * Run with: npm run workers
 *
 * Workers:
 * - Video Analysis Worker
 * - Scraper Worker
 * - Ad Format Analysis Worker
 */

import 'dotenv/config';
import { startAllWorkers, stopAllWorkers, isDistributedQueueAvailable } from '../src/lib/queue';

async function main() {
  console.log('='.repeat(60));
  console.log('BullMQ Worker Runner');
  console.log('='.repeat(60));

  // Check Redis connection
  if (!isDistributedQueueAvailable()) {
    console.error('\nError: Redis is not configured.');
    console.error('Set REDIS_URL or REDIS_HOST environment variable.');
    process.exit(1);
  }

  console.log('\nEnvironment:');
  console.log(`  REDIS_URL: ${process.env.REDIS_URL ? 'Set' : 'Not set'}`);
  console.log(`  REDIS_HOST: ${process.env.REDIS_HOST || 'Not set'}`);
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`  TWELVE_LABS_API_KEY: ${process.env.TWELVE_LABS_API_KEY ? 'Set' : 'Not set'}`);

  console.log('\nStarting workers...');

  try {
    await startAllWorkers();
    console.log('\nAll workers started successfully!');
    console.log('Press Ctrl+C to stop workers.\n');

    // Keep process running
    process.on('SIGINT', async () => {
      console.log('\n\nReceived SIGINT, stopping workers...');
      await stopAllWorkers();
      console.log('Workers stopped.');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\nReceived SIGTERM, stopping workers...');
      await stopAllWorkers();
      console.log('Workers stopped.');
      process.exit(0);
    });

    // Keep alive
    await new Promise(() => {});
  } catch (error) {
    console.error('Failed to start workers:', error);
    process.exit(1);
  }
}

main().catch(console.error);
