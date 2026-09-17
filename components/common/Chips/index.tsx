"use client";

import { cn } from "@/utils/cn";

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  /** Small muted suffix, e.g. a price or "sold out". */
  hint?: string;
  disabled?: boolean;
}

interface ChipsProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Wrap onto several lines instead of scrolling sideways (pickers with many options). */
  wrap?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Single-select chips: filters, categories and small pickers (size, payment).
 * The row is 44px tall so thumbs hit it easily; chips themselves stay compact.
 */
export default function Chips<T extends string>({
  options,
  value,
  onChange,
  wrap = false,
  className,
  "aria-label": ariaLabel,
}: ChipsProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-2 py-1",
        wrap
          ? "flex-wrap"
          : "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-[background-color,transform,border-color] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
              active
                ? "border-ink bg-ink text-ink-foreground"
                : "border-border bg-surface text-foreground active:bg-surface-2",
              option.disabled && "cursor-not-allowed opacity-45 active:scale-100"
            )}
          >
            {option.label}
            {option.hint && (
              <span className={cn("text-xs font-normal", active ? "text-ink-foreground/70" : "text-muted")}>{option.hint}</span>
            )}
            {option.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  active ? "bg-white/15" : "bg-muted-bg text-muted"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
