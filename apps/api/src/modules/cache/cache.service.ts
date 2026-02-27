import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Lightweight Redis cache service for hot-path queries.
 * Falls back gracefully to no-cache if Redis is unavailable.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: import('ioredis').default | null = null;
  private ready = false;

  constructor(private readonly configService: ConfigService) {
    this.connect();
  }

  private async connect(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL', '');
    if (!redisUrl) return;

    try {
      const Redis = (await import('ioredis')).default;
      const password = this.configService.get<string>('REDIS_PASSWORD', '');

      this.client = new Redis(redisUrl, {
        password: password || undefined,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
        keyPrefix: 'sardoba:',
      });

      this.client.on('ready', () => {
        this.ready = true;
        this.logger.log('Redis cache connected');
      });

      this.client.on('error', (err) => {
        this.ready = false;
        this.logger.warn(`Redis cache error: ${err.message}`);
      });
    } catch {
      this.logger.warn('Redis cache unavailable — running without cache');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  /**
   * Get a cached value, or compute and store it.
   * Falls back to computing directly if Redis is unavailable.
   */
  async getOrSet<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    if (!this.ready || !this.client) {
      return compute();
    }

    try {
      const cached = await this.client.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Cache read failed — compute directly
    }

    const value = await compute();

    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Cache write failed — ignore
    }

    return value;
  }

  /**
   * Invalidate cache keys by pattern.
   */
  async invalidate(pattern: string): Promise<void> {
    if (!this.ready || !this.client) return;

    try {
      // Use SCAN to find keys matching pattern (safe for production)
      const stream = this.client.scanStream({ match: `sardoba:${pattern}`, count: 100 });
      const pipeline = this.client.pipeline();

      stream.on('data', (keys: string[]) => {
        for (const key of keys) {
          // Remove the keyPrefix since pipeline operates at raw level
          pipeline.del(key);
        }
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('end', async () => {
          try {
            await pipeline.exec();
            resolve();
          } catch {
            resolve(); // Ignore pipeline errors
          }
        });
        stream.on('error', () => resolve());
      });
    } catch {
      // Ignore invalidation errors
    }
  }

  /**
   * Set a value in the cache with a TTL.
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.ready || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Ignore cache write errors
    }
  }

  /**
   * Get a value from the cache. Returns null if not found or unavailable.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.ready || !this.client) return null;
    try {
      const cached = await this.client.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Ignore cache read errors
    }
    return null;
  }

  /**
   * Delete a specific key.
   */
  async del(key: string): Promise<void> {
    if (!this.ready || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // Ignore
    }
  }
}
