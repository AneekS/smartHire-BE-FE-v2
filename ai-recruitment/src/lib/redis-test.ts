import { redis } from './redis';

/**
 * Redis Test Utility
 * 
 * Simple test function to verify Redis connection and basic operations.
 * This can be used during development or in health checks.
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    console.log('🧪 Testing Redis connection...');
    
    // Test basic operations
    const testKey = 'smarthire:test';
    const testValue = 'Redis connected';
    
    // Set a test key
    await redis.set(testKey, testValue);
    console.log('✅ Set test key:', testKey);
    
    // Get the test key
    const retrievedValue = await redis.get(testKey);
    console.log('✅ Retrieved value:', retrievedValue);
    
    // Verify the value
    if (retrievedValue === testValue) {
      console.log('✅ Redis connection test successful!');
      return true;
    } else {
      console.error('❌ Redis test failed: value mismatch');
      return false;
    }
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    return false;
  } finally {
    // Clean up test key
    try {
      await redis.del('smarthire:test');
    } catch (error) {
      console.warn('⚠️ Failed to clean up test key:', error);
    }
  }
}

/**
 * Job Recommendation Types
 */
export interface JobRecommendation {
  id: string;
  title: string;
  location: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
  };
  matchScore: number;
  reasons: string[];
  missingSkills: string[];
  readinessScore: number;
  semanticScore: number;
  postedAt: string;
}

/**
 * Example: Job Recommendations Caching
 * 
 * Demonstrates how to implement caching for job recommendations
 * using the Redis connection directly.
 */
export class JobRecommendationCache {
  private static readonly CACHE_PREFIX = 'recommendations';
  private static readonly CACHE_TTL = 600; // 10 minutes

  /**
   * Get cached job recommendations for a candidate
   */
  static async getCachedRecommendations(candidateId: string): Promise<JobRecommendation[] | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:${candidateId}`;
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        console.log(`✅ Cache hit for candidate ${candidateId}`);
        return JSON.parse(cachedData);
      } else {
        console.log(`❌ Cache miss for candidate ${candidateId}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting cached recommendations:', error);
      return null;
    }
  }

  /**
   * Cache job recommendations for a candidate
   */
  static async setCachedRecommendations(candidateId: string, recommendations: JobRecommendation[]): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:${candidateId}`;
      const cacheData = JSON.stringify(recommendations);
      
      await redis.setex(cacheKey, this.CACHE_TTL, cacheData);
      console.log(`✅ Cached recommendations for candidate ${candidateId} (TTL: ${this.CACHE_TTL}s)`);
    } catch (error) {
      console.error('❌ Error caching recommendations:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for a candidate
   */
  static async invalidateRecommendationsCache(candidateId: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:${candidateId}`;
      await redis.del(cacheKey);
      console.log(`✅ Invalidated cache for candidate ${candidateId}`);
    } catch (error) {
      console.error('❌ Error invalidating cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{ keys: number; memory: string }> {
    try {
      const info = await redis.info('memory');
      const keyspace = await redis.info('keyspace');
      
      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memory = memoryMatch ? memoryMatch[1] : 'unknown';
      
      // Parse keyspace info
      const keyspaceMatch = keyspace.match(/db0:keys=(\d+)/);
      const keys = keyspaceMatch ? parseInt(keyspaceMatch[1], 10) : 0;
      
      return { keys, memory };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return { keys: 0, memory: 'unknown' };
    }
  }
}

/**
 * Example: Safe Redis Usage Pattern
 * 
 * Demonstrates how to safely use Redis in API services
 * with proper error handling and fallbacks.
 */
export class SafeRedisService {
  /**
   * Execute a Redis operation with fallback handling
   */
  static async executeWithFallback<T>(
    redisOperation: () => Promise<T>,
    fallbackValue: T,
    operationName: string
  ): Promise<T> {
    try {
      const result = await redisOperation();
      console.log(`✅ Redis operation '${operationName}' successful`);
      return result;
    } catch (error) {
      console.warn(`⚠️ Redis operation '${operationName}' failed, using fallback:`, error);
      return fallbackValue;
    }
  }

  /**
   * Check if Redis is available
   */
  static async isRedisAvailable(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      console.error('❌ Redis is not available:', error);
      return false;
    }
  }

  /**
   * Get Redis connection status
   */
  static async getConnectionStatus(): Promise<{
    status: 'connected' | 'disconnected' | 'error';
    info: string;
  }> {
    try {
      const info = await redis.info('server');
      return {
        status: 'connected',
        info: 'Redis is connected and ready'
      };
    } catch (error) {
      return {
        status: 'error',
        info: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Example: Integration with Job Recommendation Service
 * 
 * Shows how to integrate Redis caching into the existing
 * job recommendation service.
 */
export class CachedJobRecommendationService {
  private static readonly CACHE_TTL = 600; // 10 minutes

  /**
   * Get job recommendations with caching
   */
  static async getRecommendationsWithCache(
    candidateId: string,
    fetchFromDatabase: () => Promise<JobRecommendation[]>
  ): Promise<JobRecommendation[]> {
    // First, try to get from cache
    const cachedRecommendations = await JobRecommendationCache.getCachedRecommendations(candidateId);
    
    if (cachedRecommendations) {
      return cachedRecommendations;
    }

    // If not cached, fetch from database
    console.log(`🔄 Fetching recommendations for candidate ${candidateId} from database...`);
    const recommendations = await fetchFromDatabase();

    // Cache the result
    await JobRecommendationCache.setCachedRecommendations(candidateId, recommendations);

    return recommendations;
  }

  /**
   * Invalidate cache when recommendations are updated
   */
  static async invalidateCacheOnUpdate(candidateId: string): Promise<void> {
    await JobRecommendationCache.invalidateRecommendationsCache(candidateId);
  }
}

// Export for direct use in API routes or services
export { redis };