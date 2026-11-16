import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import type { AudioSource, Branding, Corner, OutputFormat } from "../types";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

export function probe(file: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const p = spawn(
      FFPROBE,
      ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("error", () => reject(new Error("ffprobe not found. Install FFmpeg and add it to PATH.")));
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error("Not a readable media file"));
      try {
        const j = JSON.parse(out);
        const v = j.streams?.find((s: { codec_type: string }) => s.codec_type === "video");
        if (!v) return reject(new Error("No video stream found"));
        const rot = Math.abs(
          Number(v.tags?.rotate ?? v.side_data_list?.find((s: { rotation?: number }) => s.rotation !== undefined)?.rotation ?? 0),
        );
        const swap = rot === 90 || rot === 270;
        resolve({
          duration: Number(j.format?.duration ?? v.duration ?? 0),
          width: swap ? v.height : v.width,
          height: swap ? v.width : v.height,
          hasAudio: j.streams.some((s: { codec_type: string }) => s.codec_type === "audio"),
        });
      } catch {
        reject(new Error("Could not parse media info"));
      }
    });
  });
}

// ---------------------------------------------------------------- helpers

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export function outputSize(format: OutputFormat, srcW: number, srcH: number): [number, number] {
  switch (format) {
    case "9:16":
      return [1080, 1920];
    case "1:1":
      return [1080, 1080];
    case "16:9":
      return [1920, 1080];
    default: {
      // keep aspect ratio, cap the long side at 1920 to keep renders quick
      const k = Math.min(1, 1920 / Math.max(srcW, srcH));
      return [even(srcW * k), even(srcH * k)];
    }
  }
}

function findFont(): string | null {
  const candidates = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
  ];
  return candidates.find((f) => existsSync(f)) ?? null;
}

/** Escape a path for use inside a quoted filtergraph option value. */
const filterPath = (p: string) => p.replace(/\\/g, "/").replace(/:/g, "\\:");

/** Greedy word-wrap, since drawtext does not wrap. */
export function wrapCaption(text: string, width: number, fontSize: number): string {
  const maxChars = Math.max(8, Math.floor((width * 0.86) / (fontSize * 0.54)));
  const lines: string[] = [];
  for (const para of text.trim().split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (line && (line + " " + word).length > maxChars) {
        lines.push(line);
        line = word;
      } else {
        line = line ? line + " " + word : word;
      }
    }
    lines.push(line);
  }
  return lines.join("\n");
}

export const captionFontSize = (height: number, pct: number) => Math.round((height * pct) / 100);

export function captionFilter(
  input: string,
  output: string,
  textFile: string,
  w: number,
  h: number,
  b: Branding,
): string | null {
  const font = findFont();
  if (!font) return null;
  const fs = captionFontSize(h, b.captionSize);
  const y =
    b.captionPosition === "top"
      ? `${Math.round(h * 0.08)}`
      : b.captionPosition === "center"
        ? "(h-text_h)/2"
        : `h-${Math.round(h * 0.08)}-text_h`;
  const color = /^#[0-9a-f]{6}$/i.test(b.captionColor) ? b.captionColor : "#ffffff";
  void w;
  return (
    `[${input}]drawtext=fontfile='${filterPath(font)}':textfile='${textFile}':expansion=none` +
    `:fontsize=${fs}:fontcolor=${color}:borderw=${Math.max(1, Math.round(fs / 14))}:bordercolor=black` +
    `:box=1:boxcolor=black@0.35:boxborderw=${Math.round(fs * 0.3)}:line_spacing=${Math.round(fs * 0.15)}` +
    `:x=(w-text_w)/2:y=${y}[${output}]`
  );
}

function logoFilters(logoIdx: number, base: string, out: string, w: number, corner: Corner, sizePct: number) {
  const m = Math.round(w * 0.04);
  const lw = even(w * (Math.min(60, Math.max(3, sizePct)) / 100));
  const x = corner === "tl" || corner === "bl" ? `${m}` : `W-w-${m}`;
  const y = corner === "tl" || corner === "tr" ? `${m}` : `H-h-${m}`;
  return `[${logoIdx}:v]format=rgba,scale=${lw}:-2[lg];[${base}][lg]overlay=${x}:${y}[${out}]`;
}

const fit = (w: number, h: number) =>
  `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=30`;

const ENCODE = [
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-f", "mp4",
];

// ---------------------------------------------------------------- builders

interface Common {
  output: string;
  logoPath?: string;
  branding: Branding;
  /** relative to the process cwd; null if no caption */
  captionFile: string | null;
}

