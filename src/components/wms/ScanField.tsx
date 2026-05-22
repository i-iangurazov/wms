"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { buttonClass, inputClass } from "@/components/FormControls";
import { commonText } from "@/lib/wmsText";

export function ScanField({
  label,
  placeholder,
  autoFocus = false,
  onScan
}: {
  label: string;
  placeholder: string;
  autoFocus?: boolean;
  onScan: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scan = value.trim();
    if (!scan) {
      inputRef.current?.focus();
      return;
    }
    onScan(scan);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-surface p-4">
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div id={hintId} className="sr-only">
        Отсканируйте код или введите его вручную, затем нажмите Enter.
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          ref={inputRef}
          className={`${inputClass} h-12 text-base`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-describedby={hintId}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          enterKeyHint="done"
          inputMode="text"
          spellCheck={false}
          type="text"
        />
        <button className={`${buttonClass} h-12 sm:min-w-32`} type="submit">
          {commonText.scan}
        </button>
      </div>
    </form>
  );
}
