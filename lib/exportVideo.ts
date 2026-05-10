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

  const {
    BufferTarget,
    EncodedPacket,
    EncodedVideoPacketSource,
    Mp4OutputFormat,
    Output,
  } = await import("mediabunny");
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({
      fastStart: EXPORT_SETTINGS.FAST_START,
    }),
    target,
  });
  const videoSource = new EncodedVideoPacketSource(EXPORT_SETTINGS.VIDEO_CODEC);
  output.addVideoTrack(videoSource);
  await output.start();

  let encError: Error | null = null;
  let packetWriteError: Error | null = null;
  let packetWriteQueue = Promise.resolve();
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      const packet = EncodedPacket.fromEncodedChunk(chunk);
      packetWriteQueue = packetWriteQueue
        .then(() => videoSource.add(packet, meta))
        .catch((e) => {
          packetWriteError =
            packetWriteError ?? (e instanceof Error ? e : new Error(String(e)));
        });
    },
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
    frameCanvas.width = 0;
    frameCanvas.height = 0;

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
  await packetWriteQueue;
  encoder.close();
  if (packetWriteError) throw packetWriteError;
  await output.finalize();

  if (!target.buffer) {
    throw new Error("Failed to finalize MP4 output.");
  }

  return target.buffer;
}

export async function captureFrameSegment(
  captureNode: HTMLElement,
  timelineControl: { set: (value: number) => void } | null,
  frameStart: number,
  frameEnd: number,
  frameTotal: number,
): Promise<string[]> {
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

  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = EXPORT_SETTINGS.WIDTH;
  compositeCanvas.height = EXPORT_SETTINGS.HEIGHT;
  const ctx = compositeCanvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Failed to get 2D rendering context");

  const drawW = Math.round(elemW * pixelRatio);
  const drawH = Math.round(elemH * pixelRatio);
  const offsetX = Math.round((EXPORT_SETTINGS.WIDTH - drawW) / 2);
  const offsetY = Math.round((EXPORT_SETTINGS.HEIGHT - drawH) / 2);

  if (!timelineControl) throw new Error("Timeline control not found.");

  const jpegFrames: string[] = [];

  for (let i = frameStart; i <= frameEnd; i++) {
    const progress = frameTotal <= 1 ? 0 : i / (frameTotal - 1);
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

    jpegFrames.push(compositeCanvas.toDataURL("image/jpeg", 0.95));
    frameCanvas.width = 0;
    frameCanvas.height = 0;
  }

  return jpegFrames;
}

export async function encodeFromJpegFrames(
  frames: string[],
): Promise<ArrayBuffer> {
  const {
    BufferTarget,
    EncodedPacket,
    EncodedVideoPacketSource,
    Mp4OutputFormat,
    Output,
  } = await import("mediabunny");

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: EXPORT_SETTINGS.FAST_START }),
    target,
  });
  const videoSource = new EncodedVideoPacketSource(EXPORT_SETTINGS.VIDEO_CODEC);
  output.addVideoTrack(videoSource);
  await output.start();

  let encError: Error | null = null;
  let packetWriteError: Error | null = null;
  let packetWriteQueue = Promise.resolve();

  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      const packet = EncodedPacket.fromEncodedChunk(chunk);
      packetWriteQueue = packetWriteQueue
        .then(() => videoSource.add(packet, meta))
        .catch((e) => {
          packetWriteError =
            packetWriteError ?? (e instanceof Error ? e : new Error(String(e)));
        });
    },
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

  const frameDurationUs = 1_000_000 / EXPORT_SETTINGS.FRAME_RATE;

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_SETTINGS.WIDTH;
  canvas.height = EXPORT_SETTINGS.HEIGHT;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Failed to get 2D rendering context");

  for (let i = 0; i < frames.length; i++) {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Frame ${i} load timed out.`));
      }, EXPORT_SETTINGS.IMAGE_LOAD_TIMEOUT_MS);
      img.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error(`Failed to load frame ${i}`));
      };
      img.src = frames[i];
    });

    ctx.drawImage(img, 0, 0, EXPORT_SETTINGS.WIDTH, EXPORT_SETTINGS.HEIGHT);
    img.src = "";

    if (encError) throw encError;

    const vf = new VideoFrame(canvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    encoder.encode(vf, { keyFrame: i % EXPORT_SETTINGS.FRAME_RATE === 0 });
    vf.close();
  }

  if (encError) throw encError;
  await encoder.flush();
  await packetWriteQueue;
  encoder.close();
  if (packetWriteError) throw packetWriteError;
  await output.finalize();

  if (!target.buffer) throw new Error("Failed to finalize MP4 output.");
  return target.buffer;
}
