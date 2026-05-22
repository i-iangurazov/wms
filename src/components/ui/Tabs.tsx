"use client";

import * as RadixTabs from "@radix-ui/react-tabs";

export const Tabs = RadixTabs.Root;
export const TabsContent = RadixTabs.Content;

export function TabsList({ children }: { children: React.ReactNode }) {
  return <RadixTabs.List className="flex gap-2 overflow-x-auto border-b border-border">{children}</RadixTabs.List>;
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <RadixTabs.Trigger
      value={value}
      className="focus-ring -mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-muted data-[state=active]:border-accent data-[state=active]:text-accent"
    >
      {children}
    </RadixTabs.Trigger>
  );
}
