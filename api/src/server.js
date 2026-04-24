const express = require('express');
const os = require('os');
const { createClient } = require('redis');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 4000);

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const redisClient = createClient({ url: redisUrl });

const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'demo_app',
  user: process.env.POSTGRES_USER || 'demo_user',
  password: process.env.POSTGRES_PASSWORD || 'demo_password'
});

const trackedEnvKeys = [
  'APP_NAME',
  'APP_ENV',
  'DEMO_MESSAGE',
  'FEATURE_FLAG_BETA',
  'THEME_COLOR',
  'API_VERSION'
];

function normalizeEnvValue(rawValue) {
  if (rawValue == null) {
    return null;
  }

  const value = String(rawValue).trim();
  const envReferenceMatch = value.match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)(?:(:?[-?])([^}]*))?\}$/);

  if (!envReferenceMatch) {
    return value;
  }

  const [, , modifier, fallbackValue = ''] = envReferenceMatch;

  if (modifier === ':-' || modifier === '-' || modifier === ':?' || modifier === '?') {
    return fallbackValue;
  }

  return value;
}

redisClient.on('error', (error) => {
  console.error('Redis error:', error.message);
});

pgPool.on('error', (error) => {
  console.error('Postgres pool error:', error.message);
});

async function ensureRedisConnection() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

async function checkRedis() {
  try {
    await ensureRedisConnection();
    const pong = await redisClient.ping();
    return { ok: pong === 'PONG', detail: pong };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkPostgres() {
  try {
    const result = await pgPool.query('SELECT NOW() AS server_time');
    return {
      ok: true,
      detail: result.rows[0].server_time
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

app.get('/health', async (_req, res) => {
  const [redis, postgres] = await Promise.all([checkRedis(), checkPostgres()]);

  const healthy = redis.ok && postgres.ok;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    services: { redis, postgres }
  });
});

app.get('/env', async (_req, res) => {
  const env = {};
  trackedEnvKeys.forEach((key) => {
    env[key] = normalizeEnvValue(process.env[key]);
  });

  const [redis, postgres] = await Promise.all([checkRedis(), checkPostgres()]);

  res.json({
    generatedAt: new Date().toISOString(),
    hostname: os.hostname(),
    env,
    services: { redis, postgres }
  });
});

const server = app.listen(port, () => {
  console.log(`API running on port ${port}`);
});

async function shutdown() {
  console.log('Shutting down API service...');
  server.close();
  await Promise.allSettled([
    redisClient.isOpen ? redisClient.disconnect() : Promise.resolve(),
    pgPool.end()
  ]);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
