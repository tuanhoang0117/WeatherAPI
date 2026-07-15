const express = require('express');
const router = express.Router();
const { getWeatherForCity } = require('../services/weatherProvider');
const { getCachedWeather, setCachedWeather } = require('../services/cache');

router.get('/:cityCode', async (req, res) => {
    const rawCityCode = req.params.cityCode.trim();
    const cacheKey = rawCityCode.toLowerCase();
    let weatherData = await getCachedWeather(cacheKey);

    if (!weatherData) {
        try {
            weatherData = await getWeatherForCity(rawCityCode);
            await setCachedWeather(cacheKey, weatherData, 3600); // Cache for 1 hour
            res.json(weatherData);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch weather data' });
        }
    } else {
        res.json(weatherData);
    }
});

module.exports = router;

