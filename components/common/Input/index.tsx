"use client";

import { useId } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  /**
   * A button beside the field ("Add", "Save"). It sits in the field's own row, so an error or
   * hint underneath never pushes the field out of line with it.
   */
  action?: React.ReactNode;
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
  action,
  className,
  containerClassName,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;

  const field = (
    <div className={cn("relative", action && "min-w-0 flex-1")}>
      {startIcon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          {startIcon}
        </span>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          "h-12 w-full rounded-field border border-border bg-surface px-4 text-base text-foreground",
          "placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
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
  );

  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      {action ? (
        <div className="flex gap-2">
          {field}
          {action}
        </div>
      ) : (
        field
      )}
      {error ? (
        <p id={messageId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
