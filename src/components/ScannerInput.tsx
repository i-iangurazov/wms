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
    <form onSubmit={submit} className="rounded-lg border border-border bg-surface p-4">
      <label className="mb-2 block text-sm font-semibold text-ink">{label}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          className={`${inputClass} h-12 text-base`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button className={`${buttonClass} h-12 sm:min-w-32`} type="submit">
          {commonText.scan}
        </button>
      </div>
    </form>
  );
}
