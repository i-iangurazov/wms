"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

export function DialogContent({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30" />
      <RadixDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-panel p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <RadixDialog.Title className="text-lg font-semibold text-ink">{title}</RadixDialog.Title>
            {description ? (
              <RadixDialog.Description className="mt-1 text-sm leading-6 text-muted">{description}</RadixDialog.Description>
            ) : null}
          </div>
          <RadixDialog.Close
            aria-label="Закрыть окно"
            className="focus-ring rounded-md p-1 text-muted hover:bg-surface hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </RadixDialog.Close>
        </div>
        <div className="mt-5">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
