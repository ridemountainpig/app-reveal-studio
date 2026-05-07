import type { ChildProcess } from "node:child_process";

import { NextResponse } from "next/server";
import type { Browser } from "puppeteer";

import {
  EXPORT_PAYLOAD_STORAGE_KEY,
  MAX_EXPORT_PAYLOAD_BYTES,
  EXPORT_SETTINGS,
} from "@/constants/exportSettings";
import { logger, serializeError } from "@/lib/logger";
import {
  getClientIpFromRequest,
  verifyTurnstileToken,
} from "@/lib/verifyTurnstile";
import {
  consumeDailyExportQuota,
  getExportQuotaConfig,
  releaseExportQuota,
} from "@/lib/exportQuota";

export const runtime = "nodejs";

const ALLOWED_PARAMS = [
  "title",
  "subtitle",
  "ctaLabel",
  "badgeVariant",
  "badgePrefix",
  "iconUrl",
  "badgeIconUrl",
  "iconCornerRadius",
  "durationMs",
  "playbackRate",
  "glowColor",
  "glowSize",
  "rimColor",
  "grayColor",
  "layerTransforms",
] as const;

const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
const BROWSER_TIMEOUT = 480000; // 8 minutes
const BROWSER_LAUNCH_TIMEOUT = 60000; // 1 minute
const BROWSER_CLOSE_TIMEOUT = 10000; // 10 seconds
const BROWSER_IO_TIMEOUT = 120000; // 2 minutes
const PAGE_LOAD_TIMEOUT = 60000; // 1 minute
const MAX_CONCURRENT_EXPORTS = 1;
const BYTES_PER_MB = 1024 * 1024;
const PARALLEL_CAPTURE_SEGMENTS = (() => {
  const parsed = parseInt(process.env.PARALLEL_CAPTURE_SEGMENTS ?? "", 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : 3;
})();
const CAPTURE_BROWSER_CONCURRENCY = (() => {
  const parsed = parseInt(process.env.CAPTURE_BROWSER_CONCURRENCY ?? "", 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
})();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidClientId(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function msToSeconds(value: number) {
  return Number((value / 1000).toFixed(2));
}

function createAbortError() {
  return new Error("Export request aborted.");
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function buildSegments(
  frameTotal: number,
  count: number,
): { start: number; end: number }[] {
  const segSize = Math.ceil(frameTotal / count);
  const segments: { start: number; end: number }[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * segSize;
    const end = Math.min(start + segSize - 1, frameTotal - 1);
    if (start <= end) segments.push({ start, end });
  }
  return segments;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let activeExportCount = 0;
type QueueEntry = {
  clientId: string;
  grant: () => void;
  cleanup: () => void;
};
const exportQueue: QueueEntry[] = [];
const activeExportClientIds = new Set<string>();

async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer");
  const launchPromise = puppeteer.default.launch({
    headless: true,
    args: [
      "--disable-web-security",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--hide-scrollbars",
    ],
  });

  try {
    return await withTimeout(
      launchPromise,
      BROWSER_LAUNCH_TIMEOUT,
      "Browser launch timed out.",
    );
  } catch (err) {
    launchPromise.then((browser) => closeBrowser(browser)).catch(() => {});
    throw err;
  }
}

function getBrowserProcess(browser: Browser): ChildProcess | undefined {
  const maybeBrowserWithProcess = browser as Browser & {
    process?: () => ChildProcess | null;
  };
  return maybeBrowserWithProcess.process?.() ?? undefined;
}

async function closeBrowser(browser: Browser) {
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const closePromise = browser
    .close()
    .then(() => "closed" as const)
    .catch(() => "failed" as const);
  const closeTimeout = new Promise<"timeout">((resolve) => {
    closeTimer = setTimeout(() => resolve("timeout"), BROWSER_CLOSE_TIMEOUT);
  });

  try {
    const result = await Promise.race([closePromise, closeTimeout]);

    if (result !== "closed") {
      getBrowserProcess(browser)?.kill("SIGKILL");
    }
  } finally {
    if (closeTimer) clearTimeout(closeTimer);
  }
}

async function acquireExportSlot(clientId: string, signal?: AbortSignal) {
  throwIfAborted(signal);

  if (activeExportCount < MAX_CONCURRENT_EXPORTS) {
    activeExportCount += 1;
    activeExportClientIds.add(clientId);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let isResolved = false;

    const cleanup = () => {
      if (signal) signal.removeEventListener("abort", onAbort);
      const idx = exportQueue.indexOf(entry);
      if (idx !== -1) exportQueue.splice(idx, 1);
    };

    const onAbort = () => {
      if (isResolved) return;
      cleanup();
      reject(createAbortError());
    };

    const grant = () => {
      isResolved = true;
      cleanup();
      activeExportCount += 1;
      activeExportClientIds.add(clientId);
      resolve();
    };

    const entry: QueueEntry = { clientId, grant, cleanup };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
    exportQueue.push(entry);
  });
}

function releaseExportSlot(clientId: string) {
  activeExportClientIds.delete(clientId);
  activeExportCount = Math.max(0, activeExportCount - 1);
  const next = exportQueue.shift();
  if (next) next.grant();
}

function validateRequestBody(body: unknown): body is Record<string, unknown> {
  return !!body && typeof body === "object";
}

async function runCaptureSegment(
  renderBaseUrl: string,
  exportPayload: Record<string, string>,
  segment: { start: number; end: number },
  frameTotal: number,
  signal: AbortSignal,
  onPageError: (err: unknown) => void,
): Promise<string[]> {
  throwIfAborted(signal);
  const browser = await launchBrowser();
  const onAbort = () => void closeBrowser(browser).catch(() => {});
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    const page = await withTimeout(
      browser.newPage(),
      BROWSER_IO_TIMEOUT,
      "Browser page creation timed out.",
    );
    await page.setViewport({ width: 1080, height: 1920 });
    page.on("pageerror", onPageError);

    await withTimeout(
      page.evaluateOnNewDocument(
        ({ storageKey, payload }) => {
          window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
        },
        { storageKey: EXPORT_PAYLOAD_STORAGE_KEY, payload: exportPayload },
      ),
      BROWSER_IO_TIMEOUT,
      "Capture payload transfer timed out.",
    );

    const captureUrl =
      `${renderBaseUrl}?renderMode=captureSegment` +
      `&frameStart=${segment.start}&frameEnd=${segment.end}&frameTotal=${frameTotal}`;

    await page.goto(captureUrl, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_LOAD_TIMEOUT,
    });
    throwIfAborted(signal);

    await page.waitForFunction("window.__CAPTURE_DONE__ === true", {
      timeout: BROWSER_TIMEOUT,
    });
    throwIfAborted(signal);

    const errorMsg = await page.evaluate(
      () =>
        (window as unknown as { __CAPTURE_ERROR__?: string }).__CAPTURE_ERROR__,
    );
    if (errorMsg) throw new Error(errorMsg);

    const frames = await withTimeout(
      page.evaluate(
        () =>
          (window as unknown as { __CAPTURE_FRAMES__?: string[] })
            .__CAPTURE_FRAMES__,
      ),
      BROWSER_IO_TIMEOUT,
      "Capture frame transfer timed out.",
    );
    if (!frames?.length) throw new Error("Capture segment returned no frames.");
    await page
      .evaluate(() => {
        (
          window as unknown as { __CAPTURE_FRAMES__?: string[] }
        ).__CAPTURE_FRAMES__ = undefined;
      })
      .catch(() => {});

    return frames;
  } finally {
    signal.removeEventListener("abort", onAbort);
    await closeBrowser(browser).catch(() => {});
  }
}

async function runEncodeFrames(
  renderBaseUrl: string,
  allFrames: string[],
  signal: AbortSignal,
  onPageError: (err: unknown) => void,
): Promise<string> {
  throwIfAborted(signal);
  const browser = await launchBrowser();
  const onAbort = () => void closeBrowser(browser).catch(() => {});
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    const page = await withTimeout(
      browser.newPage(),
      BROWSER_IO_TIMEOUT,
      "Browser page creation timed out.",
    );
    await page.setViewport({ width: 1080, height: 1920 });
    page.on("pageerror", onPageError);

    await withTimeout(
      page.evaluateOnNewDocument(
        ({ frames }) => {
          (
            window as unknown as { __ENCODE_INPUT__: { frames: string[] } }
          ).__ENCODE_INPUT__ = { frames };
        },
        { frames: allFrames },
      ),
      BROWSER_IO_TIMEOUT,
      "Encode frame transfer timed out.",
    );

    await page.goto(`${renderBaseUrl}?renderMode=encodeFrames`, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_LOAD_TIMEOUT,
    });
    throwIfAborted(signal);

    await page.waitForFunction("window.__EXPORT_DONE__ === true", {
      timeout: BROWSER_TIMEOUT,
    });
    throwIfAborted(signal);

    const errorMsg = await page.evaluate(
      () =>
        (window as unknown as { __EXPORT_ERROR__?: string }).__EXPORT_ERROR__,
    );
    if (errorMsg) throw new Error(errorMsg);

    const videoBase64 = await withTimeout(
      page.evaluate(
        () =>
          (window as unknown as { __EXPORT_RESULT_BASE64__?: string })
            .__EXPORT_RESULT_BASE64__,
      ),
      BROWSER_IO_TIMEOUT,
      "Export result transfer timed out.",
    );
    if (!videoBase64) throw new Error("Export result missing.");
    await page
      .evaluate(() => {
        (
          window as unknown as {
            __ENCODE_INPUT__?: { frames: string[] };
            __EXPORT_RESULT_BASE64__?: string;
          }
        ).__ENCODE_INPUT__ = undefined;
        (
          window as unknown as {
            __ENCODE_INPUT__?: { frames: string[] };
            __EXPORT_RESULT_BASE64__?: string;
          }
        ).__EXPORT_RESULT_BASE64__ = undefined;
      })
      .catch(() => {});

    return videoBase64;
  } finally {
    signal.removeEventListener("abort", onAbort);
    await closeBrowser(browser).catch(() => {});
  }
}

