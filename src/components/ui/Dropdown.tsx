"use client";

import * as RadixDropdown from "@radix-ui/react-dropdown-menu";

export const Dropdown = RadixDropdown.Root;
export const DropdownTrigger = RadixDropdown.Trigger;

export function DropdownContent({ children }: { children: React.ReactNode }) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        align="end"
        sideOffset={6}
        className="z-50 min-w-44 rounded-lg border border-border bg-white p-1 shadow-lg"
      >
        {children}
      </RadixDropdown.Content>
    </RadixDropdown.Portal>
  );
}

export function DropdownItem({
  children,
  onSelect,
  danger = false,
  disabled = false
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <RadixDropdown.Item
      disabled={disabled}
      onSelect={disabled ? undefined : onSelect}
      className={`cursor-default rounded-md px-3 py-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-surface ${
        danger ? "text-danger" : "text-ink"
      }`}
    >
      {children}
    </RadixDropdown.Item>
  );
}
