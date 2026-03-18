export const EXPORT_SETTINGS = {
  FRAME_RATE: 16,
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
