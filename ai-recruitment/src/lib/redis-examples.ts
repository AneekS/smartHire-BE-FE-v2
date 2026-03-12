/**
 * Redis Usage Examples for SmartHire Platform
 * 
 * This file demonstrates various ways to use Redis caching
 * throughout the SmartHire application with proper error handling.
 */

import { redis } from './redis';
import { 
  testRedisConnection, 
  JobRecommendationCache, 
  SafeRedisService,
  CachedJobRecommendationService,
  JobRecommendation 
} from './redis-test';

/**
 * Example 1: Basic Redis Operations
 * 
 * Simple key-value operations with error handling
 */
export class BasicRedisExample {
  static async setAndGet<T>(key: string, value: T): Promise<T | null> {
    try {
      // Set value with JSON serialization
      await redis.set(key, JSON.stringify(value));
      
      // Get value and parse JSON
      const result = await redis.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('❌ Redis operation failed:', error);
      throw error;
    }
  }

  static async setWithTTL<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      console.log(`✅ Set ${key} with TTL ${ttlSeconds}s`);
    } catch (error) {
      console.error('❌ Failed to set with TTL:', error);
      throw error;
    }
  }
}

/**
 * Example 2: User Session Caching
 * 
 * Cache user session data with automatic expiration
 */
export class UserSessionCache {
  private static readonly SESSION_PREFIX = 'session';
  private static readonly SESSION_TTL = 3600; // 1 hour

  static async setSession(userId: string, sessionData: Record<string, unknown>): Promise<void> {
    const key = `${this.SESSION_PREFIX}:${userId}`;
    await redis.setex(key, this.SESSION_TTL, JSON.stringify(sessionData));
  }

  static async getSession(userId: string): Promise<Record<string, unknown> | null> {
    const key = `${this.SESSION_PREFIX}:${userId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  static async extendSession(userId: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}:${userId}`;
    // Reset TTL
    const data = await redis.get(key);
    if (data) {
      await redis.setex(key, this.SESSION_TTL, data);
    }
  }
}

/**
 * Example 3: Job Search Results Caching
 * 
 * Cache search results to improve API performance
 */
export class JobSearchCache {
  private static readonly SEARCH_PREFIX = 'search';
  private static readonly SEARCH_TTL = 300; // 5 minutes

  static async cacheSearchResults(
    userId: string, 
    query: string, 
    results: JobRecommendation[]
  ): Promise<void> {
    const key = `${this.SEARCH_PREFIX}:${userId}:${encodeURIComponent(query)}`;
    await redis.setex(key, this.SEARCH_TTL, JSON.stringify(results));
  }

