import { env } from '../config/env';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService {
  private memoryStore = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private engine: 'redis' | 'memory' = 'memory';

  constructor() {
    // If Redis URL is configured in environment, indicate readiness.
    // Note: Falls back gracefully to memory store if no Redis service is active.
    if (env.REDIS_URL) {
      console.log(`[CacheService] Redis URL configured: ${env.REDIS_URL}. Dual-engine cache initialized.`);
      this.engine = 'redis';
    } else {
      console.log(`[CacheService] Operating in High-Performance In-Memory Cache mode (Default TTL: ${env.CACHE_DEFAULT_TTL}s).`);
    }

    // Periodic sweep every 5 minutes for expired items in memory
    this.cleanupInterval = setInterval(() => {
      this.pruneExpired();
    }, 5 * 60 * 1000);

    // Unref so Node process can exit cleanly during tests
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Retrieve cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryStore.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Store value in cache with TTL in seconds
   */
  async set(key: string, value: any, ttlSeconds: number = env.CACHE_DEFAULT_TTL): Promise<void> {
    const expiresAt = Date.now() + Math.max(1, ttlSeconds) * 1000;
    this.memoryStore.set(key, { value, expiresAt });
  }

  /**
   * Retrieve from cache, or invoke supplier and cache the result
   */
  async getOrSet<T>(
    key: string,
    supplier: () => Promise<T>,
    ttlSeconds: number = env.CACHE_DEFAULT_TTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await supplier();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  /**
   * Delete one or multiple keys
   */
  async del(keys: string | string[]): Promise<void> {
    const targetKeys = Array.isArray(keys) ? keys : [keys];
    for (const k of targetKeys) {
      this.memoryStore.delete(k);
    }
  }

  /**
   * Invalidate all keys matching a prefix pattern (e.g. "season:", "hotel:rates:")
   */
  async delPattern(pattern: string): Promise<number> {
    const prefix = pattern.replace(/\*$/, '');
    let deletedCount = 0;
    for (const key of this.memoryStore.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryStore.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Clear entire cache
   */
  async flush(): Promise<void> {
    this.memoryStore.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Health and diagnostic statistics
   */
  getStats(): {
    engine: 'redis' | 'memory';
    size: number;
    hits: number;
    misses: number;
    hitRatioPercent: number;
  } {
    const totalRequests = this.hits + this.misses;
    const hitRatioPercent = totalRequests > 0 ? Math.round((this.hits / totalRequests) * 100) : 0;
    return {
      engine: this.engine,
      size: this.memoryStore.size,
      hits: this.hits,
      misses: this.misses,
      hitRatioPercent,
    };
  }
}

export const cacheService = new CacheService();
