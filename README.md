# WeatherAPI
![Tests](https://github.com/tuanhoang0117/WeatherAPI/actions/workflows/test.yml/badge.svg)

**Project URL:** https://roadmap.sh/projects/weather-api-wrapper-service

A backend API that acts as a proxy and cache in front of the [Visual Crossing](https://www.visualcrossing.com/weather-api) weather API. A client asks for the weather in a city; the server checks a Redis cache first, and only calls Visual Crossing when there's no fresh answer already cached.

## Features

- `GET /weather/:cityCode` — current weather for a city
- `GET /health` — basic liveness check
- Redis caching (cache-aside pattern) with a configurable TTL
- Rate limiting per IP (60 requests per 15 minutes on `/weather`)
- Structured error responses (`400`/`404`/`502`) instead of generic failures

## Prerequisites

- [Node.js](https://nodejs.org/)
- [Redis](https://redis.io/) running locally (or accessible via a connection URL)
- A free [Visual Crossing API key](https://www.visualcrossing.com/weather-api)

## Quick Start (Docker)

```
git clone git@github.com:tuanhoang0117/WeatherAPI.git
cd WeatherAPI
cp .env.example .env   # add your WEATHER_API_KEY
docker compose up --build
```

Starts the API on port 3000 and a Redis container. No local Redis install needed.

## Local Setup (without Docker)

1. Clone the repo and install dependencies:
   ```
   git clone git@github.com:tuanhoang0117/WeatherAPI.git
   cd WeatherAPI
   npm install
   ```

2. Copy the example environment file and fill in your own values:
   ```
   cp .env.example .env
   ```

   | Variable | Purpose |
   |---|---|
   | `WEATHER_API_KEY` | Your Visual Crossing API key |
   | `REDIS_URL` | Redis connection string (defaults to `redis://localhost:6379`) |
   | `PORT` | Port the server listens on (defaults to `3000`) |
   | `CACHE_TTL_SECONDS` | How long cached weather data stays valid, in seconds (defaults to `3600`; `.env.example` sets `43200`, i.e. 12 hours) |

3. Make sure Redis is running:
   ```
   redis-cli ping
   ```
   Should return `PONG`.

4. Start the server:
   ```
   npm start
   ```

## Usage

```
GET /health
GET /weather/:cityCode
```

`GET /health` returns `{ "status": "OK" }` with no parameters — used to confirm the server itself is running, independent of Redis or Visual Crossing.

**Example:**
```
curl http://localhost:3000/weather/Sacramento
```

**Success response — `200 OK`**
```json
{
  "city": "Sacramento, CA, United States",
  "temperature": 85.7,
  "unit": "F",
  "conditions": "Clear"
}
```

`city` is the full location name Visual Crossing resolves the city code to.

**Error responses**
- `400 Bad Request` — city code is blank (e.g. only whitespace)
- `404 Not Found` — city not recognized by Visual Crossing
- `429 Too Many Requests` — rate limit exceeded (60 requests per 15 minutes per IP)
- `502 Bad Gateway` — Visual Crossing is unreachable or erroring

These error responses share the same shape: `{ "error": "..." }`. Requesting `/weather/` with no city code at all doesn't match the route and gets Express's default `404` page instead.

## Testing

```
npm test
```

7 automated tests (Node's built-in test runner + Supertest) run on every push via GitHub Actions. Redis and Visual Crossing are mocked, so tests need no network or API key. They cover:
- Cache hit skips the upstream call; cache miss fetches and stores under a lowercase key
- Unknown city returns `404`; upstream failure returns `502`
- Redis outage still serves data from the provider
- 61st request in the rate-limit window returns `429`
- Health check

## Design Notes

- **Cache-aside:** the route checks Redis first and only calls Visual Crossing on a miss. Measured locally across 5 cities: median 138 ms uncached vs 1.6 ms cached.
- **Fail-open on Redis errors:** if Redis is down, the request still goes to the provider instead of failing. The cache is an optimization, not a dependency.
- **Case-insensitive cache keys:** `Oslo` and `OSLO` share one cache entry, so repeat requests aren't wasted on capitalization.
- **Error mapping:** Visual Crossing's `400` for an unknown location becomes a `404` for the client; any other upstream failure becomes `502`, so clients can tell "bad input" from "provider down."

## Tech Stack

- Node.js + Express
- [axios](https://axios-http.com/) — HTTP client for calling Visual Crossing
- [ioredis](https://github.com/redis/ioredis) — Redis client
- [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) — rate limiting middleware
- [dotenv](https://www.npmjs.com/package/dotenv) — environment variable loading
