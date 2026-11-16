"use client";
import { useState } from "react";
import { btn, Label } from "./ui";

export const MAX_CLIPS = 50;
const PRESETS = [15, 30, 60, 120];

/** Start offsets + lengths covering `total` seconds in chunks of `len` (a tail under 3s is dropped). */
export function planChunks(total: number, len: number): { start: number; length: number }[] {
  const out: { start: number; length: number }[] = [];
  for (let s = 0; s < total && out.length < MAX_CLIPS; s += len) {
    const length = Math.min(len, total - s);
    if (length >= 3 || (out.length === 0 && length > 0.1)) out.push({ start: s, length });
  }
  return out;
}

export default function AutoSplit({
  total,
  disabled,
  onApply,
}: {
  /** length of footage available (for split mode: the shorter video) */
  total: number;
  disabled?: boolean;
  onApply: (chunks: { start: number; length: number }[]) => void;
}) {
  const [len, setLen] = useState(30);
  const count = disabled || len < 1 ? 0 : planChunks(total, len).length;

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <Label>Auto-create clips</Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => setLen(p)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-40 ${
              len === p ? "border-violet-400 bg-violet-500/30 text-white" : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
            }`}
          >
            {p >= 60 ? `${p / 60} min` : `${p}s`}
          </button>
        ))}
        <label className="ml-1 flex items-center gap-1.5 text-sm text-zinc-300">
          Custom
          <input
            type="number"
            min={1}
            max={3600}
            disabled={disabled}
            value={len || ""}
            onChange={(e) => setLen(Math.max(0, Math.min(3600, Math.floor(Number(e.target.value)))))}
            className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-center text-sm text-zinc-100 outline-none focus:border-violet-400"
          />
          s
        </label>
        <button
          type="button"
          className={`${btn} ml-auto`}
          disabled={disabled || count === 0}
          onClick={() => onApply(planChunks(total, len))}
        >
          Generate {count > 0 ? `${count} clip${count === 1 ? "" : "s"}` : "clips"}
        </button>
      </div>
      <p className="text-xs text-zinc-400">
        Splits the whole video into back-to-back clips of this length and replaces the current list. You can still edit
        each one afterwards.{count >= MAX_CLIPS && ` Limited to ${MAX_CLIPS} clips.`}
      </p>
    </div>
  );
}
