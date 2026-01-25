/**
 * Centralized Batch Processing Configuration
 *
 * All concurrency and rate limit settings in one place for easy tuning.
 * These settings are optimized for upgraded Twelve Labs and Claude API rate limits.
 *
 * Last updated: 2026-01-25
 *
 * API Tier assumptions:
 * - Twelve Labs: Standard tier with higher limits
 * - Claude: Tier 2 (1000 RPM available)
 * - Apify: Pro tier with concurrent actors
 */

export const BATCH_CONFIG = {
  /**
   * Creator processing settings
   */
  creators: {
    /** Number of creators to process concurrently */
    concurrent: 25,
    /** Delay between creator batches (ms) */
    interBatchDelayMs: 100,
  },

  /**
   * Video analysis settings (Twelve Labs)
   */
  video: {
    /** Concurrent video analysis jobs */
    concurrency: 25,
    /** Videos per second rate limit */
    ratePerSecond: 25,
    /** Minimum interval between video requests (ms) */
    intervalMs: 200,
    /** Polling interval settings */
    polling: {
      initialMs: 1000,
      minMs: 500,
      maxMs: 5000,
      backoffMultiplier: 1.3,
    },
  },

  /**
   * Image analysis settings (Claude Vision)
   */
  image: {
    /** Concurrent image analysis jobs */
    concurrency: 50,
    /** Images per second rate limit */
    ratePerSecond: 50,
    /** Minimum interval between image requests (ms) */
    intervalMs: 20,
  },

  /**
   * Claude API settings (Haiku/Sonnet)
   */
  claude: {
    /** Concurrent Haiku screening batches */
    haikuConcurrentBatches: 3,
    /** Concurrent brand detection requests */
    brandDetectionConcurrency: 20,
    /** Interval for brand detection queue (ms) */
    brandDetectionIntervalMs: 100,
    /** Base delay between validation requests (ms) */
    validationDelayMs: 20,
  },

  /**
   * Scraper settings (Apify)
   */
  scraper: {
    /** Concurrent scraper jobs */
    concurrency: 15,
    /** Concurrent Apify actor runs */
    apifyConcurrency: 15,
  },

  /**
   * Ad format analysis settings
   */
  adFormat: {
    /** Concurrent ad format analysis jobs */
    concurrency: 25,
    /** Rate limit per minute */
    ratePerMinute: 250,
  },

  /**
   * Batch coordinator settings
   */
  coordinator: {
    /** Concurrent batch coordination jobs */
    concurrency: 5,
    /** Coordinator rate per second */
    ratePerSecond: 5,
  },

  /**
   * Retry configuration
   */
  retry: {
    /** Maximum retry attempts */
    maxRetries: 3,
    /** Base delay for exponential backoff (ms) */
    retryDelayMs: 1000,
  },
} as const;

/**
 * Type for the batch configuration
 */
export type BatchConfig = typeof BATCH_CONFIG;

/**
 * Get a specific config section with defaults
 */
export function getConfig<K extends keyof BatchConfig>(section: K): BatchConfig[K] {
  return BATCH_CONFIG[section];
}

/**
 * Environment-based overrides
 * Use environment variables to override defaults if needed
 */
export function getEnvOverride(key: string, defaultValue: number): number {
  const envValue = process.env[`BATCH_${key.toUpperCase()}`];
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}
