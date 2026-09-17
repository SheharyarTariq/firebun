"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/utils/cn";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** −/+ quantity control with thumb-sized targets, used in the cart and recipe editor. */
export default function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  size = "md",
  disabled = false,
  className,
  "aria-label": ariaLabel = "Quantity",
}: NumberStepperProps) {
  const canDecrement = !disabled && value - step >= min;
  const canIncrement = !disabled && value + step <= max;
  const buttonSize = size === "sm" ? "h-9 w-9" : "h-11 w-11";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-field border border-border bg-surface",
        className
      )}
    >
      <button
        type="button"
        aria-label="Decrease"
        disabled={!canDecrement}
        onClick={() => onChange(Math.max(min, value - step))}
        className={cn(
          "flex items-center justify-center rounded-l-field text-foreground transition-colors active:bg-surface-2 disabled:opacity-30",
          buttonSize
        )}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span
        className={cn(
          "min-w-10 text-center font-semibold tabular-nums",
          size === "sm" ? "text-sm" : "text-base"
        )}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        disabled={!canIncrement}
        onClick={() => onChange(Math.min(max, value + step))}
        className={cn(
          "flex items-center justify-center rounded-r-field text-foreground transition-colors active:bg-surface-2 disabled:opacity-30",
          buttonSize
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
