# Redis Integration Guide for SmartHire

This guide explains how to use Redis caching in the SmartHire platform to improve API performance.

## Overview

We've implemented a comprehensive Redis caching solution with the following components:

- **Redis Connection Module**: `src/lib/redis.ts` - Core Redis client setup
- **Redis Test Utility**: `src/lib/redis-test.ts` - Testing and caching utilities
- **API Integration Example**: `src/app/api/jobs/recommendations/route.ts` - Practical usage
- **Usage Examples**: `src/lib/redis-examples.ts` - Various caching patterns

## Quick Start

### 1. Test Redis Connection

```typescript
import { testRedisConnection } from '@/lib/redis-test';

// Test Redis connectivity
const isWorking = await testRedisConnection();
if (isWorking) {
  console.log('Redis is ready!');
}
```

### 2. Basic Usage

```typescript
import { redis } from '@/lib/redis';

// Set a value
await redis.set('key', 'value');

// Get a value
const value = await redis.get('key');

// Set with TTL (Time To Live)
await redis.setex('key', 300, 'value'); // 5 minutes
```

## Job Recommendations Caching

### Cache Flow

1. **Check Cache**: Look for cached recommendations using key `recommendations:{candidateId}`
2. **Cache Hit**: Return cached result if available
3. **Cache Miss**: Fetch from database, store in Redis with 600s TTL, return result

### Example Implementation

```typescript
import { JobRecommendationCache } from '@/lib/redis-test';

// Get cached recommendations
const cached = await JobRecommendationCache.getCachedRecommendations(candidateId);
if (cached) {
  return cached;
}

// Fetch from database
const recommendations = await fetchFromDatabase();

// Cache the result
await JobRecommendationCache.setCachedRecommendations(candidateId, recommendations);
```

## Safe Redis Usage Patterns

### Error Handling

```typescript
import { SafeRedisService } from '@/lib/redis-test';

// Check if Redis is available
const isAvailable = await SafeRedisService.isRedisAvailable();

if (isAvailable) {
  // Use Redis
  const result = await redis.get('key');
} else {
  // Fallback to database
  const result = await getFromDatabase();
}
```

### Fallback Pattern

```typescript
import { SafeRedisService } from '@/lib/redis-test';

const result = await SafeRedisService.executeWithFallback(
  () => redis.get('key'),
  'fallback_value',
  'get_operation'
);
```

## Available Caching Patterns

### 1. Job Recommendations
- **Key Pattern**: `recommendations:{candidateId}`
- **TTL**: 600 seconds (10 minutes)
- **Use Case**: Cache personalized job recommendations

### 2. User Sessions
- **Key Pattern**: `session:{userId}`
- **TTL**: 3600 seconds (1 hour)
- **Use Case**: Cache user session data

### 3. Search Results
- **Key Pattern**: `search:{userId}:{query}`
- **TTL**: 300 seconds (5 minutes)
- **Use Case**: Cache job search results

### 4. Rate Limiting
- **Key Pattern**: `rate_limit:{identifier}`
- **TTL**: 60 seconds (configurable)
- **Use Case**: API rate limiting

## API Integration

### Example API Route

```typescript
// GET /api/jobs/recommendations
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Check Redis availability
  const isRedisAvailable = await SafeRedisService.isRedisAvailable();
  
  if (isRedisAvailable) {
    // Try cache first
    const cached = await JobRecommendationCache.getCachedRecommendations(session.user.email);
    if (cached) {
      return NextResponse.json({ data: cached, source: 'cache' });
    }
  }
  
  // Fetch from database
  const recommendations = await getRecommendationsFromDB();
  
  // Cache if Redis available
  if (isRedisAvailable) {
    await JobRecommendationCache.setCachedRecommendations(session.user.email, recommendations);
  }
  
  return NextResponse.json({ data: recommendations, source: 'database' });
}
```

## Environment Configuration

### Redis Configuration

Set these environment variables in `.env.local`:

```bash
# Redis connection (optional - falls back to localhost)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379
```

### Default Values

- **Host**: `127.0.0.1` (if REDIS_HOST not set)
- **Port**: `6379` (if REDIS_PORT not set)

## Error Handling

### Graceful Degradation

The Redis implementation is designed to fail gracefully:

1. **Redis Unavailable**: Falls back to database queries
2. **Connection Errors**: Logs errors but doesn't crash the application
3. **Invalid Cache**: Returns null and falls back to database

### Monitoring

```typescript
import { RedisMonitoringService } from '@/lib/redis-examples';

// Get health report
const report = await RedisMonitoringService.getHealthReport();
console.log('Redis Status:', report.redis.status);
console.log('Cache Keys:', report.cache.keys);
```

## Performance Considerations

### Cache Invalidation

```typescript
// Invalidate specific user cache
await JobRecommendationCache.invalidateRecommendationsCache(userId);

// Bulk invalidation (use sparingly)
await CacheInvalidationService.invalidateAllJobCaches();
```

### Cache Warming

```typescript
// Pre-populate cache for better performance
await CacheWarmingService.warmJobRecommendationsCache(userId);
```

## Best Practices

1. **Use Appropriate TTL**: Don't cache data longer than necessary
2. **Handle Errors Gracefully**: Always have fallback mechanisms
3. **Monitor Cache Hit Rates**: Track performance improvements
4. **Invalidate Strategically**: Clear cache when data changes
5. **Use Descriptive Keys**: Make debugging easier

## Troubleshooting

### Common Issues

1. **Redis Not Running**: Ensure Redis server is running on localhost:6379
2. **Connection Timeout**: Check network connectivity and Redis configuration
3. **Memory Issues**: Monitor Redis memory usage and adjust TTLs
4. **Serialization Errors**: Ensure data is JSON-serializable

### Debug Commands

```typescript
// Test connection
await testRedisConnection();

// Check Redis status
const status = await SafeRedisService.getConnectionStatus();

// Get cache statistics
const stats = await JobRecommendationCache.getCacheStats();
```

## Integration with Existing Services

The Redis caching can be integrated with existing services like:

- **JobRecommendationService**: Cache recommendation results
- **JobSearchService**: Cache search results
- **ProfileService**: Cache user profile data
- **ApplicationService**: Cache application status

Each service can implement caching patterns similar to the examples provided.

## Next Steps

1. **Deploy Redis**: Set up Redis in your production environment
2. **Configure Environment**: Set REDIS_URL in production
3. **Monitor Performance**: Track cache hit rates and response times
4. **Optimize TTLs**: Adjust cache durations based on data freshness requirements
5. **Add More Caches**: Identify other performance bottlenecks to cache

## Support

For questions or issues with Redis integration:

1. Check the troubleshooting section above
2. Review the example implementations
3. Monitor Redis logs for connection issues
4. Use the health check endpoints to verify Redis status