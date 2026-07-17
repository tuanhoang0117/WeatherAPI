const axios = require('axios');
const { weatherApiKey } = require('../config/env');

async function getWeatherForCity(cityCode) {
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(cityCode)}?unitGroup=us&key=${weatherApiKey}&contentType=json`;

    try {
        const response = await axios.get(url, {timeout: 5000});

        if (!response.data || !response.data.currentConditions) {
            throw new Error(`Invalid response from weather API for city code ${cityCode}`);
        }
        
        return {
            city: response.data.resolvedAddress,
            temperature: response.data.currentConditions.temp,
            unit: "F",
            conditions: response.data.currentConditions.conditions,
        };
    } catch (error) {
        console.error(`Error fetching weather data for city code ${cityCode}:`, error.message);
        throw error;
    }

}

module.exports = { getWeatherForCity };

