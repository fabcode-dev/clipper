"use client";
import { useRef, useState } from "react";
import type { AudioSource, Branding, JobRequest, UploadedFile } from "@/lib/types";
import { fileUrl, fmt } from "../_lib/format";
import AutoSplit from "./AutoSplit";
import Dropzone from "./Dropzone";
import Frame from "./Frame";
import Scrubber from "./Scrubber";
import TimeInput from "./TimeInput";
import { Label, btn, btnPrimary, card, field } from "./ui";

interface Clip {
  key: number;
  topStart: number;
  bottomStart: number;
  duration: number;
  caption: string;
}

let keySeq = 0;

function usePlayer() {
  const ref = useRef<HTMLVideoElement>(null);
  const stopAt = useRef<number | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  return {
    ref,
    time,
    playing,
    seek(t: number) {
      if (ref.current) ref.current.currentTime = t;
      setTime(t);
    },
    toggle() {
      const v = ref.current;
      if (!v) return;
      stopAt.current = null;
      if (v.paused) void v.play();
      else v.pause();
    },
    playRange(start: number, end: number) {
      const v = ref.current;
      if (!v) return;
      v.currentTime = start;
      stopAt.current = end;
      void v.play();
    },
    props: {
      onPlay: () => setPlaying(true),
      onPause: () => setPlaying(false),
      onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const t = e.currentTarget.currentTime;
        setTime(t);
        if (stopAt.current !== null && t >= stopAt.current) {
          e.currentTarget.pause();
          stopAt.current = null;
        }
      },
    },
  };
}

