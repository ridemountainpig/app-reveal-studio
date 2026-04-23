import Redis from "ioredis";

import { logger, serializeError } from "@/lib/logger";

type RedisGlobal = {
  _redisClient?: Redis;
  _redisHasLoggedError?: boolean;
};

const g = globalThis as unknown as RedisGlobal;

export function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL?.trim());
}

export function getRedisClient() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured.");
  }

  if (!g._redisClient) {
    g._redisHasLoggedError = false;
    g._redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    g._redisClient.on("error", (error) => {
      if (g._redisHasLoggedError) {
        return;
      }

      g._redisHasLoggedError = true;
      logger.error({
        scope: "redis",
        event: "redis.error",
        error: serializeError(error),
      });
    });

    g._redisClient.on("ready", () => {
      g._redisHasLoggedError = false;
    });
  }

  return g._redisClient!;
}
