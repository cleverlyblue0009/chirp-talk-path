import Redis from 'ioredis';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { logger } from './logger';

// Redis connection
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('ready', () => {
  logger.info('Redis ready');
});

// Analysis job queue
export const analysisQueue = new Queue('analysis', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Queue events for monitoring
export const analysisQueueEvents = new QueueEvents('analysis', {
  connection: redis,
});

analysisQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Analysis job ${jobId} completed`);
});

analysisQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Analysis job ${jobId} failed:`, failedReason);
});

analysisQueueEvents.on('progress', ({ jobId, data }) => {
  logger.info(`Analysis job ${jobId} progress:`, data);
});

// Health check for Redis
export const redisHealthCheck = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
};

// Graceful shutdown
export const shutdownRedis = async (): Promise<void> => {
  try {
    await analysisQueue.close();
    await analysisQueueEvents.close();
    redis.disconnect();
    logger.info('Redis connections closed');
  } catch (error) {
    logger.error('Error shutting down Redis:', error);
  }
};