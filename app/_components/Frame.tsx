"use client";
import type { Branding } from "@/lib/types";
import { fileUrl } from "../_lib/format";

/**
 * A fixed-aspect "canvas" showing the output framing with the logo and caption
 * overlaid. Sizes use container units so the preview matches the rendered result.
 */
export default function Frame({
  ratio,
  branding,
  caption,
  children,
}: {
  ratio: number;
  branding: Branding;
  caption?: string;
  children: React.ReactNode;
}) {
  const b = branding;
  const cap: React.CSSProperties = {
    fontSize: `${b.captionSize}cqh`,
    color: b.captionColor,
    maxWidth: "90cqw",
    padding: "0.3em 0.5em",
    left: "50%",
    transform: b.captionPosition === "center" ? "translate(-50%,-50%)" : "translateX(-50%)",
    ...(b.captionPosition === "top" && { top: "8cqh" }),
    ...(b.captionPosition === "center" && { top: "50%" }),
    ...(b.captionPosition === "bottom" && { bottom: "8cqh" }),
  };
  return (
    <div
      className="relative mx-auto overflow-hidden rounded-xl bg-black ring-1 ring-white/10"
      style={{ aspectRatio: ratio, width: `min(100%, calc(60vh * ${ratio}))`, containerType: "size" }}
    >
      {children}
      {b.logoId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fileUrl(b.logoId)}
          alt="logo"
          className="pointer-events-none absolute"
          style={{
            width: `${b.logoSize}cqw`,
            ...(b.logoCorner[0] === "t" ? { top: "4cqw" } : { bottom: "4cqw" }),
            ...(b.logoCorner[1] === "l" ? { left: "4cqw" } : { right: "4cqw" }),
          }}
        />
      )}
      {caption?.trim() && (
        <div
          className="pointer-events-none absolute whitespace-pre-wrap rounded bg-black/35 text-center font-bold leading-tight [text-shadow:0_0_0.08em_#000,0_0_0.08em_#000]"
          style={cap}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
