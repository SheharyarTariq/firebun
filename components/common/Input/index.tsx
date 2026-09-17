"use client";

import { useId } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  /** Applied to the wrapper; `className` goes to the <input>. */
  containerClassName?: string;
}

/**
 * Text / number input. 48px tall and 16px text so Android and iOS do not zoom on focus.
 * For money and quantities pass `inputMode="decimal"` (or "numeric").
 */
export default function Input({
  label,
  error,
  hint,
  startIcon,
  endIcon,
  className,
  containerClassName,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        {startIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            {startIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-12 w-full rounded-field border border-border bg-surface px-4 text-base text-foreground",
            "placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
            "disabled:bg-surface-2 disabled:text-muted",
            startIcon && "pl-11",
            endIcon && "pr-11",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className
          )}
          {...props}
        />
        {endIcon && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
            {endIcon}
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
