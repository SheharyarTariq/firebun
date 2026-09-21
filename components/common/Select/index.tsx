"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

/** Native <select>: Android shows its own picker, which is the best UX on a phone. */
export default function Select({
  label,
  error,
  hint,
  options,
  placeholder,
  className,
  containerClassName,
  id,
  value,
  defaultValue,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const messageId = `${selectId}-message`;
  const isControlled = value !== undefined;

  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          value={value}
          defaultValue={!isControlled ? (defaultValue ?? (placeholder ? "" : undefined)) : undefined}
          className={cn(
            "h-12 w-full appearance-none rounded-field border border-border bg-surface pl-4 pr-11 text-base text-foreground",
            "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
            "disabled:bg-surface-2 disabled:text-muted",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
      </div>
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
