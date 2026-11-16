import { promises as fs } from "node:fs";
import path from "node:path";
import type { Branding, ClipStatus, JobRequest, JobStatus } from "../types";
import {
  buildSingleArgs,
  buildSplitArgs,
  outputSize,
  runFfmpeg,
  wrapCaption,
  captionFontSize,
  type Running,
} from "./ffmpeg";
import { filePath, getMeta, makeJobDir, newId, removeFile, writeMeta, type FileMeta } from "./store";

interface Job {
  id: string;
  state: JobStatus["state"];
  startedAt: number;
  finishedAt?: number;
  error?: string;
  clips: ClipStatus[];
  clipStartedAt: number[];
  running: Running;
}

const g = globalThis as unknown as { __clipperJobs?: Map<string, Job> };
const jobs = (g.__clipperJobs ??= new Map<string, Job>());

// ---------------------------------------------------------------- validation

const num = (v: unknown, name: string, min = 0, max = 1e6) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
    throw new Error(`Invalid ${name}`);
  }
  return v;
};
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");

function cleanBranding(b: Partial<Branding> | undefined): Branding {
  const corners = ["tl", "tr", "bl", "br"];
  const positions = ["top", "center", "bottom"];
  return {
    logoId: typeof b?.logoId === "string" ? b.logoId : undefined,
    logoCorner: corners.includes(b?.logoCorner as string) ? b!.logoCorner! : "tr",
    logoSize: num(b?.logoSize ?? 18, "logo size", 3, 60),
    captionSize: num(b?.captionSize ?? 5, "caption size", 2, 12),
    captionPosition: positions.includes(b?.captionPosition as string) ? b!.captionPosition! : "bottom",
    captionColor: typeof b?.captionColor === "string" ? b.captionColor : "#ffffff",
  };
}

interface Plan {
  label: string;
  duration: number;
  caption: string;
  /** builds ffmpeg args given output path + caption file */
  build: (output: string, captionFile: string | null) => string[];
}

async function requireVideo(id: unknown, role: string): Promise<FileMeta> {
  const m = typeof id === "string" ? await getMeta(id) : null;
  if (!m || m.kind !== "video") throw new Error(`${role} video not found — upload it again`);
  return m;
}

async function plan(req: JobRequest): Promise<{ plans: Plan[]; branding: Branding; logoPath?: string }> {
  const branding = cleanBranding(req.branding);
  let logoPath: string | undefined;
  if (branding.logoId) {
    const m = await getMeta(branding.logoId);
    if (m?.kind === "image") logoPath = filePath(m.id);
    else branding.logoId = undefined;
  }
  if (!Array.isArray(req.clips) || req.clips.length === 0) throw new Error("Add at least one clip");
  if (req.clips.length > 50) throw new Error("Too many clips (max 50)");

  const plans: Plan[] = [];

  if (req.mode === "single") {
    const v = await requireVideo(req.videoId, "Source");
    const [w, h] = outputSize(req.format, v.width ?? 1280, v.height ?? 720);
    req.clips.forEach((c, i) => {
      const start = num(c.start, "clip start", 0, v.duration ?? 1e6);
      const end = num(c.end, "clip end", 0, 1e6);
      const duration = Math.min(end, v.duration ?? end) - start;
      if (duration < 0.1) throw new Error(`Clip ${i + 1}: end must be after start`);
      plans.push({
        label: `Clip ${i + 1}`,
        duration,
        caption: str(c.caption),
        build: (output, captionFile) =>
          buildSingleArgs({
            input: filePath(v.id),
            start,
            duration,
            width: w,
            height: h,
            hasAudio: !!v.hasAudio,
            output,
            logoPath,
            branding,
            captionFile,
          }),
      });
    });
    return { plans, branding, logoPath };
  }

  if (req.mode === "split") {
    const top = await requireVideo(req.topId, "Top");
    const bottom = await requireVideo(req.bottomId, "Bottom");
    const audio = ["top", "bottom", "mix", "none"].includes(req.audio) ? req.audio : "top";
    req.clips.forEach((c, i) => {
      const topStart = num(c.topStart, "top start", 0, top.duration ?? 1e6);
      const bottomStart = num(c.bottomStart, "bottom start", 0, bottom.duration ?? 1e6);
      let duration = num(c.duration, "duration", 0, 1e6);
      duration = Math.min(duration, (top.duration ?? duration) - topStart, (bottom.duration ?? duration) - bottomStart);
      if (duration < 0.1) throw new Error(`Clip ${i + 1}: not enough footage after the start times`);
      plans.push({
        label: `Split clip ${i + 1}`,
        duration,
        caption: str(c.caption),
        build: (output, captionFile) =>
          buildSplitArgs({
            top: filePath(top.id),
            bottom: filePath(bottom.id),
            topStart,
            bottomStart,
            duration,
            audio,
            topHasAudio: !!top.hasAudio,
            bottomHasAudio: !!bottom.hasAudio,
            output,
            logoPath,
            branding,
            captionFile,
          }),
      });
    });
    return { plans, branding, logoPath };
  }

  throw new Error("Unknown mode");
}

