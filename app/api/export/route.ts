import { NextResponse } from "next/server";
import type { Browser, Page } from "puppeteer";

import {
  EXPORT_PAYLOAD_STORAGE_KEY,
  EXPORT_SETTINGS,
  MAX_EXPORT_PAYLOAD_BYTES,
} from "@/constants/exportSettings";
import { FfmpegEncoder } from "@/lib/ffmpegEncoder";
import { logger, serializeError } from "@/lib/logger";
import {
  getClientIpFromRequest,
  verifyTurnstileToken,
} from "@/lib/verifyTurnstile";

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
const RENDER_TIMEOUT = 480000; // 8 minutes
const PAGE_LOAD_TIMEOUT = 60000; // 1 minute
const EXPORT_READY_TIMEOUT = 30000; // 30 seconds for scene bootstrap
const MAX_CONCURRENT_EXPORTS = 1;
const BYTES_PER_MB = 1024 * 1024;

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

let browserPromise: Promise<Awaited<ReturnType<typeof getBrowser>>> | null =
  null;
let idlePage: Page | null = null;
let activeExportCount = 0;
type QueueEntry = {
  clientId: string;
  grant: () => void;
  cleanup: () => void;
};
const exportQueue: QueueEntry[] = [];
const activeExportClientIds = new Set<string>();

async function getBrowser() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: [
      "--disable-web-security",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--font-render-hinting=none",
    ],
  });
}

async function getSharedBrowser() {
  if (!browserPromise) {
    browserPromise = getBrowser()
      .then((browser) => {
        browser.on("disconnected", () => {
          browserPromise = null;
          idlePage = null;
        });
        return browser;
      })
      .catch((error) => {
        browserPromise = null;
        throw error;
      });
  }

  return browserPromise;
}

async function getOrCreatePage(
  browser: Awaited<ReturnType<typeof getBrowser>>,
): Promise<Page> {
  if (idlePage) {
    const p = idlePage;
    idlePage = null;
    return p;
  }
  const p = await browser.newPage();
  await p.setViewport({
    width: EXPORT_SETTINGS.WIDTH,
    height: EXPORT_SETTINGS.HEIGHT,
    deviceScaleFactor: 1,
  });
  return p;
}

async function recyclePage(page: Page): Promise<void> {
  try {
    await page.goto("about:blank", { waitUntil: "load", timeout: 5000 });
    idlePage = page;
  } catch {
    idlePage = null;
    await page.close().catch(() => {});
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
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }

      const queueIndex = exportQueue.indexOf(entry);
      if (queueIndex !== -1) {
        exportQueue.splice(queueIndex, 1);
      }
    };

    const onAbort = () => {
      if (isResolved) {
        return;
      }

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

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    exportQueue.push(entry);
  });
}

function releaseExportSlot(clientId: string) {
  activeExportClientIds.delete(clientId);
  activeExportCount = Math.max(0, activeExportCount - 1);
  const nextExport = exportQueue.shift();
  if (nextExport) {
    nextExport.grant();
  }
}