  static async getSearchResults(userId: string, query: string): Promise<JobRecommendation[] | null> {
    const key = `${this.SEARCH_PREFIX}:${userId}:${encodeURIComponent(query)}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
}

/**
 * Example 4: Rate Limiting with Redis
 * 
 * Implement rate limiting for API endpoints
 */
export class RateLimitCache {
  private static readonly RATE_LIMIT_PREFIX = 'rate_limit';
  private static readonly DEFAULT_WINDOW = 60; // 1 minute
  private static readonly DEFAULT_LIMIT = 100; // requests per window

  static async isRateLimited(
    identifier: string, 
    windowSeconds: number = this.DEFAULT_WINDOW,
    limit: number = this.DEFAULT_LIMIT
  ): Promise<boolean> {
    const key = `${this.RATE_LIMIT_PREFIX}:${identifier}`;
    
    try {
      // Use Redis INCR to count requests
      const current = await redis.incr(key);
      
      if (current === 1) {
        // Set expiration on first request
        await redis.expire(key, windowSeconds);
      }
      
      return current > limit;
    } catch (error) {
      console.error('❌ Rate limiting check failed:', error);
      // Fail open - allow requests if Redis is down
      return false;
    }
  }

  static async getRateLimitStatus(identifier: string): Promise<{ current: number; limit: number }> {
    const key = `${this.RATE_LIMIT_PREFIX}:${identifier}`;
    const current = await redis.get(key);
    return {
      current: current ? parseInt(current, 10) : 0,
      limit: this.DEFAULT_LIMIT
    };
  }
}

/**
 * Example 5: Cache Warming
 * 
 * Pre-populate cache with frequently accessed data
 */
export class CacheWarmingService {
  static async warmJobRecommendationsCache(userId: string): Promise<void> {
    try {
      // This would typically call your recommendation service
      // and cache the results proactively
      console.log(`🔄 Warming cache for user ${userId}`);
      
      // Example: Pre-cache popular jobs
      const popularJobs = await this.getPopularJobs();
      await JobRecommendationCache.setCachedRecommendations(userId, popularJobs);
      
      console.log(`✅ Cache warmed for user ${userId}`);
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
    }
  }

  private static async getPopularJobs(): Promise<JobRecommendation[]> {
    // Mock implementation - would fetch from database
    return [
      {
        id: 'job-1',
        title: 'Senior Software Engineer',
        location: 'Remote',
        company: {
          id: 'company-1',
          name: 'Tech Corp',
          industry: 'Technology'
        },
        matchScore: 85,
        reasons: ['Skills match', 'Experience level'],
        missingSkills: ['Docker'],
        readinessScore: 90,
        semanticScore: 75,
        postedAt: new Date().toISOString()
      }
    ];
  }
}

/**
 * Example 6: Cache Invalidation Patterns
 * 
 * Smart cache invalidation strategies
 */
export class CacheInvalidationService {
  static async invalidateUserCaches(userId: string): Promise<void> {
    try {
      // Invalidate all user-related caches
      await Promise.all([
        JobRecommendationCache.invalidateRecommendationsCache(userId),
        UserSessionCache.getSession(userId), // This will return null, effectively invalidating
        // Add other cache invalidation calls as needed
      ]);
      
      console.log(`✅ Invalidated caches for user ${userId}`);
    } catch (error) {
      console.error('❌ Cache invalidation failed:', error);
      throw error;
    }
  }

  static async invalidateAllJobCaches(): Promise<void> {
    try {
      // This would scan and delete all job-related cache keys
      // Note: In production, you might want more targeted invalidation
      const keys = await redis.keys('recommendations:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      console.log(`✅ Invalidated ${keys.length} job cache entries`);
    } catch (error) {
      console.error('❌ Bulk cache invalidation failed:', error);
      throw error;
    }
  }
}

/**
 * Example 7: Health Check and Monitoring
 * 
 * Monitor Redis health and performance
 */
export class RedisMonitoringService {
  static async getHealthReport(): Promise<{
    redis: { status: string; info: string };
    cache: { keys: number; memory: string };
    performance: { avgResponseTime: number; totalOperations: number };
  }> {
    const [redisStatus, cacheStats] = await Promise.all([
      SafeRedisService.getConnectionStatus(),
      JobRecommendationCache.getCacheStats()
    ]);

    return {
      redis: {
        status: redisStatus.status,
        info: redisStatus.info
      },
      cache: cacheStats,
      performance: {
        avgResponseTime: 0, // Would track actual metrics
        totalOperations: 0  // Would track actual metrics
      }
    };
  }

  static async logCacheMetrics(): Promise<void> {
    const report = await this.getHealthReport();
    console.log('📊 Redis Cache Metrics:', JSON.stringify(report, null, 2));
  }
}

/**
 * Example 8: Integration with Existing Services
 * 
 * How to integrate Redis caching with existing services
 */
export class ServiceIntegrationExample {
  /**
   * Example: Enhanced Job Service with Caching
   */
  static async getJobsWithCaching(
    userId: string,
    filters: Record<string, unknown>,
    fetchFromService: () => Promise<JobRecommendation[]>
  ): Promise<JobRecommendation[]> {
    // Try cache first
    const cachedJobs = await JobSearchCache.getSearchResults(userId, JSON.stringify(filters));
    if (cachedJobs) {
      return cachedJobs;
    }

    // Fetch from service
    const jobs = await fetchFromService();

    // Cache results
    await JobSearchCache.cacheSearchResults(userId, JSON.stringify(filters), jobs);

    return jobs;
  }

  /**
   * Example: Safe Service Call with Fallback
   */
  static async callServiceWithFallback<T>(
    serviceCall: () => Promise<T>,
    fallbackValue: T,
    serviceName: string
  ): Promise<T> {
    try {
      return await SafeRedisService.executeWithFallback(
        serviceCall,
        fallbackValue,
        serviceName
      );
    } catch (error) {
      console.error(`❌ Service ${serviceName} failed:`, error);
      return fallbackValue;
    }
  }
}
