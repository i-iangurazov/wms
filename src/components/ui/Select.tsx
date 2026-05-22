"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Выберите",
  emptyLabel,
  disabled = false,
  error,
  className = ""
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  error?: string | null;
  className?: string;
}) {
  const emptyValue = "__wms_empty__";
  const selectOptions = emptyLabel ? [{ value: emptyValue, label: emptyLabel }, ...options] : options;

  return (
    <RadixSelect.Root
      value={value || (emptyLabel ? emptyValue : undefined)}
      onValueChange={(nextValue) => onValueChange(nextValue === emptyValue ? "" : nextValue)}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        data-testid="wms-select-trigger"
        className={[
          "focus-ring flex min-h-10 w-full items-center justify-between gap-3 rounded-md border bg-white px-3 py-2 text-left text-sm text-ink shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          error ? "border-red-300" : "border-border",
          className
        ].join(" ")}
        aria-invalid={Boolean(error)}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-white shadow-lg"
        >
          <RadixSelect.Viewport className="p-1">
            {selectOptions.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex min-h-9 cursor-default select-none items-center rounded-md py-2 pl-9 pr-3 text-sm text-ink outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface data-[disabled]:text-slate-400"
              >
                <RadixSelect.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="h-4 w-4 text-accent" aria-hidden="true" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
