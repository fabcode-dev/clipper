"use client";
import { useRef, useState } from "react";
import type { Branding, JobRequest, OutputFormat, UploadedFile } from "@/lib/types";
import { fileUrl, fmt } from "../_lib/format";
import AutoSplit from "./AutoSplit";
import Dropzone from "./Dropzone";
import Frame from "./Frame";
import Scrubber from "./Scrubber";
import TimeInput from "./TimeInput";
import { Label, Segmented, btn, btnPrimary, card, field } from "./ui";

interface Clip {
  key: number;
  start: number;
  end: number;
  caption: string;
}

const RATIOS: Record<Exclude<OutputFormat, "original">, number> = {
  "9:16": 9 / 16,
  "1:1": 1,
  "16:9": 16 / 9,
};

let keySeq = 0;

export default function SingleEditor({
  branding,
  busy,
  onGenerate,
}: {
  branding: Branding;
  busy: boolean;
  onGenerate: (req: JobRequest) => void;
}) {
  const [video, setVideo] = useState<UploadedFile | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [format, setFormat] = useState<OutputFormat>("9:16");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const stopAt = useRef<number | null>(null);

  const duration = video?.duration ?? 0;
  const selected = clips.find((c) => c.key === sel) ?? null;
  const ratio = format === "original" ? (video?.width ?? 16) / (video?.height ?? 9) : RATIOS[format];

  function newClip(at: number): Clip {
    return { key: ++keySeq, start: at, end: Math.min(duration || at + 30, at + 30), caption: "" };
  }

  function onVideo(f: UploadedFile | null) {
    setVideo(f);
    setTime(0);
    if (f) {
      const c = { key: ++keySeq, start: 0, end: Math.min(f.duration ?? 30, 30), caption: "" };
      setClips([c]);
      setSel(c.key);
    } else {
      setClips([]);
      setSel(null);
    }
  }

  const update = (key: number, patch: Partial<Clip>) =>
    setClips((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  function seek(t: number) {
    if (ref.current) ref.current.currentTime = t;
    setTime(t);
  }

  function togglePlay() {
    const v = ref.current;
    if (!v) return;
    stopAt.current = null;
    if (v.paused) void v.play();
    else v.pause();
  }

  function preview(c: Clip) {
    const v = ref.current;
    if (!v) return;
    setSel(c.key);
    v.currentTime = c.start;
    stopAt.current = c.end;
    void v.play();
  }

  const invalid = clips.some((c) => c.end - c.start < 0.1);

  function generate() {
    if (!video) return;
    onGenerate({
      mode: "single",
      videoId: video.id,
      format,
      clips: clips.map((c) => ({ start: c.start, end: c.end, caption: c.caption })),
      branding,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className={`${card} space-y-4`}>
        {!video ? (
          <Dropzone kind="video" label="Upload your video" hint="Drop a video here or click to browse" file={null} onFile={onVideo} />
        ) : (
          <>
            <Dropzone kind="video" label="" file={video} onFile={onVideo} />
            <Frame ratio={ratio} branding={branding} caption={selected?.caption}>
              <video
                ref={ref}
                src={fileUrl(video.id)}
                playsInline
                preload="metadata"
                className="h-full w-full cursor-pointer object-cover"
                onClick={togglePlay}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => {
                  const t = e.currentTarget.currentTime;
                  setTime(t);
                  if (stopAt.current !== null && t >= stopAt.current) {
                    e.currentTarget.pause();
                    stopAt.current = null;
                  }
                }}
              />
            </Frame>
            <Scrubber
              time={time}
              duration={duration}
              onSeek={seek}
              playing={playing}
              onToggle={togglePlay}
              range={selected ? { start: selected.start, end: selected.end } : undefined}
            />
            <div>
              <Label>Output format</Label>
              <Segmented<OutputFormat>
                value={format}
                onChange={setFormat}
                options={[
                  { value: "9:16", label: "9:16 Vertical" },
                  { value: "1:1", label: "1:1 Square" },
                  { value: "16:9", label: "16:9" },
                  { value: "original", label: "Original" },
                ]}
              />
              <p className="mt-1.5 text-xs text-zinc-400">
                Non-matching videos are cropped to fill the frame, as shown in the preview.
              </p>
            </div>
          </>
        )}
      </div>

      <div className={`${card} space-y-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">Clips</h2>
          <button
            type="button"
            className={btn}
            disabled={!video}
            onClick={() => {
              const c = newClip(time);
              setClips((cs) => [...cs, c]);
              setSel(c.key);
            }}
          >
            + Add clip at playhead
          </button>
        </div>

        <AutoSplit
          total={duration}
          disabled={!video}
          onApply={(chunks) => {
            const next = chunks.map((c) => ({ key: ++keySeq, start: c.start, end: c.start + c.length, caption: "" }));
            setClips(next);
            setSel(next[0]?.key ?? null);
          }}
        />

        {clips.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-400">
            Upload a video, then add clips. Move the playhead and use “Set start / Set end” to pick each range.
          </p>
        )}

        <div className="space-y-3">
          {clips.map((c, i) => (
            <div
              key={c.key}
              onClick={() => setSel(c.key)}
              className={`space-y-3 rounded-xl border p-3 transition ${
                c.key === sel ? "border-violet-400/70 bg-violet-500/5" : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-sm font-semibold text-zinc-100">Clip {i + 1}</span>
                <span className="text-xs text-zinc-400">{fmt(Math.max(0, c.end - c.start))} long</span>
                <div className="ml-auto flex gap-1.5">
                  <button type="button" className={btn} onClick={() => preview(c)}>
                    ▶ Preview
                  </button>
                  <button
                    type="button"
                    className={btn}
                    aria-label={`Delete clip ${i + 1}`}
                    onClick={() => setClips((cs) => cs.filter((x) => x.key !== c.key))}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <Label>Start</Label>
                  <div className="flex items-center gap-1.5">
                    <TimeInput value={c.start} max={duration} onChange={(v) => update(c.key, { start: v })} />
                    <button type="button" className={btn} onClick={() => update(c.key, { start: time })}>
                      Set to playhead
                    </button>
                  </div>
                </div>
                <div>
                  <Label>End</Label>
                  <div className="flex items-center gap-1.5">
                    <TimeInput value={c.end} max={duration} onChange={(v) => update(c.key, { end: v })} />
                    <button type="button" className={btn} onClick={() => update(c.key, { end: time })}>
                      Set to playhead
                    </button>
                  </div>
                </div>
              </div>
              {c.end - c.start < 0.1 && <div className="text-xs text-red-400">End must be after start.</div>}
              <input
                className={field}
                placeholder="Caption (optional)"
                value={c.caption}
                onChange={(e) => update(c.key, { caption: e.target.value })}
              />
            </div>
          ))}
        </div>

        <button type="button" className={`${btnPrimary} w-full`} disabled={busy || !video || clips.length === 0 || invalid} onClick={generate}>
          {busy ? "Working…" : `Create ${clips.length || ""} clip${clips.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