async function runCaptureSegments(
  renderBaseUrl: string,
  exportPayload: Record<string, string>,
  segments: { start: number; end: number }[],
  frameTotal: number,
  controller: AbortController,
  onPageError: (err: unknown) => void,
): Promise<string[]> {
  const signal = controller.signal;
  const frameArrays: string[][] = new Array(segments.length);
  let nextSegmentIndex = 0;
  const workerCount = Math.min(CAPTURE_BROWSER_CONCURRENCY, segments.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (!signal.aborted) {
      const segmentIndex = nextSegmentIndex;
      nextSegmentIndex += 1;

      const segment = segments[segmentIndex];
      if (!segment) return;

      try {
        frameArrays[segmentIndex] = await runCaptureSegment(
          renderBaseUrl,
          exportPayload,
          segment,
          frameTotal,
          signal,
          onPageError,
        );
      } catch (err) {
        controller.abort();
        throw err;
      }
    }
  });

  const results = await Promise.allSettled(workers);
  const failedCapture = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failedCapture) {
    throw failedCapture.reason;
  }

  return frameArrays.flat();
}

export async function GET(request: Request) {
  const clientId = new URL(request.url).searchParams.get("clientId");
  if (!clientId || !isValidClientId(clientId)) {
    return NextResponse.json(
      { error: "Invalid or missing clientId" },
      { status: 400 },
    );
  }

  const queueIndex = exportQueue.findIndex((e) => e.clientId === clientId);
  let phase: "queued" | "active" | "unknown";
  let ahead: number | undefined;

  if (queueIndex !== -1) {
    phase = "queued";
    ahead = queueIndex;
  } else if (activeExportClientIds.has(clientId)) {
    phase = "active";
  } else {
    phase = "unknown";
  }

  return NextResponse.json({
    maxConcurrent: MAX_CONCURRENT_EXPORTS,
    active: activeExportCount,
    waitingTotal: exportQueue.length,
    phase,
    ...(ahead !== undefined ? { ahead } : {}),
  });
}

