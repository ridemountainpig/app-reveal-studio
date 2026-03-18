import { NextResponse } from "next/server";

import { logger, serializeError } from "@/lib/logger";

export const runtime = "nodejs";

const ALLOWED_PARAMS = [
  "title",
  "subtitle",
  "ctaLabel",
  "badgePrefix",
  "iconUrl",
  "badgeIconUrl",
  "iconCornerRadius",
  "durationMs",
  "playbackRate",
  "glowColor",
  "rimColor",
  "grayColor",
] as const;

const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
const BROWSER_TIMEOUT = 480000; // 8 minutes
const PAGE_LOAD_TIMEOUT = 60000; // 1 minute
const EXPORT_PAYLOAD_STORAGE_KEY = "app-reveal-export-payload";
const MAX_CONCURRENT_EXPORTS = 2;
const BYTES_PER_MB = 1024 * 1024;

function msToSeconds(value: number) {
  return Number((value / 1000).toFixed(2));
}

let browserPromise: Promise<Awaited<ReturnType<typeof getBrowser>>> | null =
  null;
let activeExportCount = 0;
const exportQueue: Array<() => void> = [];

async function getBrowser() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
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
}

async function getSharedBrowser() {
  if (!browserPromise) {
    browserPromise = getBrowser()
      .then((browser) => {
        browser.on("disconnected", () => {
          browserPromise = null;
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

async function acquireExportSlot() {
  if (activeExportCount < MAX_CONCURRENT_EXPORTS) {
    activeExportCount += 1;
    return;
  }

  await new Promise<void>((resolve) => {
    exportQueue.push(() => {
      activeExportCount += 1;
      resolve();
    });
  });
}

function releaseExportSlot() {
  activeExportCount = Math.max(0, activeExportCount - 1);
  const nextExport = exportQueue.shift();
  if (nextExport) {
    nextExport();
  }
}

function validateRequestBody(body: unknown): body is Record<string, unknown> {
  if (!body || typeof body !== "object") {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  let browser;
  let page;
  let hasSlot = false;
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

    const exportPayload: Record<string, string> = {};
    for (const key of ALLOWED_PARAMS) {
      const value = body[key];
      if (typeof value === "string" && value.length > 0) {
        exportPayload[key] = value;
      }
    }

    const host =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") ?? "http";
    const baseUrl = `${protocol}://${host}`;
    const renderUrl = `${baseUrl}/render?renderMode=export`;
    routeLogger.info({
      event: "render.started",
      durationSeconds: exportPayload.durationMs
        ? msToSeconds(Number(exportPayload.durationMs))
        : null,
    });

    await acquireExportSlot();
    hasSlot = true;

    browser = await getSharedBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    page.on("pageerror", (error) => {
      routeLogger.error({
        event: "render.pageerror",
        error: serializeError(error),
      });
    });

    await page.goto(baseUrl, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_LOAD_TIMEOUT,
    });

    await page.evaluate(
      ({ storageKey, payload }) => {
        window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
      },
      { storageKey: EXPORT_PAYLOAD_STORAGE_KEY, payload: exportPayload },
    );

    await page.goto(renderUrl, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_LOAD_TIMEOUT,
    });

    await page.waitForFunction("window.__EXPORT_DONE__ === true", {
      timeout: BROWSER_TIMEOUT,
    });

    const errorMsg = await page.evaluate(
      () =>
        (window as unknown as { __EXPORT_ERROR__?: string }).__EXPORT_ERROR__,
    );
    if (errorMsg) {
      routeLogger.error({
        event: "render.failed.in_page",
        errorMessage: errorMsg,
        elapsedSeconds: msToSeconds(Date.now() - startedAt),
      });
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const videoBytes = await page.evaluate(() =>
      Array.from(
        new Uint8Array(
          (window as unknown as { __EXPORT_RESULT__: ArrayBuffer })
            .__EXPORT_RESULT__,
        ),
      ),
    );

    const videoBuffer = Buffer.from(videoBytes);
    routeLogger.info({
      event: "render.completed",
      sizeMb: Number((videoBuffer.length / BYTES_PER_MB).toFixed(2)),
      elapsedSeconds: msToSeconds(Date.now() - startedAt),
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

    // Provide more specific error messages
    let statusCode = 500;
    let errorMessage = message;

    if (message.includes("Timeout")) {
      statusCode = 504;
      errorMessage =
        "Video generation timed out. Please try with shorter duration.";
    } else if (message.includes("Navigation")) {
      statusCode = 502;
      errorMessage = "Failed to load render page. Please try again.";
    }

    routeLogger.error({
      event: "render.failed",
      statusCode,
      errorMessage,
      elapsedSeconds: msToSeconds(Date.now() - startedAt),
      error: serializeError(error),
    });

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    if (hasSlot) {
      releaseExportSlot();
    }
  }
}
