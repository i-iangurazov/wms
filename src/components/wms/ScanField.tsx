"use client";

import { KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { buttonClass, inputClass, secondaryButtonClass } from "@/components/FormControls";
import { commonText } from "@/lib/wmsText";

const CameraBarcodeScanner = dynamic(
  () => import("@/components/wms/CameraBarcodeScanner").then((mod) => mod.CameraBarcodeScanner),
  {
    ssr: false,
    loading: () => (
      <button className={`${secondaryButtonClass} h-12 sm:min-w-32`} type="button" disabled>
        Камера
      </button>
    )
  }
);

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
    const canFocusWithoutKeyboard =
      typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches;
    if (autoFocus && canFocusWithoutKeyboard) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [autoFocus]);

  function submit() {
    const scan = value.trim();
    if (!scan) {
      inputRef.current?.focus();
      return;
    }
    onScan(scan);
    setValue("");
    inputRef.current?.focus();
  }

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  }

  const submitCameraScan = useCallback(
    (scan: string) => {
      onScan(scan);
      setValue("");
      inputRef.current?.focus();
    },
    [onScan]
  );

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
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
          onKeyDown={submitOnEnter}
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
        <button className={`${buttonClass} h-12 sm:min-w-32`} type="button" onClick={submit}>
          {commonText.scan}
        </button>
        <CameraBarcodeScanner onScan={submitCameraScan} />
      </div>
    </div>
  );
}
