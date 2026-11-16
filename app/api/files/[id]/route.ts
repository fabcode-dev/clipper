import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { filePath, getMeta } from "@/lib/server/store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = await getMeta(id);
  if (!meta) return new Response("Not found", { status: 404 });

  const path = filePath(id);
  const size = (await stat(path)).size;
  const headers = new Headers({
    "Content-Type": meta.kind === "output" ? "video/mp4" : meta.mime,
    "Accept-Ranges": "bytes",
  });
  if (new URL(request.url).searchParams.has("download")) {
    headers.set("Content-Disposition", `attachment; filename="${meta.name.replace(/[^\w.-]+/g, "_")}"`);
  }

  let start = 0;
  let end = size - 1;
  let status = 200;
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (m && (m[1] || m[2])) {
    if (m[1]) {
      start = Number(m[1]);
      if (m[2]) end = Math.min(end, Number(m[2]));
    } else {
      start = Math.max(0, size - Number(m[2]));
    }
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    status = 206;
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  }
  headers.set("Content-Length", String(end - start + 1));

  const stream = createReadStream(path, { start, end });
  // a seeking <video> aborts requests constantly; swallow the resulting stream errors
  stream.on("error", () => {});
  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, { status, headers });
}
