const Redis = require('ioredis');
const { redisUrl } = require('../config/env');

const redis = new Redis(redisUrl);

async function getCachedWeather(cityCode){
    const cachedData = await redis.get(cityCode);
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    return null;
}

async function setCachedWeather(cityCode, data, ttlSeconds){
    await redis.setex(cityCode, ttlSeconds, JSON.stringify(data));
}

module.exports = {getCachedWeather, setCachedWeather};