export default function SplitEditor({
  branding,
  busy,
  onGenerate,
}: {
  branding: Branding;
  busy: boolean;
  onGenerate: (req: JobRequest) => void;
}) {
  const [top, setTop] = useState<UploadedFile | null>(null);
  const [bottom, setBottom] = useState<UploadedFile | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [audio, setAudio] = useState<AudioSource>("top");
  const tp = usePlayer();
  const bp = usePlayer();

  const ready = !!top && !!bottom;
  const selected = clips.find((c) => c.key === sel) ?? null;
  const maxDur = (c: Clip) =>
    Math.max(0.1, Math.min((top?.duration ?? 1e6) - c.topStart, (bottom?.duration ?? 1e6) - c.bottomStart));

  const update = (key: number, patch: Partial<Clip>) =>
    setClips((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  function addClip() {
    const c: Clip = {
      key: ++keySeq,
      topStart: tp.time,
      bottomStart: bp.time,
      duration: 15,
      caption: "",
    };
    c.duration = Math.min(15, maxDur(c));
    setClips((cs) => [...cs, c]);
    setSel(c.key);
  }

  function preview(c: Clip) {
    setSel(c.key);
    const d = Math.min(c.duration, maxDur(c));
    tp.playRange(c.topStart, c.topStart + d);
    bp.playRange(c.bottomStart, c.bottomStart + d);
  }

  function swap() {
    setTop(bottom);
    setBottom(top);
    setClips((cs) => cs.map((c) => ({ ...c, topStart: c.bottomStart, bottomStart: c.topStart })));
    setAudio((a) => (a === "top" ? "bottom" : a === "bottom" ? "top" : a));
  }

  function generate() {
    if (!top || !bottom) return;
    onGenerate({
      mode: "split",
      topId: top.id,
      bottomId: bottom.id,
      audio,
      clips: clips.map((c) => ({
        topStart: c.topStart,
        bottomStart: c.bottomStart,
        duration: Math.min(c.duration, maxDur(c)),
        caption: c.caption,
      })),
      branding,
    });
  }

  const onBoth = (a: UploadedFile | null, set: (f: UploadedFile | null) => void) => {
    set(a);
    setClips([]);
    setSel(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className={`${card} space-y-4`}>
        <div>
          <Label>Top video</Label>
          <Dropzone kind="video" label="Upload top video" file={top} onFile={(f) => onBoth(f, setTop)} />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <button type="button" className={btn} disabled={!top && !bottom} onClick={swap}>
            ⇅ Swap top and bottom
          </button>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <div>
          <Label>Bottom video</Label>
          <Dropzone kind="video" label="Upload bottom video" file={bottom} onFile={(f) => onBoth(f, setBottom)} />
        </div>

        {(top || bottom) && (
          <Frame ratio={9 / 16} branding={branding} caption={selected?.caption}>
            <div className="flex h-full w-full flex-col">
              {[
                { f: top, p: tp, muted: audio === "bottom" || audio === "none" },
                { f: bottom, p: bp, muted: audio === "top" || audio === "none" },
              ].map(({ f, p, muted }, i) => (
                <div key={i} className="relative h-1/2 w-full overflow-hidden border-white/20 first:border-b">
                  {f ? (
                    <video
                      ref={p.ref}
                      src={fileUrl(f.id)}
                      muted={muted}
                      playsInline
                      preload="metadata"
                      className="h-full w-full cursor-pointer object-cover"
                      onClick={p.toggle}
                      {...p.props}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                      {i === 0 ? "Top" : "Bottom"} video
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Frame>
        )}

        {top && (
          <div>
            <Label>Top playhead</Label>
            <Scrubber
              time={tp.time}
              duration={top.duration ?? 0}
              onSeek={tp.seek}
              playing={tp.playing}
              onToggle={tp.toggle}
              range={selected ? { start: selected.topStart, end: selected.topStart + selected.duration } : undefined}
            />
          </div>
        )}
        {bottom && (
          <div>
            <Label>Bottom playhead</Label>
            <Scrubber
              time={bp.time}
              duration={bottom.duration ?? 0}
              onSeek={bp.seek}
              playing={bp.playing}
              onToggle={bp.toggle}
              range={selected ? { start: selected.bottomStart, end: selected.bottomStart + selected.duration } : undefined}
            />
          </div>
        )}
      </div>

      <div className={`${card} space-y-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">Split clips</h2>
          <button type="button" className={btn} disabled={!ready} onClick={addClip}>
            + Add clip at playheads
          </button>
        </div>

        <div>
          <Label>Audio</Label>
          <select className={field} value={audio} onChange={(e) => setAudio(e.target.value as AudioSource)}>
            <option value="top">Top video audio</option>
            <option value="bottom">Bottom video audio</option>
            <option value="mix">Mix both</option>
            <option value="none">No audio</option>
          </select>
        </div>

        <AutoSplit
          total={Math.min(top?.duration ?? 0, bottom?.duration ?? 0)}
          disabled={!ready}
          onApply={(chunks) => {
            const next = chunks.map((c) => ({
              key: ++keySeq,
              topStart: c.start,
              bottomStart: c.start,
              duration: c.length,
              caption: "",
            }));
            setClips(next);
            setSel(next[0]?.key ?? null);
          }}
        />

        {clips.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-400">
            {ready
              ? "Position each video's playhead where you want the clip to begin, then add a clip."
              : "Upload both videos to start building split-screen clips."}
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
                  <Label>Top starts at</Label>
                  <div className="flex items-center gap-1.5">
                    <TimeInput value={c.topStart} max={top?.duration} onChange={(v) => update(c.key, { topStart: v })} />
                    <button type="button" className={btn} onClick={() => update(c.key, { topStart: tp.time })}>
                      Playhead
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Bottom starts at</Label>
                  <div className="flex items-center gap-1.5">
                    <TimeInput value={c.bottomStart} max={bottom?.duration} onChange={(v) => update(c.key, { bottomStart: v })} />
                    <button type="button" className={btn} onClick={() => update(c.key, { bottomStart: bp.time })}>
                      Playhead
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Length</Label>
                  <TimeInput value={c.duration} max={maxDur(c)} onChange={(v) => update(c.key, { duration: Math.max(0.5, v) })} />
                </div>
              </div>
              {c.duration > maxDur(c) + 0.05 && (
                <div className="text-xs text-amber-400">
                  Only {fmt(maxDur(c))} of footage is left, so this clip will be shortened.
                </div>
              )}
              <input
                className={field}
                placeholder="Caption (optional)"
                value={c.caption}
                onChange={(e) => update(c.key, { caption: e.target.value })}
              />
            </div>
          ))}
        </div>

        <button type="button" className={`${btnPrimary} w-full`} disabled={busy || !ready || clips.length === 0} onClick={generate}>
          {busy ? "Working…" : `Create ${clips.length || ""} split clip${clips.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