export async function POST(request: Request) {
  let hasSlot = false;
  let clientIdForSlot: string | undefined;
  let slotAcquiredAt: number | undefined;
  let queueWaitSeconds: number | undefined;
  let quotaConsumedIp: string | undefined;
  let quotaConsumedDate: string | undefined;
  const quotaConfig = getExportQuotaConfig();
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const routeLogger = logger.child({ scope: "video-export", requestId });

  try {
    const contentLength = request.headers.get("content-length");

    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );
    }

    const body = await request.json();

    if (!validateRequestBody(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    if (!isValidClientId(body.clientId)) {
      return NextResponse.json(
        { error: "Invalid or missing clientId" },
        { status: 400 },
      );
    }
    clientIdForSlot = body.clientId;
    const clientIp = getClientIpFromRequest(request);

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      const token =
        typeof body.turnstileToken === "string"
          ? body.turnstileToken.trim()
          : "";
      if (!token) {
        return NextResponse.json(
          { error: "Verification required." },
          { status: 403 },
        );
      }
      const ok = await verifyTurnstileToken({
        secret: turnstileSecret,
        token,
        ip: clientIp,
      });
      if (!ok) {
        return NextResponse.json(
          { error: "Verification failed." },
          { status: 403 },
        );
      }
    }

    const exportPayload: Record<string, string> = {};
    for (const key of ALLOWED_PARAMS) {
      const value = body[key];
      if (typeof value === "string" && value.length > 0) {
        exportPayload[key] = value;
      }
    }

    const exportPayloadBytes = new TextEncoder().encode(
      JSON.stringify(exportPayload),
    ).length;

    if (exportPayloadBytes > MAX_EXPORT_PAYLOAD_BYTES) {
      return NextResponse.json(
        {
          error:
            "Images are too large to export. Use smaller files or lower-resolution icons.",
        },
        { status: 413 },
      );
    }

    if (quotaConfig.enabled && !quotaConfig.isRedisConfigured) {
      routeLogger.error({
        event: "quota.misconfigured",
        limit: quotaConfig.limit,
      });
      return NextResponse.json(
        { error: "Export quota is unavailable. Please try again later." },
        { status: 503 },
      );
    }

    if (quotaConfig.enabled) {
      if (!clientIp) {
        routeLogger.warn({ event: "quota.missing_ip" });
        return NextResponse.json(
          { error: "Unable to determine client IP for export quota." },
          { status: 400 },
        );
      }

      const quotaStatus = await consumeDailyExportQuota(clientIp, quotaConfig);
      if (!quotaStatus.allowed) {
        routeLogger.warn({
          event: "quota.blocked",
          clientIp,
          used: quotaStatus.used,
          limit: quotaStatus.limit,
          quotaDate: quotaStatus.quotaDate,
          timeZone: quotaStatus.timeZone,
        });
        return NextResponse.json(
          {
            error: `Daily export limit reached for this IP. You can export up to ${quotaStatus.limit} times per day.`,
            limit: quotaStatus.limit,
            used: quotaStatus.used,
            remaining: quotaStatus.remaining,
            quotaDate: quotaStatus.quotaDate,
            timeZone: quotaStatus.timeZone,
          },
          { status: 429 },
        );
      }

      quotaConsumedIp = clientIp;
      quotaConsumedDate = quotaStatus.quotaDate;
      routeLogger.info({
        event: "quota.allowed",
        clientIp,
        used: quotaStatus.used,
        remaining: quotaStatus.remaining,
        limit: quotaStatus.limit,
        quotaDate: quotaStatus.quotaDate,
        timeZone: quotaStatus.timeZone,
      });
    }

    const renderBaseUrl = (() => {
      if (process.env.NEXT_PUBLIC_APP_URL) {
        return `${process.env.NEXT_PUBLIC_APP_URL}/render`;
      }
      if (process.env.NODE_ENV !== "development") {
        throw new Error(
          "NEXT_PUBLIC_APP_URL must be set in non-development environments.",
        );
      }
      return "http://localhost:3000/render";
    })();

    const durationMs = Number(exportPayload.durationMs || "0") || 3000;
    const frameTotal = Math.max(
      1,
      Math.ceil((durationMs / 1000) * EXPORT_SETTINGS.FRAME_RATE),
    );
    const segments = buildSegments(frameTotal, PARALLEL_CAPTURE_SEGMENTS);

    routeLogger.info({
      event: "render.started",
      durationSeconds: msToSeconds(durationMs),
      frameTotal,
      segments: segments.length,
      captureConcurrency: Math.min(
        CAPTURE_BROWSER_CONCURRENCY,
        segments.length,
      ),
    });

    const beforeSlotAcquire = Date.now();
    await acquireExportSlot(clientIdForSlot, request.signal);
    slotAcquiredAt = Date.now();
    queueWaitSeconds = msToSeconds(slotAcquiredAt - beforeSlotAcquire);
    hasSlot = true;

    throwIfAborted(request.signal);

    // Phase 1: segmented capture. Each segment uses its own browser process.
    const captureStartedAt = Date.now();
    const segmentController = new AbortController();
    const onRequestAbort = () => segmentController.abort();
    request.signal.addEventListener("abort", onRequestAbort, { once: true });

    let allFrames: string[] = [];
    try {
      allFrames = await runCaptureSegments(
        renderBaseUrl,
        exportPayload,
        segments,
        frameTotal,
        segmentController,
        (err) =>
          routeLogger.error({
            event: "render.pageerror",
            phase: "capture",
            error: serializeError(
              err instanceof Error ? err : new Error(String(err)),
            ),
          }),
      );
    } catch (err) {
      segmentController.abort();
      throw err;
    } finally {
      request.signal.removeEventListener("abort", onRequestAbort);
    }

    if (!allFrames.length) {
      throw new Error("Capture returned no frames.");
    }

    routeLogger.info({
      event: "render.capture_done",
      captureSeconds: msToSeconds(Date.now() - captureStartedAt),
      totalFrames: allFrames.length,
    });

    throwIfAborted(request.signal);

    // Phase 2: encode — runEncodeFrames manages its own browser lifecycle
    const encodeStartedAt = Date.now();
    const videoBase64 = await runEncodeFrames(
      renderBaseUrl,
      allFrames,
      request.signal,
      (err) =>
        routeLogger.error({
          event: "render.pageerror",
          phase: "encode",
          error: serializeError(
            err instanceof Error ? err : new Error(String(err)),
          ),
        }),
    );
    allFrames.length = 0;

    routeLogger.info({
      event: "render.encode_done",
      encodeSeconds: msToSeconds(Date.now() - encodeStartedAt),
    });

    const videoBuffer = Buffer.from(videoBase64, "base64");
    const now = Date.now();
    routeLogger.info({
      event: "render.completed",
      sizeMb: Number((videoBuffer.length / BYTES_PER_MB).toFixed(2)),
      elapsedSeconds: msToSeconds(now - startedAt),
      queueWaitSeconds: queueWaitSeconds ?? 0,
      renderSeconds: msToSeconds(now - slotAcquiredAt!),
    });

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="app-reveal.mp4"',
        "Content-Length": String(videoBuffer.length),
        "X-Export-Request-Id": requestId,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    const now = Date.now();
    const wasAborted =
      request.signal.aborted || message === "Export request aborted.";

    let statusCode = 500;
    let errorMessage = message;

    if (wasAborted) {
      statusCode = 499;
      errorMessage = "Export request cancelled.";
    } else if (message.includes("Timeout") || message.includes("timed out")) {
      statusCode = 504;
      errorMessage =
        "Video generation timed out. Please try with shorter duration.";
    } else if (message.includes("Navigation")) {
      statusCode = 502;
      errorMessage = "Failed to load render page. Please try again.";
    }

    if (statusCode === 499) {
      if (quotaConsumedIp) {
        await releaseExportQuota(
          quotaConsumedIp,
          quotaConsumedDate!,
          quotaConfig,
        ).catch((err) => {
          routeLogger.warn({
            event: "quota.release_failed",
            error: serializeError(err),
          });
        });
        quotaConsumedIp = undefined;
      }

      routeLogger.info({
        event: "render.cancelled",
        phase: hasSlot ? "active" : "queued",
        elapsedSeconds: msToSeconds(now - startedAt),
        ...(queueWaitSeconds !== undefined ? { queueWaitSeconds } : {}),
        ...(slotAcquiredAt !== undefined
          ? { renderSeconds: msToSeconds(now - slotAcquiredAt) }
          : {}),
      });

      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    if (quotaConsumedIp) {
      await releaseExportQuota(
        quotaConsumedIp,
        quotaConsumedDate!,
        quotaConfig,
      ).catch((err) => {
        routeLogger.warn({
          event: "quota.release_failed",
          error: serializeError(err),
        });
      });
      quotaConsumedIp = undefined;
    }

    routeLogger.error({
      event: "render.failed",
      statusCode,
      errorMessage,
      elapsedSeconds: msToSeconds(now - startedAt),
      ...(queueWaitSeconds !== undefined ? { queueWaitSeconds } : {}),
      ...(slotAcquiredAt !== undefined
        ? { renderSeconds: msToSeconds(now - slotAcquiredAt) }
        : {}),
      error: serializeError(error),
    });

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  } finally {
    if (hasSlot && clientIdForSlot) {
      releaseExportSlot(clientIdForSlot);
    }
  }
}
