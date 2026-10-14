const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const cache = require('../src/services/cache');
const weatherProvider = require('../src/services/weatherProvider');

const OSLO = { city: 'Oslo', temperature: 45.8, unit: 'F', conditions: 'Partially cloudy' };

function upstreamError(statusCode) {
  const err = new Error('upstream failed');
  err.statusCode = statusCode;
  return err;
}

beforeEach(() => {
  mock.method(console, 'error', () => {}); // keep test output clean
});

afterEach(() => {
  mock.restoreAll();
});

test('cache hit returns cached data without calling the weather provider', async () => {
  mock.method(cache, 'getCachedWeather', async () => OSLO);
  const provider = mock.method(weatherProvider, 'getWeatherForCity', async () => OSLO);

  const res = await request(app).get('/weather/Oslo');

  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, OSLO);
  assert.strictEqual(provider.mock.callCount(), 0);
});

test('cache miss fetches from provider and stores result under a lowercase key', async () => {
  mock.method(cache, 'getCachedWeather', async () => null);
  const setCache = mock.method(cache, 'setCachedWeather', async () => {});
  const provider = mock.method(weatherProvider, 'getWeatherForCity', async () => OSLO);

  const res = await request(app).get('/weather/OSLO');

  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, OSLO);
  assert.strictEqual(provider.mock.callCount(), 1);
  assert.strictEqual(setCache.mock.callCount(), 1);
  assert.strictEqual(setCache.mock.calls[0].arguments[0], 'oslo');
});

test('unknown city returns 404 with a clear error', async () => {
  mock.method(cache, 'getCachedWeather', async () => null);
  mock.method(weatherProvider, 'getWeatherForCity', async () => { throw upstreamError(404); });

  const res = await request(app).get('/weather/NotARealPlace');

  assert.strictEqual(res.status, 404);
  assert.deepStrictEqual(res.body, { error: 'City not found' });
});

test('upstream failure returns 502, not a generic 500', async () => {
  mock.method(cache, 'getCachedWeather', async () => null);
  mock.method(weatherProvider, 'getWeatherForCity', async () => { throw upstreamError(502); });

  const res = await request(app).get('/weather/Oslo');

  assert.strictEqual(res.status, 502);
  assert.deepStrictEqual(res.body, { error: 'Error fetching weather data' });
});

test('Redis outage on read still serves fresh data from the provider', async () => {
  mock.method(cache, 'getCachedWeather', async () => { throw new Error('Redis down'); });
  mock.method(cache, 'setCachedWeather', async () => { throw new Error('Redis down'); });
  mock.method(weatherProvider, 'getWeatherForCity', async () => OSLO);

  const res = await request(app).get('/weather/Oslo');

  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, OSLO);
});
