import { getRedisClient, isRedisConfigured } from "@/lib/redis";

const DEFAULT_EXPORT_DAILY_LIMIT = 5;
const DEFAULT_EXPORT_QUOTA_TIMEZONE = "Asia/Taipei";
const EXPORT_QUOTA_TTL_SECONDS = 60 * 60 * 26;
const EXPORT_QUOTA_KEY_PREFIX = "video-export:quota";

const quotaDayFormatterCache = new Map<string, Intl.DateTimeFormat>();

type ExportQuotaStatus = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  quotaDate: string;
  timeZone: string;
};

function getQuotaDayFormatter(timeZone: string) {
  let formatter = quotaDayFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    quotaDayFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function getQuotaDateKey(now: Date, timeZone: string) {
  const parts = getQuotaDayFormatter(timeZone).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Failed to format quota date for time zone "${timeZone}".`);
  }

  return `${year}-${month}-${day}`;
}

function getConfiguredDailyLimit() {
  const rawLimit = process.env.EXPORT_DAILY_LIMIT?.trim();
  if (!rawLimit) {
    return DEFAULT_EXPORT_DAILY_LIMIT;
  }

  const parsedLimit = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsedLimit)) {
    throw new Error("EXPORT_DAILY_LIMIT must be an integer.");
  }

  return parsedLimit;
}

export function getExportQuotaConfig() {
  const limit = getConfiguredDailyLimit();
  const timeZone =
    process.env.EXPORT_QUOTA_TIMEZONE?.trim() || DEFAULT_EXPORT_QUOTA_TIMEZONE;

  return {
    enabled: limit > 0,
    isRedisConfigured: isRedisConfigured(),
    limit,
    timeZone,
  };
}

function getQuotaKey(ip: string, quotaDate: string) {
  return `${EXPORT_QUOTA_KEY_PREFIX}:${quotaDate}:${encodeURIComponent(ip)}`;
}

export async function consumeDailyExportQuota(
  ip: string,
  config?: ReturnType<typeof getExportQuotaConfig>,
): Promise<ExportQuotaStatus> {
  const { enabled, limit, timeZone } = config ?? getExportQuotaConfig();
  const quotaDate = getQuotaDateKey(new Date(), timeZone);

  if (!enabled) {
    return {
      allowed: true,
      limit,
      used: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      quotaDate,
      timeZone,
    };
  }

  const redis = getRedisClient();
  const key = getQuotaKey(ip, quotaDate);
  const result = (await redis.eval(
    `
      local current = tonumber(redis.call("GET", KEYS[1]) or "0")
      local limit = tonumber(ARGV[1])
      local ttl = tonumber(ARGV[2])

      if current >= limit then
        return {0, current}
      end

      current = redis.call("INCR", KEYS[1])
      if current == 1 then
        redis.call("EXPIRE", KEYS[1], ttl)
      end

      return {1, current}
    `,
    1,
    key,
    String(limit),
    String(EXPORT_QUOTA_TTL_SECONDS),
  )) as [number, number];

  const allowed = result[0] === 1;
  const used = result[1];
  return {
    allowed,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    quotaDate,
    timeZone,
  };
}

export async function releaseExportQuota(
  ip: string,
  quotaDate: string,
  config?: ReturnType<typeof getExportQuotaConfig>,
): Promise<void> {
  const { enabled } = config ?? getExportQuotaConfig();
  if (!enabled) {
    return;
  }

  const redis = getRedisClient();
  const key = getQuotaKey(ip, quotaDate);

  await redis.eval(
    `
      local current = tonumber(redis.call("GET", KEYS[1]) or "0")
      if current > 0 then
        redis.call("DECR", KEYS[1])
      end
    `,
    1,
    key,
  );
}
