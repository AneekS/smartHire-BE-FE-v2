import Redis from 'ioredis';

// Shared reconnect helper
const reconnectOnError = (err: Error) => err.message.includes('READONLY');

// Prefer REDIS_URL (used by BullMQ and cache.ts) so all modules share
// a single configuration source.  Fall back to HOST/PORT for local dev.
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      reconnectOnError,
    })
  : new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      reconnectOnError,
    });

// Handle connection events
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('✅ Redis ready for operations');
});

redis.on('error', (err: Error) => {
  console.error('❌ Redis connection error:', err.message);
});

redis.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

redis.on('end', () => {
  console.log('🔚 Redis connection ended');
});

// Graceful shutdown handler
const gracefulShutdown = () => {
  try {
    redis.disconnect();
    console.log('✅ Redis disconnected gracefully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during Redis shutdown:', err);
    process.exit(1);
  }
};

// Handle process termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Export the Redis instance with proper typing
export { redis };

// Export type for use in other modules
export type RedisClient = Redis;