/** Aligned with server export route; keep below typical sessionStorage limits. */
export const MAX_EXPORT_PAYLOAD_BYTES = 4 * 1024 * 1024;

export const EXPORT_PAYLOAD_STORAGE_KEY = "app-reveal-export-payload";

export const EXPORT_SETTINGS = {
  FRAME_RATE: 20,
  WIDTH: 1080,
  HEIGHT: 1920,
  BACKGROUND: "#010101",
  BITRATE: 8_000_000,
  WAIT_TIME_MS: 40,
  IMAGE_LOAD_TIMEOUT_MS: 5000,
  EXPORT_START_DELAY_MS: 120,
  CODEC: "avc1.42002A" as const,
  VIDEO_CODEC: "avc" as const,
  FAST_START: "in-memory" as const,
} as const;
