import { EXPORT_SETTINGS } from "../constants/exportSettings";

const waitForNextPaint = () =>
  new Promise<void>((r) => requestAnimationFrame(() => r()));

const waitForFonts = async () => {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return;
  }

  await document.fonts.ready;
};

const waitForImages = async (container: HTMLElement) => {
  const imgs = container.querySelectorAll("img");
  await Promise.all(
    Array.from(imgs).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((r) => {
            img.addEventListener("load", () => r(), { once: true });
            img.addEventListener("error", () => r(), { once: true });
            setTimeout(r, EXPORT_SETTINGS.IMAGE_LOAD_TIMEOUT_MS);
          }),
    ),
  );
};

const captureFrame = async (
  node: HTMLElement,
  toCanvas: (
    node: HTMLElement,
    opts: Record<string, unknown>,
  ) => Promise<HTMLCanvasElement>,
  elemWidth: number,
  elemHeight: number,
  pixelRatio: number,
  fontEmbedCSS: string,
) =>
  toCanvas(node, {
    backgroundColor: EXPORT_SETTINGS.BACKGROUND,
    cacheBust: false,
    pixelRatio,
    canvasWidth: elemWidth,
    canvasHeight: elemHeight,
    skipFonts: false,
    fontEmbedCSS,
    imagePlaceholder: undefined,
    includeQueryParams: true,
  });

export async function generateVideo(
  captureNode: HTMLElement,
  durationMs: number,
  timelineControl: { set: (value: number) => void } | null,
  onProgress?: (percent: number) => void,
): Promise<ArrayBuffer> {
  const { getFontEmbedCSS, toCanvas } = await import("html-to-image");
  const toCanvasFn = toCanvas as (
    n: HTMLElement,
    o: Record<string, unknown>,
  ) => Promise<HTMLCanvasElement>;

  await waitForNextPaint();
  await waitForFonts();
  await waitForImages(captureNode);
  await new Promise((r) => setTimeout(r, EXPORT_SETTINGS.WAIT_TIME_MS));

  const rect = captureNode.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) {
    throw new Error("Invalid preview size.");
  }

  const elemW = rect.width;
  const elemH = rect.height;
  const pixelRatio = Math.min(
    EXPORT_SETTINGS.WIDTH / elemW,
    EXPORT_SETTINGS.HEIGHT / elemH,
  );
  const fontEmbedCSS = await getFontEmbedCSS(captureNode);

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = EXPORT_SETTINGS.WIDTH;
  exportCanvas.height = EXPORT_SETTINGS.HEIGHT;

  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: EXPORT_SETTINGS.VIDEO_CODEC,
      width: EXPORT_SETTINGS.WIDTH,
      height: EXPORT_SETTINGS.HEIGHT,
    },
    fastStart: EXPORT_SETTINGS.FAST_START,
  });

  let encError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encError = e instanceof Error ? e : new Error(String(e));
    },
  });
  encoder.configure({
    codec: EXPORT_SETTINGS.CODEC,
    width: EXPORT_SETTINGS.WIDTH,
    height: EXPORT_SETTINGS.HEIGHT,
    bitrate: EXPORT_SETTINGS.BITRATE,
    framerate: EXPORT_SETTINGS.FRAME_RATE,
  });

  const frameTotal = Math.max(
    1,
    Math.ceil((durationMs / 1000) * EXPORT_SETTINGS.FRAME_RATE),
  );
  const frameDurationUs = 1_000_000 / EXPORT_SETTINGS.FRAME_RATE;
  const ctx = exportCanvas.getContext("2d", { alpha: false });

  if (!ctx) {
    throw new Error("Failed to get 2D rendering context");
  }

  const drawW = Math.round(elemW * pixelRatio);
  const drawH = Math.round(elemH * pixelRatio);
  const offsetX = Math.round((EXPORT_SETTINGS.WIDTH - drawW) / 2);
  const offsetY = Math.round((EXPORT_SETTINGS.HEIGHT - drawH) / 2);

  if (!timelineControl) {
    throw new Error("Timeline control not found.");
  }

  for (let i = 0; i < frameTotal; i++) {
    const progress = i / (frameTotal - 1);
    timelineControl.set(progress);

    await waitForNextPaint();

    const frameCanvas = await captureFrame(
      captureNode,
      toCanvasFn,
      elemW,
      elemH,
      pixelRatio,
      fontEmbedCSS,
    );

    ctx.fillStyle = EXPORT_SETTINGS.BACKGROUND;
    ctx.fillRect(0, 0, EXPORT_SETTINGS.WIDTH, EXPORT_SETTINGS.HEIGHT);
    ctx.drawImage(frameCanvas, offsetX, offsetY, drawW, drawH);

    if (encError) throw encError;
    const vf = new VideoFrame(exportCanvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    encoder.encode(vf, {
      keyFrame: i % EXPORT_SETTINGS.FRAME_RATE === 0,
    });
    vf.close();

    if (onProgress) {
      onProgress(Math.min(99, Math.round(((i + 1) / frameTotal) * 100)));
    }
  }

  if (encError) throw encError;
  await encoder.flush();
  encoder.close();
  muxer.finalize();

  return target.buffer;
}
