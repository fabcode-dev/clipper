import { createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebStream } from "node:stream/web";
import { probe } from "@/lib/server/ffmpeg";
import { filePath, newId, prepareStore, removeFile, writeMeta } from "@/lib/server/store";
import type { UploadedFile } from "@/lib/types";

// Raw body upload: the file is streamed straight to disk (no size limit, no buffering).
export async function POST(request: Request) {
  if (!request.body) return Response.json({ error: "Empty upload" }, { status: 400 });
  const kind = request.headers.get("x-kind") === "image" ? "image" : "video";
  let name = "upload";
  try {
    name = decodeURIComponent(request.headers.get("x-file-name") ?? "upload").slice(0, 200);
  } catch {}

  await prepareStore();
  const id = newId();
  try {
    await pipeline(
      Readable.fromWeb(request.body as unknown as NodeWebStream),
      createWriteStream(filePath(id)),
    );
    const size = (await stat(filePath(id))).size;
    const info = await probe(filePath(id));
    if (kind === "video" && info.duration <= 0) throw new Error("Could not read video duration");

    const file: UploadedFile = {
      id,
      name,
      kind,
      size,
      duration: kind === "video" ? info.duration : undefined,
      width: info.width,
      height: info.height,
      hasAudio: info.hasAudio,
    };
    await writeMeta({
      ...file,
      mime: request.headers.get("content-type") ?? "application/octet-stream",
    });
    return Response.json(file);
  } catch (e) {
    await removeFile(id).catch(() => {});
    return Response.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 },
    );
  }
}
