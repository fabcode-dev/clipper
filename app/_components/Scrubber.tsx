"use client";
import { fmt } from "../_lib/format";

/** Seek bar with the selected clip range highlighted. */
export default function Scrubber({
  time,
  duration,
  onSeek,
  range,
  playing,
  onToggle,
}: {
  time: number;
  duration: number;
  onSeek: (t: number) => void;
  range?: { start: number; end: number };
  playing: boolean;
  onToggle: () => void;
}) {
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / duration) * 100))}%`;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm text-zinc-100 hover:bg-white/20"
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="relative h-6 flex-1">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10" />
        {range && (
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-violet-500/70"
            style={{ left: pct(range.start), width: `calc(${pct(range.end)} - ${pct(range.start)})` }}
          />
        )}
        <input
          type="range"
          min={0}
          max={duration}
          step={0.05}
          value={Math.min(time, duration)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
      </div>
      <div className="w-24 text-right font-mono text-xs tabular-nums text-zinc-300">
        {fmt(time)} / {fmt(duration)}
      </div>
    </div>
  );
}