function validateRequestBody(body: unknown): body is Record<string, unknown> {
  if (!body || typeof body !== "object") {
    return false;
  }
  return true;
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
  let browser: Browser | undefined;
  let page: Page | undefined;
  let encoder: FfmpegEncoder | undefined;
  let hasSlot = false;
  let clientIdForSlot: string | undefined;
  let slotAcquiredAt: number | undefined;
  let queueWaitSeconds: number | undefined;
  let removeAbortListener: (() => void) | undefined;
  let evalScriptId: string | undefined;
  let pageWasClosed = false;
  let exportSucceeded = false;
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const routeLogger = logger.child({
    scope: "video-export",
    requestId,
  });

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
      const ip = getClientIpFromRequest(request);
      const ok = await verifyTurnstileToken({
        secret: turnstileSecret,
        token,
        ip,
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

    const durationMs = Number(exportPayload.durationMs);
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return NextResponse.json({ error: "Invalid duration." }, { status: 400 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (() => {
        const host =
          request.headers.get("x-forwarded-host") ??
          request.headers.get("host") ??
          "localhost:3000";
        const protocol = request.headers.get("x-forwarded-proto") ?? "http";
        return `${protocol}://${host}`;
      })();
    const renderUrl = `${baseUrl}/render?renderMode=export`;
    routeLogger.info({
      event: "render.started",
      durationSeconds: msToSeconds(durationMs),
    });

    const beforeSlotAcquire = Date.now();
    await acquireExportSlot(clientIdForSlot, request.signal);
    slotAcquiredAt = Date.now();
    queueWaitSeconds = msToSeconds(slotAcquiredAt - beforeSlotAcquire);
    hasSlot = true;

    const onAbort = () => {
      pageWasClosed = true;
      void page?.close().catch(() => {});
      void encoder?.dispose();
    };
    request.signal.addEventListener("abort", onAbort, { once: true });
    removeAbortListener = () => {
      request.signal.removeEventListener("abort", onAbort);
    };
    throwIfAborted(request.signal);

    browser = await getSharedBrowser();
    throwIfAborted(request.signal);
    page = await getOrCreatePage(browser);
    throwIfAborted(request.signal);
    const onPageError = (error: unknown) => {
      routeLogger.error({
        event: "render.pageerror",
        error: serializeError(error),
      });
    };
    page.on("pageerror", onPageError);

    const { identifier } = await page.evaluateOnNewDocument(
      ({ storageKey, payload }) => {
        window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
      },
      { storageKey: EXPORT_PAYLOAD_STORAGE_KEY, payload: exportPayload },
    );
    evalScriptId = identifier;

    await page.goto(renderUrl, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_LOAD_TIMEOUT,
    });
    throwIfAborted(request.signal);

    await page.waitForFunction("window.__EXPORT_READY__ === true", {
      timeout: EXPORT_READY_TIMEOUT,
    });
    throwIfAborted(request.signal);

    const setupError = await page.evaluate(
      () => window.__EXPORT_ERROR__ ?? null,
    );
    if (setupError) {
      const now = Date.now();
      routeLogger.error({
        event: "render.failed.in_page",
        errorMessage: setupError,
        elapsedSeconds: msToSeconds(now - startedAt),
        ...(queueWaitSeconds !== undefined ? { queueWaitSeconds } : {}),
        ...(slotAcquiredAt !== undefined
          ? { renderSeconds: msToSeconds(now - slotAcquiredAt) }
          : {}),
      });
      return NextResponse.json({ error: setupError }, { status: 500 });
    }

    const frameTotal = Math.max(
      1,
      Math.ceil((durationMs / 1000) * EXPORT_SETTINGS.FRAME_RATE),
    );
    const clip = {
      x: 0,
      y: 0,
      width: EXPORT_SETTINGS.WIDTH,
      height: EXPORT_SETTINGS.HEIGHT,
    };

    encoder = await FfmpegEncoder.create({
      frameRate: EXPORT_SETTINGS.FRAME_RATE,
      bitrate: EXPORT_SETTINGS.BITRATE,
    });

    const renderDeadline = slotAcquiredAt + RENDER_TIMEOUT;

    for (let i = 0; i < frameTotal; i++) {
      if (Date.now() > renderDeadline) {
        throw new Error("Render timed out.");
      }
      throwIfAborted(request.signal);

      const progress = frameTotal === 1 ? 1 : i / (frameTotal - 1);

      await page.evaluate(
        (p) =>
          window.__setTimelineProgress
            ? window.__setTimelineProgress(p)
            : undefined,
        progress,
      );

      const screenshot = (await page.screenshot({
        type: "jpeg",
        quality: 92,
        clip,
        omitBackground: false,
        captureBeyondViewport: false,
        optimizeForSpeed: true,
      })) as Uint8Array;

      await encoder.writeFrame(Buffer.from(screenshot));
    }

    const videoBuffer = await encoder.finish();
    encoder = undefined;

    const now = Date.now();
    routeLogger.info({
      event: "render.completed",
      sizeMb: Number((videoBuffer.length / BYTES_PER_MB).toFixed(2)),
      elapsedSeconds: msToSeconds(now - startedAt),
      queueWaitSeconds: queueWaitSeconds ?? 0,
      renderSeconds: msToSeconds(now - slotAcquiredAt!),
      frameCount: frameTotal,
    });

    exportSucceeded = true;
    const videoBlob = new Blob([new Uint8Array(videoBuffer)], {
      type: "video/mp4",
    });
    return new NextResponse(videoBlob, {
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
    } else if (/timed out/i.test(message)) {
      statusCode = 504;
      errorMessage =
        "Video generation timed out. Please try with shorter duration.";
    } else if (message.includes("Navigation")) {
      statusCode = 502;
      errorMessage = "Failed to load render page. Please try again.";
    }

    if (statusCode === 499) {
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
    removeAbortListener?.();
    if (encoder) {
      await encoder.dispose().catch(() => {});
    }
    if (page && !pageWasClosed) {
      if (exportSucceeded) {
        page.off("pageerror");
        if (evalScriptId) {
          await page
            .removeScriptToEvaluateOnNewDocument(evalScriptId)
            .catch(() => {});
        }
        void recyclePage(page);
      } else {
        await page.close().catch(() => {});
      }
    }
    if (hasSlot && clientIdForSlot) {
      releaseExportSlot(clientIdForSlot);
    }
  }
}
