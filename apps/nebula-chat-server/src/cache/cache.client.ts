import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { env } from '@backend/env';
import { RedisConnectionError } from '@backend/errors/AppError';
import { logger } from '@backend/logger';
import { cacheConfig } from '@backend/cache/cache.config';

let redisClient: RedisClientType | null = null;
let isConnected = false;

export const createRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    const client = createClient({
      url: env.REDIS_URL,
      ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > cacheConfig.maxConnections) {
            logger.error('Redis: Max reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });
    client.on('error', (err) => {
      logger.error(err, 'Redis Client Error');
      isConnected = false;
    });
    client.on('connect', () => {
      logger.info('Redis: Connection established');
      isConnected = true;
    });
    client.on('ready', () => {
      logger.info('Redis: Client ready');
      isConnected = true;
    });
    client.on('reconnecting', () => {
      logger.warn('Redis: Reconnecting...');
      isConnected = false;
    });
    client.on('end', () => {
      logger.info('Redis: Connection closed');
      isConnected = false;
    });

    await client.connect();
    redisClient = client as RedisClientType;
    return redisClient;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to connect to Redis: %s', errorMessage);
    throw new RedisConnectionError(`Failed to connect to Redis: ${errorMessage}`);
  }
};

export const isRedisConnected = (): boolean => isConnected;

export const closeRedisClient = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      isConnected = false;
      logger.info('Redis: Client closed gracefully');
    } catch (error) {
      logger.error(error, 'Error closing Redis client');
    }
  }
};
