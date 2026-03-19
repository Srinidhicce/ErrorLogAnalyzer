const { getRedisClient, isRedisAvailable } = require('../config/redis');
const Cache = require('../models/Cache');
const logger = require('../utils/logger');

const CACHE_TTL = 7 * 24 * 60 * 60; 


const getCached = async (key) => {
  try {
   
    if (isRedisAvailable()) {
      const client = getRedisClient();
      const value = await client.get(key);
      if (value) {
        logger.debug(`Cache HIT (Redis): ${key}`);
    
        Cache.findOneAndUpdate({ cacheKey: key }, {
          $inc: { hitCount: 1 }, $set: { lastAccessed: new Date() }
        }).catch(() => {});
        return JSON.parse(value);
      }
    }


    const cached = await Cache.findOne({ cacheKey: key });
    if (cached) {
      logger.debug(`Cache HIT (MongoDB): ${key}`);
      await cached.incrementHit();
      
      if (isRedisAvailable()) {
        const client = getRedisClient();
        await client.setEx(key, CACHE_TTL, JSON.stringify(cached.aiAnalysis));
      }
      return cached.aiAnalysis;
    }

    logger.debug(`Cache MISS: ${key}`);
    return null;
  } catch (error) {
    logger.error('Cache get error:', error.message);
    return null;
  }
};


const setCached = async (key, value, provider) => {
  try {

    if (isRedisAvailable()) {
      const client = getRedisClient();
      await client.setEx(key, CACHE_TTL, JSON.stringify(value));
    }


    await Cache.findOneAndUpdate(
      { cacheKey: key },
      {
        cacheKey: key,
        provider,
        aiAnalysis: value,
        lastAccessed: new Date(),
        expiresAt: new Date(Date.now() + CACHE_TTL * 1000)
      },
      { upsert: true, new: true }
    );

    logger.debug(`Cache SET: ${key}`);
  } catch (error) {
    logger.error('Cache set error:', error.message);
  }
};


const deleteCached = async (key) => {
  try {
    if (isRedisAvailable()) {
      const client = getRedisClient();
      await client.del(key);
    }
    await Cache.deleteOne({ cacheKey: key });
  } catch (error) {
    logger.error('Cache delete error:', error.message);
  }
};


const getCacheStats = async () => {
  try {
    const stats = await Cache.aggregate([
      { $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        totalHits: { $sum: '$hitCount' },
        avgHits: { $avg: '$hitCount' }
      }}
    ]);
    return stats[0] || { totalEntries: 0, totalHits: 0, avgHits: 0 };
  } catch (error) {
    return { totalEntries: 0, totalHits: 0, avgHits: 0 };
  }
};

module.exports = { getCached, setCached, deleteCached, getCacheStats };