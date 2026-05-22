"use client";

import { FormEvent, useRef, useState } from "react";
import { buttonClass, inputClass } from "@/components/FormControls";
import { commonText } from "@/lib/wmsText";

export function ScannerInput({
  label,
  placeholder,
  onScan
}: {
  label: string;
  placeholder: string;
  onScan: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scan = value.trim();
    if (!scan) {
      return;
    }
    onScan(scan);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-surface p-3">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className={inputClass}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button className={buttonClass} type="submit">
          {commonText.scan}
        </button>
      </div>
    </form>
  );
}
