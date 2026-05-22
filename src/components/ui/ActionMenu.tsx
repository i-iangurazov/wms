"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "./Button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "./Dropdown";

export type ActionMenuItem = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function ActionMenu({
  items,
  label = "Действия"
}: {
  items: ActionMenuItem[];
  label?: string;
}) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button aria-label={label} className="h-9 min-h-9 w-9 px-0" type="button" variant="ghost">
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        {items.map((item) => (
          <DropdownItem
            key={item.label}
            danger={item.danger}
            disabled={item.disabled}
            onSelect={item.onSelect}
          >
            {item.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
