export type Corner = "tl" | "tr" | "bl" | "br";
export type CaptionPosition = "top" | "center" | "bottom";
export type OutputFormat = "original" | "9:16" | "1:1" | "16:9";
export type AudioSource = "top" | "bottom" | "mix" | "none";

export interface UploadedFile {
  id: string;
  name: string;
  kind: "video" | "image";
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  hasAudio?: boolean;
}

export interface Branding {
  logoId?: string;
  logoCorner: Corner;
  /** Logo width as % of output width (3-60) */
  logoSize: number;
  /** Caption font size as % of output height (2-12) */
  captionSize: number;
  captionPosition: CaptionPosition;
  /** #rrggbb */
  captionColor: string;
}

export const DEFAULT_BRANDING: Branding = {
  logoCorner: "tr",
  logoSize: 18,
  captionSize: 5,
  captionPosition: "bottom",
  captionColor: "#ffffff",
};

export interface SingleClip {
  start: number;
  end: number;
  caption: string;
}

export interface SplitClip {
  topStart: number;
  bottomStart: number;
  duration: number;
  caption: string;
}

export type JobRequest =
  | {
      mode: "single";
      videoId: string;
      format: OutputFormat;
      clips: SingleClip[];
      branding: Branding;
    }
  | {
      mode: "split";
      topId: string;
      bottomId: string;
      audio: AudioSource;
      clips: SplitClip[];
      branding: Branding;
    };

export interface ClipStatus {
  label: string;
  state: "queued" | "running" | "done" | "error" | "cancelled";
  /** 0..1 */
  progress: number;
  durationSec: number;
  /** ms spent rendering this clip */
  elapsedMs: number;
  fileId?: string;
}

export interface JobStatus {
  id: string;
  state: "running" | "done" | "error" | "cancelled";
  /** 0..1 across all clips */
  progress: number;
  /** ms since the job started (frozen once finished) */
  elapsedMs: number;
  error?: string;
  clips: ClipStatus[];
}
