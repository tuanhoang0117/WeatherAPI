# Weather API — Project Doc

## Overview

A backend project where instead of owning our own weather data, we build an API that
acts as a **proxy + cache** in front of a 3rd-party weather API. A client asks our
API for the weather in a city; we check our cache first, and only call the 3rd-party
API when we don't have a fresh answer already.

**What this teaches:** working with a 3rd-party API, caching (Redis), environment
variables, error handling, and basic API hygiene (rate limiting).

## Tech Stack

- **Runtime:** Node.js + Express
- **HTTP client:** [axios](https://axios-http.com/) — for calling the 3rd-party weather API
- **Cache:** [Redis](https://redis.io/docs/latest/develop/get-started/) — via `ioredis` or `node-redis`
- **Rate limiting:** [express-rate-limit](https://www.npmjs.com/package/express-rate-limit)
- **Config:** [dotenv](https://www.npmjs.com/package/dotenv) for loading environment variables
- **3rd-party weather API:** [Visual Crossing Weather API](https://www.visualcrossing.com/weather-api) (free tier, easy to use) — or any weather API you prefer

## Architecture

```
Client
  │
  ▼
Express API  ──►  Redis cache (check for key = city code)
  │                     │
  │              hit ───┘──► return cached JSON
  │
  │ miss
  ▼
Visual Crossing API (or chosen 3rd-party API)
  │
  ▼
Store result in Redis (SET key value EX <seconds>)
  │
  ▼
Return JSON to client
```

## Environment Variables

Store secrets/config in a `.env` file (never commit this — add it to `.gitignore`).

| Variable | Purpose |
|---|---|
| `WEATHER_API_KEY` | API key for the 3rd-party weather provider |
| `REDIS_URL` | Redis connection string (e.g. `redis://localhost:6379`) |
| `PORT` | Port the Express server listens on |
| `CACHE_TTL_SECONDS` | How long cached weather data stays valid (e.g. `43200` = 12 hours) |

Provide a `.env.example` with the same keys and dummy/blank values so the repo is
self-documenting for anyone (including future-you) who clones it.

## API Design

### `GET /weather/:cityCode`

Returns the current weather for a given city code.

**Success response — `200 OK`**
```json
{
  "city": "Toronto",
  "temperature": 21.5,
  "conditions": "Partly Cloudy",
  "cached": true
}
```
(The `cached` field is optional but a nice touch — it lets you see in Postman/browser
whether you hit Redis or made a real API call, which is great for debugging while
you build.)

**Error responses**
- `400 Bad Request` — invalid/missing city code
- `404 Not Found` — city not recognized by the weather provider
- `502 Bad Gateway` — the 3rd-party API is down or returned an error
- `429 Too Many Requests` — rate limit exceeded (from `express-rate-limit`)

## Caching Strategy

- **Key:** the city code entered by the user (normalize it — e.g. lowercase/trim —
  so `"Toronto"` and `"toronto"` hit the same cache entry).
- **Value:** the JSON response we'd otherwise send to the client.
- **Expiration:** set with the `EX` flag on `SET` (e.g. 12 hours / `43200` seconds).
  This means the cache self-cleans — no manual eviction logic needed.

Flow on every request:
1. Normalize the city code.
2. `GET` the key from Redis.
3. If found → return it directly (fast path, no external API call).
4. If not found → call the 3rd-party weather API, `SET` the result in Redis with
   `EX <CACHE_TTL_SECONDS>`, then return it to the client.

## Error Handling

- Wrap the 3rd-party API call in a try/catch. If it throws or times out, return a
  `502` with a clear JSON error body — don't leak stack traces to the client.
- Validate the city code param before doing any work (reject empty/malformed input
  early with a `400`).
- If Redis itself is unreachable, **don't crash the whole request** — log the error
  and fall back to calling the 3rd-party API directly (cache becomes "best effort",
  not a hard dependency).
- Use a consistent error JSON shape across the app, e.g.:
  ```json
  { "error": "City code not found" }
  ```

## Rate Limiting

Use `express-rate-limit` as middleware on the `/weather` routes to cap requests per
IP over a time window (e.g. 60 requests / 15 minutes). This protects both your app
and your 3rd-party API quota from abuse.

## Suggested Project Structure

```
weather-api/
├── src/
│   ├── server.js          # Express app entry point
│   ├── routes/
│   │   └── weather.js      # GET /weather/:cityCode route
│   ├── services/
│   │   ├── weatherProvider.js  # axios calls to Visual Crossing
│   │   └── cache.js            # Redis get/set helpers
│   ├── middleware/
│   │   └── rateLimiter.js
│   └── config/
│       └── env.js          # loads/validates env vars
├── .env.example
├── .gitignore
├── package.json
└── projdoc.md
```

## Build Plan / Milestones

1. **Hardcoded response** — Stand up an Express server with a `GET /weather/:cityCode`
   route that returns a fixed, fake JSON payload. Confirms routing works.
2. **Real 3rd-party call** — Swap the hardcoded data for a real `axios` call to
   Visual Crossing, using `WEATHER_API_KEY` from `.env`. No cache yet.
3. **Add Redis caching** — Check cache before calling the API; `SET ... EX` after
   a successful call.
4. **Error handling pass** — Invalid city codes, provider downtime, Redis downtime.
5. **Rate limiting** — Add `express-rate-limit` middleware.
6. **Polish** — README with setup instructions, `.env.example`, maybe a `/health`
   endpoint.

## Tips (from original brief)

- Start with a hardcoded response before wiring up the real API — get the shape of
  the app right first.
- Keep API keys and connection strings in environment variables, never hardcoded.
- Handle 3rd-party downtime and invalid input explicitly — don't let either crash
  the server or return a confusing error.
- Use `axios` for HTTP calls to the weather provider.
- Add rate limiting (`express-rate-limit`) to prevent abuse.

## roadmap.sh Coverage Map

This project is a good match for a slice of the [roadmap.sh Backend
roadmap](https://roadmap.sh/backend). Tracking which nodes it touches helps
gauge what to tackle next in future projects.

| roadmap.sh node | Covered by this project? | Where |
|---|---|---|
| Pick a Language → JavaScript | ✅ Yes | Node.js + Express stack |
| Version Control Systems → Git | ✅ Yes (assuming repo is git-initialized) | Project repo |
| Learn about APIs → REST, JSON APIs | ✅ Yes | `GET /weather/:cityCode` endpoint |
| Caching → Server Side (Redis) | ✅ Yes | Redis cache-aside strategy w/ `EX` TTL |
| Web Security → API Security Best Practices | ✅ Partial | Env vars for secrets, no secrets in code |
| Testing → Unit/Integration Testing | ⬜ Not yet | Could add tests as a stretch goal |
| Web Servers | ⬜ Touched, not deep | Express dev server only, no Nginx/reverse proxy |
| Authentication (JWT/OAuth/etc.) | ⬜ Not covered | No user accounts in this project — good candidate for a future project |
| Relational/NoSQL Databases | ⬜ Not covered | This project only uses Redis as a cache, not a system of record |
| Message Brokers (RabbitMQ/Kafka) | ⬜ Not covered | Good candidate for a future async/queue-based project |
| CI/CD | ⬜ Not yet | Could add a simple GitHub Actions workflow as a stretch goal |
| Containerization (Docker) | ⬜ Not yet | Dockerizing the app + Redis via `docker-compose` would be a natural stretch goal |
| Rate Limiting / Throttling | ✅ Yes | `express-rate-limit` middleware |

**Not-yet-covered nodes worth targeting in a follow-up project:** Authentication
(JWT), a real database (Postgres/Mongo), Docker/Kubernetes, CI/CD, and message
brokers. Each of those is small enough to bolt onto a future weekend project.

---

## Appendix: Original Project Brief (verbatim)

> Hi, I'm a beginner programmer looking to rack up some projects specifically for
> backend practice, I created a project doc for you to write in here is the details
> of the project I want to build.
>
> In this project, instead of relying on our own weather data, we will build a
> weather API that fetches and returns weather data from a 3rd party API. This
> project will help you understand how to work with 3rd party APIs, caching, and
> environment variables.
>
> As for the actual weather API to use, you can use your favorite one, as a
> suggestion, here is a link to Visual Crossing's API, it's completely FREE and
> easy to use.
>
> Regarding the in-memory cache, a pretty common recommendation is to use Redis,
> you can read more about it here, and as a recommendation, you could use the city
> code entered by the user as the key, and save there the result from calling the
> API.
>
> At the same time, when you "set" the value in the cache, you can also give it an
> expiration time in seconds (using the EX flag on the SET command). That way the
> cache (the keys) will automatically clean itself when the data is old enough (for
> example, giving it a 12-hours expiration time).
>
> **Some Tips**
>
> Here are some tips to help you get started:
>
> - Start by creating a simple API that returns a hardcoded weather response. This
>   will help you understand how to structure your API and how to handle requests.
> - Use environment variables to store the API key and the Redis connection string.
>   This way, you can easily change them without having to modify your code.
> - Make sure to handle errors properly. If the 3rd party API is down, or if the
>   city code is invalid, make sure to return the appropriate error message.
> - Use some package or module to make HTTP requests e.g. if you are using
>   Node.js, you can use the axios package, if you are using Python, you can use
>   the requests module.
> - Implement rate limiting to prevent abuse of your API. You can use a package
>   like express-rate-limit if you are using Node.js or flask-limiter if you are
>   using Python.
>
> This project will help you understand how to work with 3rd party APIs, caching,
> and environment variables. It will also help you understand how to structure
> your API and how to handle requests.
