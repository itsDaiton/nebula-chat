import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { env } from '@backend/env';
import { RedisConnectionError } from '@backend/errors/AppError';
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
            // eslint-disable-next-line no-console
            console.error('Redis: Max reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });
    client.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Redis Client Error:', err);
      isConnected = false;
    });
    client.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('Redis: Connection established');
      isConnected = true;
    });
    client.on('ready', () => {
      // eslint-disable-next-line no-console
      console.log('Redis: Client ready');
      isConnected = true;
    });
    client.on('reconnecting', () => {
      // eslint-disable-next-line no-console
      console.log('Redis: Reconnecting...');
      isConnected = false;
    });
    client.on('end', () => {
      // eslint-disable-next-line no-console
      console.log('Redis: Connection closed');
      isConnected = false;
    });

    await client.connect();
    redisClient = client as RedisClientType;
    return redisClient;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // eslint-disable-next-line no-console
    console.error('Failed to connect to Redis:', errorMessage);
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
      // eslint-disable-next-line no-console
      console.log('Redis: Client closed gracefully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error closing Redis client:', error);
    }
  }
};
