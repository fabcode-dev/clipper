"use client";
import { useState } from "react";
import { DEFAULT_BRANDING, type Branding, type JobRequest, type UploadedFile } from "@/lib/types";
import BrandingPanel from "./BrandingPanel";
import JobProgress from "./JobProgress";
import SingleEditor from "./SingleEditor";
import SplitEditor from "./SplitEditor";
import { Segmented } from "./ui";

type Mode = "single" | "split";

export default function Clipper() {
  const [mode, setMode] = useState<Mode>("single");
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [logo, setLogo] = useState<UploadedFile | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(req: JobRequest) {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not start");
      setJobId(body.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start");
    } finally {
      setStarting(false);
    }
  }

  const busy = starting || jobId !== null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Clipper</h1>
          <p className="text-sm text-zinc-400">Cut clips from your videos, or stack two videos into one split-screen clip.</p>
        </div>
        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "single", label: "Clip a video" },
            { value: "split", label: "Split screen" },
          ]}
        />
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Both editors stay mounted so switching tabs never loses uploads or clips. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div>
          <div className={mode === "single" ? "" : "hidden"}>
            <SingleEditor branding={{ ...branding, logoId: logo?.id }} busy={busy} onGenerate={generate} />
          </div>
          <div className={mode === "split" ? "" : "hidden"}>
            <SplitEditor branding={{ ...branding, logoId: logo?.id }} busy={busy} onGenerate={generate} />
          </div>
        </div>
        <BrandingPanel branding={branding} onChange={setBranding} logo={logo} onLogo={setLogo} />
      </div>

      {jobId && <JobProgress key={jobId} jobId={jobId} onReset={() => setJobId(null)} />}
    </div>
  );
}
