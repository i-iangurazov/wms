"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";

export function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <RadixTooltip.Provider delayDuration={250}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            className="z-50 max-w-xs rounded-md border border-border bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
            sideOffset={6}
          >
            {content}
            <RadixTooltip.Arrow className="fill-ink" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
