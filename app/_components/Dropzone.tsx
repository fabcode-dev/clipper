"use client";
import { useRef, useState } from "react";
import type { UploadedFile } from "@/lib/types";
import { bytes, fmt } from "../_lib/format";
import { btn } from "./ui";

export default function Dropzone({
  kind,
  label,
  hint,
  file,
  onFile,
}: {
  kind: "video" | "image";
  label: string;
  hint?: string;
  file: UploadedFile | null;
  onFile: (f: UploadedFile | null) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);

  function upload(f: File) {
    setError(null);
    setProgress(0);
    const req = new XMLHttpRequest();
    xhr.current = req;
    req.open("POST", "/api/upload");
    req.setRequestHeader("x-kind", kind);
    req.setRequestHeader("x-file-name", encodeURIComponent(f.name));
    req.setRequestHeader("Content-Type", f.type || "application/octet-stream");
    req.upload.onprogress = (e) => e.lengthComputable && setProgress(e.loaded / e.total);
    req.onload = () => {
      setProgress(null);
      try {
        const body = JSON.parse(req.responseText);
        if (req.status === 200) onFile(body as UploadedFile);
        else setError(body.error ?? "Upload failed");
      } catch {
        setError("Upload failed");
      }
    };
    req.onerror = () => {
      setProgress(null);
      setError("Upload failed. Is the server running?");
    };
    req.onabort = () => setProgress(null);
    req.send(f);
  }

  function pick(f?: File) {
    if (!f) return;
    if (!f.type.startsWith(kind + "/")) {
      return setError(kind === "image" ? "Please choose an image file" : "Please choose a video file");
    }
    upload(f);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-100">{file.name}</div>
          <div className="text-xs text-zinc-400">
            {file.kind === "video" && file.duration ? `${fmt(file.duration)} · ` : ""}
            {file.width}×{file.height} · {bytes(file.size)}
          </div>
        </div>
        <button type="button" className={btn} onClick={() => onFile(null)}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => progress === null && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
          over ? "border-violet-400 bg-violet-500/10" : "border-white/15 hover:border-white/30"
        }`}
      >
        {progress === null ? (
          <>
            <div className="text-sm font-medium text-zinc-100">{label}</div>
            <div className="text-xs text-zinc-400">{hint ?? "Drop a file here or click to browse"}</div>
          </>
        ) : (
          <div className="w-full max-w-xs">
            <div className="mb-2 text-sm text-zinc-200">Uploading… {Math.round(progress * 100)}%</div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-violet-500 transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
            <button
              type="button"
              className="mt-3 text-xs text-zinc-400 underline"
              onClick={(e) => {
                e.stopPropagation();
                xhr.current?.abort();
              }}
            >
              Cancel
            </button>
          </div>
        )}
        <input
          ref={input}
          type="file"
          accept={kind + "/*"}
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
    </div>
  );
}
