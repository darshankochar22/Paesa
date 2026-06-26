import * as React from "react";
import { cn } from "@/lib/utils";

// Local tab strip — sharp, zinc. Controlled. Active tab = black underline + bold.

export interface TabItem {
  value: string;
  label: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex items-stretch border-b border-zinc-200 select-none",
        className
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold -mb-px border-b-2 transition-colors",
              active
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
