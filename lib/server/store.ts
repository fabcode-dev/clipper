import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/** Everything lives in the OS temp dir so dev-server file watching never sees it. */
export const ROOT = path.join(os.tmpdir(), "clipper-data");
const FILES = path.join(ROOT, "files");
const JOBS = path.join(ROOT, "jobs");
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ID_RE = /^[0-9a-f-]{36}$/;

export interface FileMeta {
  id: string;
  name: string;
  mime: string;
  kind: "video" | "image" | "output";
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  hasAudio?: boolean;
}

const g = globalThis as unknown as { __clipperSwept?: boolean };

async function ensureDirs() {
  await fs.mkdir(FILES, { recursive: true });
  await fs.mkdir(JOBS, { recursive: true });
  if (!g.__clipperSwept) {
    g.__clipperSwept = true;
    void sweep();
  }
}

/** Delete anything older than 24h (best effort). */
async function sweep() {
  const cutoff = Date.now() - MAX_AGE_MS;
  for (const dir of [FILES, JOBS]) {
    try {
      for (const name of await fs.readdir(dir)) {
        const p = path.join(dir, name);
        const st = await fs.stat(p);
        if (st.mtimeMs < cutoff) await fs.rm(p, { recursive: true, force: true });
      }
    } catch {
      /* ignore */
    }
  }
}

export const isValidId = (id: string) => ID_RE.test(id);
export const newId = () => randomUUID();

export function filePath(id: string) {
  if (!isValidId(id)) throw new Error("Invalid id");
  return path.join(FILES, `${id}.bin`);
}

function metaPath(id: string) {
  return path.join(FILES, `${id}.json`);
}

export async function prepareStore() {
  await ensureDirs();
}

export async function writeMeta(meta: FileMeta) {
  await fs.writeFile(metaPath(meta.id), JSON.stringify(meta));
}

export async function getMeta(id: string): Promise<FileMeta | null> {
  if (!isValidId(id)) return null;
  try {
    return JSON.parse(await fs.readFile(metaPath(id), "utf8")) as FileMeta;
  } catch {
    return null;
  }
}

export async function removeFile(id: string) {
  await fs.rm(filePath(id), { force: true });
  await fs.rm(metaPath(id), { force: true });
}

export async function makeJobDir(jobId: string) {
  await ensureDirs();
  const dir = path.join(JOBS, jobId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