// ---------------------------------------------------------------- lifecycle

export async function startJob(req: JobRequest): Promise<string> {
  const { plans, branding } = await plan(req);
  const id = newId();
  const dir = await makeJobDir(id);

  const job: Job = {
    id,
    state: "running",
    startedAt: Date.now(),
    clips: plans.map((p) => ({
      label: p.label,
      state: "queued",
      progress: 0,
      durationSec: p.duration,
      elapsedMs: 0,
    })),
    clipStartedAt: plans.map(() => 0),
    running: { cancelled: false },
  };
  jobs.set(id, job);
  void run(job, plans, branding, req, dir);
  return id;
}

async function run(job: Job, plans: Plan[], branding: Branding, req: JobRequest, dir: string) {
  const outH = req.mode === "split" ? 1920 : 0;
  try {
    for (let i = 0; i < plans.length; i++) {
      if (job.running.cancelled) throw new Error("cancelled");
      const p = plans[i];
      const c = job.clips[i];
      c.state = "running";
      job.clipStartedAt[i] = Date.now();

      let captionFile: string | null = null;
      if (p.caption.trim()) {
        captionFile = `cap-${i}.txt`;
        // width/height only matter for wrapping; approximate from the format
        let w = 1080;
        let h = outH || 1080;
        if (req.mode === "single") {
          const m = await getMeta(req.videoId);
          [w, h] = outputSize(req.format, m?.width ?? 1280, m?.height ?? 720);
        }
        const fsz = captionFontSize(h, branding.captionSize);
        await fs.writeFile(path.join(dir, captionFile), wrapCaption(p.caption, w, fsz), "utf8");
      }

      const outId = newId();
      const outPath = filePath(outId);
      try {
        await runFfmpeg(
          p.build(outPath, captionFile),
          dir,
          p.duration,
          (pr) => {
            c.progress = pr;
            c.elapsedMs = Date.now() - job.clipStartedAt[i];
          },
          job.running,
        );
      } catch (e) {
        await removeFile(outId).catch(() => {});
        throw e;
      }
      const st = await fs.stat(outPath);
      await writeMeta({
        id: outId,
        name: `${req.mode === "split" ? "split" : "clip"}-${i + 1}.mp4`,
        mime: "video/mp4",
        kind: "output",
        size: st.size,
        duration: p.duration,
      });
      c.state = "done";
      c.progress = 1;
      c.fileId = outId;
      c.elapsedMs = Date.now() - job.clipStartedAt[i];
    }
    job.state = "done";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (job.running.cancelled || msg === "cancelled") {
      job.state = "cancelled";
      job.clips.forEach((c) => c.state !== "done" && (c.state = "cancelled"));
    } else {
      job.state = "error";
      job.error = msg;
      const cur = job.clips.find((c) => c.state === "running");
      if (cur) cur.state = "error";
    }
  } finally {
    job.finishedAt = Date.now();
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export function getJob(id: string): JobStatus | null {
  const job = jobs.get(id);
  if (!job) return null;
  const total = job.clips.reduce((s, c) => s + c.durationSec, 0) || 1;
  const done = job.clips.reduce((s, c) => s + c.durationSec * c.progress, 0);
  return {
    id: job.id,
    state: job.state,
    progress: job.state === "done" ? 1 : done / total,
    elapsedMs: (job.finishedAt ?? Date.now()) - job.startedAt,
    error: job.error,
    clips: job.clips,
  };
}

export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job || job.state !== "running") return false;
  job.running.cancelled = true;
  job.running.proc?.kill("SIGKILL");
  return true;
}
