require('dotenv').config();

module.exports = {
    weatherApiKey: process.env.WEATHER_API_KEY,
    port: process.env.PORT || 3000,
    redisUrl: process.env.REDIS_URL,
    cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS) || 3600,
};
