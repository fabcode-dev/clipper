"use client";
import type { Branding, CaptionPosition, Corner, UploadedFile } from "@/lib/types";
import Dropzone from "./Dropzone";
import { Label, Segmented, card } from "./ui";

const corners: { v: Corner; label: string }[] = [
  { v: "tl", label: "↖" },
  { v: "tr", label: "↗" },
  { v: "bl", label: "↙" },
  { v: "br", label: "↘" },
];

export default function BrandingPanel({
  branding,
  onChange,
  logo,
  onLogo,
}: {
  branding: Branding;
  onChange: (b: Branding) => void;
  logo: UploadedFile | null;
  onLogo: (f: UploadedFile | null) => void;
}) {
  const set = <K extends keyof Branding>(k: K, v: Branding[K]) => onChange({ ...branding, [k]: v });

  return (
    <div className={`${card} space-y-5`}>
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">Logo (optional)</h3>
        <p className="text-xs text-zinc-400">PNG with a transparent background works best.</p>
      </div>
      <Dropzone
        kind="image"
        label="Upload logo"
        hint="PNG, JPG or WebP"
        file={logo}
        onFile={(f) => {
          onLogo(f);
          set("logoId", f?.id);
        }}
      />
      {logo && (
        <div className="grid grid-cols-[auto_1fr] items-end gap-x-5 gap-y-3">
          <div>
            <Label>Corner</Label>
            <div className="grid grid-cols-2 gap-1">
              {corners.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  onClick={() => set("logoCorner", c.v)}
                  className={`h-8 w-10 rounded-md border text-base ${
                    branding.logoCorner === c.v
                      ? "border-violet-400 bg-violet-500/30 text-white"
                      : "border-white/10 bg-black/30 text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Size · {branding.logoSize}%</Label>
            <input
              type="range"
              min={5}
              max={50}
              value={branding.logoSize}
              onChange={(e) => set("logoSize", Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
        </div>
      )}

      <hr className="border-white/10" />
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">Caption style</h3>
        <p className="text-xs text-zinc-400">Type the caption text on each clip. Leave it empty for none.</p>
      </div>
      <div className="space-y-3">
        <div>
          <Label>Position</Label>
          <Segmented<CaptionPosition>
            value={branding.captionPosition}
            onChange={(v) => set("captionPosition", v)}
            options={[
              { value: "top", label: "Top" },
              { value: "center", label: "Middle" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <div>
            <Label>Size · {branding.captionSize}%</Label>
            <input
              type="range"
              min={2}
              max={10}
              step={0.5}
              value={branding.captionSize}
              onChange={(e) => set("captionSize", Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
          <div>
            <Label>Color</Label>
            <input
              type="color"
              value={branding.captionColor}
              onChange={(e) => set("captionColor", e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
