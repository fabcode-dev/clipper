"use client";
import { useState } from "react";
import { fmt, parseTime } from "../_lib/format";
import { field } from "./ui";

/** Editable time field. Accepts "83.5", "1:23.5" etc.; commits on blur/Enter. */
export default function TimeInput({
  value,
  onChange,
  max = Infinity,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const [text, setText] = useState<string | null>(null);

  function commit() {
    if (text !== null) {
      const t = parseTime(text);
      if (t !== null) onChange(Math.min(max, Math.max(0, t)));
    }
    setText(null);
  }

  return (
    <input
      className={`${field} !w-24 text-center font-mono tabular-nums`}
      value={text ?? fmt(value)}
      onFocus={(e) => {
        setText(fmt(value));
        e.currentTarget.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}
