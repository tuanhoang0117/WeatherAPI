const { test, mock } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const cache = require('../src/services/cache');

test('61st request from one IP within the window returns 429', async () => {
  mock.method(cache, 'getCachedWeather', async () => ({ city: 'Oslo' }));

  for (let i = 0; i < 60; i++) {
    const ok = await request(app).get('/weather/Oslo');
    assert.strictEqual(ok.status, 200);
  }

  const blocked = await request(app).get('/weather/Oslo');
  assert.strictEqual(blocked.status, 429);
});
