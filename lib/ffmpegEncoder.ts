import { spawn, type ChildProcessByStdio } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Readable, Writable } from "node:stream";
import ffmpegPath from "ffmpeg-static";

type FfmpegProcess = ChildProcessByStdio<Writable, null, Readable>;

export type FfmpegEncoderOptions = {
  frameRate: number;
  bitrate: number;
  /** Input codec for image2pipe. Defaults to mjpeg (faster than png). */
  inputCodec?: "mjpeg" | "png";
};

/**
 * Thin wrapper around a spawned FFmpeg process that reads image frames from
 * stdin (MJPEG by default, PNG optional) and produces an MP4 file. We write to
 * a temp file instead of stdout so the output keeps a standard moov atom
 * placement.
 */
export class FfmpegEncoder {
  private readonly proc: FfmpegProcess;
  private readonly tmpDir: string;
  private readonly tmpFile: string;
  private readonly stderrChunks: Buffer[] = [];
  private readonly closePromise: Promise<void>;
  private writeQueue: Promise<void> = Promise.resolve();
  private disposed = false;

  static async create(options: FfmpegEncoderOptions): Promise<FfmpegEncoder> {
    if (!ffmpegPath) {
      throw new Error("ffmpeg-static binary is not available.");
    }

    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "app-reveal-export-"),
    );
    const tmpFile = path.join(tmpDir, "out.mp4");

    const inputCodec = options.inputCodec ?? "mjpeg";
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "image2pipe",
      "-framerate",
      String(options.frameRate),
      "-vcodec",
      inputCodec,
      "-i",
      "pipe:0",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-tune",
      "stillimage",
      "-pix_fmt",
      "yuv420p",
      "-b:v",
      String(options.bitrate),
      "-movflags",
      "+faststart",
      tmpFile,
    ];

    const proc = spawn(ffmpegPath, args, {
      stdio: ["pipe", "ignore", "pipe"],
    });

    return new FfmpegEncoder(proc, tmpDir, tmpFile);
  }

  private constructor(proc: FfmpegProcess, tmpDir: string, tmpFile: string) {
    this.proc = proc;
    this.tmpDir = tmpDir;
    this.tmpFile = tmpFile;

    this.proc.stderr.on("data", (chunk: Buffer) => {
      this.stderrChunks.push(chunk);
    });

    this.proc.stdin.on("error", () => {
      // Surfaced via closePromise when the process exits with a non-zero code.
    });

    this.closePromise = new Promise<void>((resolve, reject) => {
      this.proc.on("error", reject);
      this.proc.on("close", (code) => {
        if (code !== 0) {
          const stderr = Buffer.concat(this.stderrChunks).toString();
          reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
          return;
        }
        resolve();
      });
    });
  }

  writeFrame(png: Buffer): Promise<void> {
    if (this.disposed) {
      return Promise.reject(new Error("Encoder disposed."));
    }

    this.writeQueue = this.writeQueue.then(
      () =>
        new Promise<void>((resolve, reject) => {
          if (!this.proc.stdin.writable) {
            reject(new Error("ffmpeg stdin is not writable."));
            return;
          }

          const onError = (err: Error) => reject(err);
          this.proc.stdin.once("error", onError);

          const flushed = this.proc.stdin.write(png, (err) => {
            this.proc.stdin.off("error", onError);
            if (err) {
              reject(err);
            }
          });

          if (flushed) {
            this.proc.stdin.off("error", onError);
            resolve();
          } else {
            this.proc.stdin.once("drain", () => {
              this.proc.stdin.off("error", onError);
              resolve();
            });
          }
        }),
    );
    return this.writeQueue;
  }

  async finish(): Promise<Buffer> {
    if (this.disposed) {
      throw new Error("Encoder disposed.");
    }
    try {
      await this.writeQueue;
      this.proc.stdin.end();
      await this.closePromise;
      return await fs.readFile(this.tmpFile);
    } finally {
      await this.cleanup();
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.proc.stdin.destroy();
    } catch {
      // ignore
    }
    try {
      this.proc.kill("SIGKILL");
    } catch {
      // ignore
    }
    await this.cleanup();
  }

  private async cleanup(): Promise<void> {
    this.disposed = true;
    try {
      await fs.rm(this.tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}
