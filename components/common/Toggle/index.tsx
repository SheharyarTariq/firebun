"use client";

import { cn } from "@/utils/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/** Labelled on/off switch, full-width row so the whole row is tappable. */
export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-field border border-border bg-surface px-4 py-3 text-left transition-colors active:bg-surface-2 disabled:opacity-50",
        className
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-success" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </span>
    </button>
  );
}
