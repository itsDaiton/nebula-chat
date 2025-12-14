import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { RedisConnectionError } from '@backend/errors/AppError';
import { cacheConfig } from './cache.config';

let redisClient: RedisClientType | null = null;
let isConnected = false;

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new RedisConnectionError('REDIS_URL is not defined in environment variables');
}

export const createRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    const client = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > cacheConfig.maxConnections) {
            // eslint-disable-next-line no-console
            console.error('Redis: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
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

export const getRedisClient = (): RedisClientType | null => redisClient;

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
