// backend/src/cache/redisClient.js

require("dotenv").config();
const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
// redis://default@127.0.0.1:6379
const redisClient = createClient({ url: REDIS_URL });

redisClient.on("error", (err) => console.error("Redis error", err));

async function initRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

module.exports = { redisClient, initRedis };
