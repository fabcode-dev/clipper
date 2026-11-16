"use client";
import { useEffect, useRef, useState } from "react";
import type { JobStatus } from "@/lib/types";
import { clock, fileUrl, fmt } from "../_lib/format";
import { btn, card } from "./ui";

export default function JobProgress({ jobId, onReset }: { jobId: string; onReset: () => void }) {
  const [snap, setSnap] = useState<{ status: JobStatus; at: number } | null>(null);
  const status = snap?.status ?? null;
  const [lost, setLost] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Poll the server for progress until the job finishes.
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        if (res.status === 404) return setLost(true);
        const s = (await res.json()) as JobStatus;
        if (stop) return;
        setSnap({ status: s, at: Date.now() });
        if (s.state !== "running") return;
      } catch {
        /* transient, retry */
      }
      if (!stop) timer = setTimeout(poll, 500);
    }
    void poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [jobId]);

  const running = !status || status.state === "running";

  // Tick the visible timer between polls so it counts smoothly every second.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  const elapsed = status ? status.elapsedMs + (running ? Math.max(0, now - snap!.at) : 0) : 0;
  const pct = status ? status.progress : 0;
  const eta = running && pct > 0.03 ? (elapsed / pct) * (1 - pct) : null;
  const current = status?.clips.findIndex((c) => c.state === "running") ?? -1;

  if (lost) {
    return (
      <div ref={ref} className={card}>
        <p className="text-sm text-red-400">This job was lost (the server may have restarted).</p>
        <button className={`${btn} mt-3`} onClick={onReset}>
          Start over
        </button>
      </div>
    );
  }

  const title =
    !status || status.state === "running"
      ? current >= 0
        ? `Clipping… ${status!.clips[current].label} of ${status!.clips.length}`
        : "Starting…"
      : status.state === "done"
        ? "All clips are ready"
        : status.state === "cancelled"
          ? "Cancelled"
          : "Something went wrong";

  return (
    <div ref={ref} className={`${card} space-y-5`}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {running ? "Time elapsed" : "Total time"}
          </div>
          <div
            role="timer"
            className={`font-mono text-5xl font-semibold tabular-nums ${running ? "text-violet-300" : "text-zinc-100"}`}
          >
            {clock(elapsed)}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-zinc-100">{title}</span>
            <span className="font-mono tabular-nums text-zinc-300">{Math.round(pct * 100)}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full transition-[width] duration-500 ${
                status?.state === "error" ? "bg-red-500" : "bg-violet-500"
              }`}
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          {running && (
            <div className="mt-1.5 text-xs text-zinc-400">
              {eta !== null ? `About ${clock(eta)} remaining` : "Estimating time remaining…"}
            </div>
          )}
        </div>
        {running ? (
          <button className={btn} onClick={() => fetch(`/api/jobs/${jobId}`, { method: "DELETE" })}>
            Cancel
          </button>
        ) : (
          <button className={btn} onClick={onReset}>
            Dismiss
          </button>
        )}
      </div>

      {status?.error && (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {status.error}
        </pre>
      )}

      {status && (
        <ul className="space-y-3">
          {status.clips.map((c, i) => (
            <li key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium text-zinc-100">{c.label}</span>
                <span className="text-xs text-zinc-400">{fmt(c.durationSec)} long</span>
                <span className="ml-auto font-mono text-xs tabular-nums text-zinc-300">
                  {c.state === "queued" && "Waiting"}
                  {c.state === "running" && `${Math.round(c.progress * 100)}% · ${clock(c.elapsedMs)}`}
                  {c.state === "done" && `Done in ${clock(c.elapsedMs)}`}
                  {c.state === "error" && "Failed"}
                  {c.state === "cancelled" && "Cancelled"}
                </span>
              </div>
              {c.state === "running" && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-violet-400 transition-[width] duration-500" style={{ width: `${c.progress * 100}%` }} />
                </div>
              )}
              {c.fileId && (
                <div className="mt-3 flex flex-wrap items-start gap-4">
                  <video
                    src={fileUrl(c.fileId)}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-72 rounded-lg bg-black"
                  />
                  <a
                    href={`${fileUrl(c.fileId)}?download=1`}
                    className="inline-flex items-center rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400"
                  >
                    Download MP4
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
