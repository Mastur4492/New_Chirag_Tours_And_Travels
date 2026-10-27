import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  body: any;
  contentType: string;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

/**
 * In-memory response cache middleware for frequently read catalogs (destinations, packages, hotels, etc.)
 * @param ttlSeconds Time-to-live in seconds (default: 60)
 */
export function cacheResponse(ttlSeconds: number = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache safe GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.baseUrl}${req.path}?${JSON.stringify(req.query)}`;
    const now = Date.now();
    const cached = memoryCache.get(key);

    if (cached && cached.expiresAt > now) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=120`);
      res.setHeader('Content-Type', cached.contentType || 'application/json');
      return res.send(cached.body);
    }

    // Capture res.send
    const originalSend = res.send.bind(res);
    res.send = (body: any): Response => {
      // Only cache successful 200 responses
      if (res.statusCode === 200) {
        const contentType = res.getHeader('Content-Type') as string || 'application/json';
        memoryCache.set(key, {
          body,
          contentType,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=120`);
      }
      return originalSend(body);
    };

    next();
  };
}

/**
 * Invalidate cache entries matching a prefix (e.g., when a destination or hotel is created/updated)
 */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  memoryCache.forEach((_, key) => {
    if (key.includes(prefix)) {
      memoryCache.delete(key);
    }
  });
}