export function buildSingleArgs(
  o: Common & { input: string; start: number; duration: number; width: number; height: number; hasAudio: boolean },
): string[] {
  const args = ["-y", "-hide_banner", "-nostats", "-progress", "pipe:1", "-ss", String(o.start), "-t", String(o.duration), "-i", o.input];
  if (o.logoPath) args.push("-i", o.logoPath);

  const parts = [`[0:v]${fit(o.width, o.height)}[v0]`];
  let cur = "v0";
  if (o.logoPath) {
    parts.push(logoFilters(1, cur, "v1", o.width, o.branding.logoCorner, o.branding.logoSize));
    cur = "v1";
  }
  if (o.captionFile) {
    const f = captionFilter(cur, "v2", o.captionFile, o.width, o.height, o.branding);
    if (f) {
      parts.push(f);
      cur = "v2";
    }
  }
  args.push("-filter_complex", parts.join(";"), "-map", `[${cur}]`);
  if (o.hasAudio) args.push("-map", "0:a:0");
  args.push("-t", String(o.duration), ...ENCODE, o.output);
  return args;
}

export function buildSplitArgs(
  o: Common & {
    top: string;
    bottom: string;
    topStart: number;
    bottomStart: number;
    duration: number;
    audio: AudioSource;
    topHasAudio: boolean;
    bottomHasAudio: boolean;
  },
): string[] {
  const W = 1080;
  const H = 1920;
  const args = ["-y", "-hide_banner", "-nostats", "-progress", "pipe:1"];
  args.push("-ss", String(o.topStart), "-t", String(o.duration), "-i", o.top);
  args.push("-ss", String(o.bottomStart), "-t", String(o.duration), "-i", o.bottom);
  if (o.logoPath) args.push("-i", o.logoPath);

  const parts = [
    `[0:v]${fit(W, H / 2)}[a]`,
    `[1:v]${fit(W, H / 2)}[b]`,
    `[a][b]vstack=inputs=2[v0]`,
  ];
  let cur = "v0";
  if (o.logoPath) {
    parts.push(logoFilters(2, cur, "v1", W, o.branding.logoCorner, o.branding.logoSize));
    cur = "v1";
  }
  if (o.captionFile) {
    const f = captionFilter(cur, "v2", o.captionFile, W, H, o.branding);
    if (f) {
      parts.push(f);
      cur = "v2";
    }
  }

  // Audio: fall back gracefully when a source has no audio track.
  let audio = o.audio;
  if (audio === "top" && !o.topHasAudio) audio = o.bottomHasAudio ? "bottom" : "none";
  if (audio === "bottom" && !o.bottomHasAudio) audio = o.topHasAudio ? "top" : "none";
  if (audio === "mix" && !(o.topHasAudio && o.bottomHasAudio)) {
    audio = o.topHasAudio ? "top" : o.bottomHasAudio ? "bottom" : "none";
  }
  let audioMap: string[] = [];
  if (audio === "top") audioMap = ["-map", "0:a:0"];
  else if (audio === "bottom") audioMap = ["-map", "1:a:0"];
  else if (audio === "mix") {
    parts.push("[0:a][1:a]amix=inputs=2:duration=first:normalize=0[aout]");
    audioMap = ["-map", "[aout]"];
  }

  args.push("-filter_complex", parts.join(";"), "-map", `[${cur}]`, ...audioMap);
  args.push("-t", String(o.duration), ...ENCODE, o.output);
  return args;
}

// ---------------------------------------------------------------- runner

export interface Running {
  proc?: ChildProcess;
  cancelled: boolean;
}

/** Runs ffmpeg and reports 0..1 progress, based on `-progress` output. */
export function runFfmpeg(
  args: string[],
  cwd: string,
  durationSec: number,
  onProgress: (p: number) => void,
  running: Running,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    running.proc = proc;
    let stderr = "";
    let buf = "";
    proc.stdout!.on("data", (d: Buffer) => {
      buf += d.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const m = /^out_time_(?:us|ms)=(\d+)/.exec(line);
        if (m && durationSec > 0) onProgress(Math.min(0.99, Number(m[1]) / 1e6 / durationSec));
      }
    });
    proc.stderr!.on("data", (d: Buffer) => {
      stderr = (stderr + d.toString()).slice(-4000);
    });
    proc.on("error", () => reject(new Error("ffmpeg not found. Install FFmpeg and add it to PATH.")));
    proc.on("close", (code) => {
      if (running.cancelled) return reject(new Error("cancelled"));
      if (code === 0) return resolve();
      const tail = stderr.trim().split(/\r?\n/).slice(-4).join("\n");
      reject(new Error(`ffmpeg failed (${code}): ${tail}`));
    });
  });
}
