"use client";

import { inputClass, secondaryButtonClass } from "@/components/FormControls";

export function QuantityStepper({
  label,
  value,
  min = 1,
  max,
  disabled = false,
  onChange
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  function setQuantity(nextValue: number) {
    if (!Number.isFinite(nextValue)) {
      onChange(min);
      return;
    }
    const limitedByMin = Math.max(min, nextValue);
    const limitedByMax = max === undefined ? limitedByMin : Math.min(max, limitedByMin);
    onChange(limitedByMax);
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      <div className="grid grid-cols-[44px_1fr_44px] gap-2">
        <button
          className={secondaryButtonClass}
          disabled={disabled}
          type="button"
          onClick={() => setQuantity(value - 1)}
          aria-label="Уменьшить количество"
        >
          −
        </button>
        <input
          className={`${inputClass} text-center text-base font-semibold`}
          min={min}
          max={max}
          inputMode="numeric"
          pattern="[0-9]*"
          type="number"
          value={value}
          disabled={disabled}
          onChange={(event) => setQuantity(Number(event.target.value))}
        />
        <button
          className={secondaryButtonClass}
          disabled={disabled}
          type="button"
          onClick={() => setQuantity(value + 1)}
          aria-label="Увеличить количество"
        >
          +
        </button>
      </div>
    </div>
  );
}
