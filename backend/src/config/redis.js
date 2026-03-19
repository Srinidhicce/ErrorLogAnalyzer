const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let isRedisConnected = false;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries) => {
          if (retries >= 1) return false;
          return 500;
        }
      }
    });

    let errorLogged = false;
    redisClient.on('error', () => {
      if (!errorLogged) {
        logger.warn('Redis unavailable - using MongoDB cache fallback (this is fine).');
        errorLogged = true;
      }
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
      isRedisConnected = true;
    });

    redisClient.on('disconnect', () => {
      isRedisConnected = false;
    });

    await redisClient.connect();
  } catch {
    logger.warn('Redis unavailable - using MongoDB cache fallback (this is fine).');
    isRedisConnected = false;
  }
};

const getRedisClient = () => redisClient;
const isRedisAvailable = () => isRedisConnected;

module.exports = { connectRedis, getRedisClient, isRedisAvailable };