const express = require("express");
const router = express.Router();
const weatherProvider = require("../services/weatherProvider");
const cache = require("../services/cache");
const { cacheTtlSeconds } = require("../config/env");

router.get("/:cityCode", async (req, res) => {
  const rawCityCode = req.params.cityCode.trim();

  if (!rawCityCode) {
    return res.status(400).json({ error: "City code is required" });
  }

  const cacheKey = rawCityCode.toLowerCase();

  let weatherData = null;

  try {
    weatherData = await getCachedWeather(cacheKey);
  } catch (error) {
    console.error("Error fetching cached weather data:", error);
  }

  if (!weatherData) {
    try {
      weatherData = await getWeatherForCity(rawCityCode);
      res.json(weatherData);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      const message =
        statusCode === 404 ? "City not found" : "Error fetching weather data";
      return res.status(statusCode).json({ error: message });
    }
    try {
      await setCachedWeather(cacheKey, weatherData, cacheTtlSeconds);
    } catch (error) {
      console.error("Error setting cached weather data:", error);
    }
  } else {
    res.json(weatherData);
  }
});

module.exports = router;
