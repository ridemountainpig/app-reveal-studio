import { NextResponse } from "next/server";

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

function validateRequestBody(body: unknown): body is Record<string, unknown> {
  if (!body || typeof body !== "object") {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  let browser;

  try {
    // Check content length
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );
    }

    const body = await request.json();

    // Validate request body
    if (!validateRequestBody(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const params = new URLSearchParams();
    for (const key of ALLOWED_PARAMS) {
      const value = body[key];
      if (typeof value === "string" && value.length > 0) {
        params.set(key, value);
      }
    }

    const host =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") ?? "http";
    const baseUrl = `${protocol}://${host}`;
    const renderUrl = `${baseUrl}/render?${params.toString()}`;

    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });

    await page.goto(renderUrl, {
      waitUntil: "networkidle2",
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
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const videoBase64 = await page.evaluate(() => {
      const buf = (window as unknown as { __EXPORT_RESULT__: ArrayBuffer })
        .__EXPORT_RESULT__;
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    });

    await browser.close();
    browser = undefined;

    const videoBuffer = Buffer.from(videoBase64, "base64");

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="app-reveal.mp4"',
        "Content-Length": String(videoBuffer.length),
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

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
