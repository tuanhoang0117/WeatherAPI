const express = require('express');
const router = express.Router();
const { getWeatherForCity } = require('../services/weatherProvider');
const { getCachedWeather, setCachedWeather } = require('../services/cache');
const { cacheTtlSeconds } = require('../config/env');

router.get('/:cityCode', async (req, res) => {
    const rawCityCode = req.params.cityCode.trim();
    const cacheKey = rawCityCode.toLowerCase();

    let weatherData = null;

    try{
        weatherData = await getCachedWeather(cacheKey);
    }catch(error){
        console.error('Error fetching cached weather data:', error);
    }

    if (!weatherData) {
        try {
            weatherData = await getWeatherForCity(rawCityCode);
            res.json(weatherData);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch weather data' });
        }
        try{
            await setCachedWeather(cacheKey, weatherData, cacheTtlSeconds);
        }catch(error){
            console.error('Error setting cached weather data:', error);
        }
    } else {
        res.json(weatherData);
    }

});

module.exports = router;

