/**
 * Redis Client for BullMQ Queue System
 *
 * Provides a shared Redis connection for all queue operations.
 * Uses ioredis for reliable connection management.
 *
 * Environment variables:
 * - REDIS_URL: Full Redis connection string (e.g., redis://localhost:6379)
 * - REDIS_HOST: Redis host (default: localhost)
 * - REDIS_PORT: Redis port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 */

import Redis from 'ioredis';

// Connection options from environment
const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Connection pool configuration
const CONNECTION_CONFIG = {
  maxRetriesPerRequest: null, // Required by BullMQ
  retryStrategy: (times: number) => {
    // Exponential backoff with cap
    const delay = Math.min(times * 100, 3000);
    console.log(`[Redis] Retrying connection (attempt ${times}, delay ${delay}ms)`);
    return delay;
  },
  reconnectOnError: (err: Error): boolean => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  },
  enableReadyCheck: true,
  lazyConnect: true, // Connect on first use
};

// Singleton connection instance
let redisConnection: Redis | null = null;
let connectionPromise: Promise<Redis> | null = null;

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!(REDIS_URL || REDIS_HOST);
}

/**
 * Get or create the Redis connection
 * Returns a singleton connection instance
 */
export async function getRedisConnection(): Promise<Redis> {
  // Return existing connection if available
  if (redisConnection && redisConnection.status === 'ready') {
    return redisConnection;
  }

  // Return pending connection if one is being established
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection
  connectionPromise = createConnection();
  return connectionPromise;
}

/**
 * Create a new Redis connection
 */
async function createConnection(): Promise<Redis> {
  console.log('[Redis] Creating new connection...');

  try {
    // Use URL if provided, otherwise build from components
    if (REDIS_URL) {
      redisConnection = new Redis(REDIS_URL, CONNECTION_CONFIG);
    } else {
      redisConnection = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        ...CONNECTION_CONFIG,
      });
    }

    // Connect and wait for ready
    await redisConnection.connect();

    redisConnection.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisConnection.on('close', () => {
      console.log('[Redis] Connection closed');
      redisConnection = null;
      connectionPromise = null;
    });

    redisConnection.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    console.log('[Redis] Connected successfully');
    return redisConnection;
  } catch (error) {
    console.error('[Redis] Failed to connect:', error);
    connectionPromise = null;
    throw error;
  }
}

/**
 * Get Redis connection options for BullMQ
 * These can be passed directly to Queue/Worker constructors
 */
export function getRedisConnectionOptions(): { host: string; port: number; password?: string } {
  if (REDIS_URL) {
    // Parse Redis URL into components for BullMQ compatibility
    try {
      const url = new URL(REDIS_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        ...(url.password && { password: url.password }),
      };
    } catch {
      // Fallback if URL parsing fails
      return { host: REDIS_HOST, port: REDIS_PORT };
    }
  }

  return {
    host: REDIS_HOST,
    port: REDIS_PORT,
    ...(REDIS_PASSWORD && { password: REDIS_PASSWORD }),
  };
}

/**
 * Close the Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    console.log('[Redis] Closing connection...');
    await redisConnection.quit();
    redisConnection = null;
    connectionPromise = null;
  }
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  try {
    const connection = await getRedisConnection();
    const start = Date.now();
    await connection.ping();
    const latencyMs = Date.now() - start;

    return { connected: true, latencyMs };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
